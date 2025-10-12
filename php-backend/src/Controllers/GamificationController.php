<?php

namespace App\Controllers;

use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
use GuzzleHttp\Client;
use DateInterval;
use DateTimeImmutable;
use DateTimeZone;

final class GamificationController
{
	private string $supabaseUrl;
	private string $anonKey;
	private Client $client;
	private string $studySessionTable = 'studysession';

	/** @var string[] */
	private array $profileColumns = [
		'username',
		'streak_count',
		'total_study_time',
		'level',
		'experience_points',
		'created_at',
		'streak_longest',
		'streak_last_active_at',
		'streak_timezone',
		'streak_savers_available',
		'streak_savers_used',
		'streak_savers_max_per_month',
		'streak_savers_last_reset',
	];

	public function __construct(SupabaseConfig $config)
	{
		$this->supabaseUrl = $config->getUrl();
		$this->anonKey = $config->getAnonKey();
		$this->client = new Client(['base_uri' => $this->supabaseUrl]);
		$configuredTable = getenv('SUPABASE_STUDY_SESSION_TABLE');
		if (is_string($configuredTable) && $configuredTable !== '') {
			$this->studySessionTable = $configuredTable;
		}
	}

	public function getProfile(Request $request): void
	{
		/** @var \App\Auth\AuthenticatedUser|null $user */
		$user = $request->getAttribute('user');
		$token = (string) $request->getAttribute('access_token');

		if ($user === null || $token === '') {
			JsonResponder::unauthorized();
			return;
		}

		$profile = $this->loadProfile($token, $user->getId());
		if ($profile === null) {
			JsonResponder::withStatus(404, ['error' => 'Profile not found']);
			return;
		}

		JsonResponder::ok($profile);
	}

	public function activateStreak(Request $request): void
	{
		/** @var \App\Auth\AuthenticatedUser|null $user */
		$user = $request->getAttribute('user');
		$token = (string) $request->getAttribute('access_token');

		if ($user === null || $token === '') {
			JsonResponder::unauthorized();
			return;
		}

		$body = $request->getBody() ?? [];
		$occurredAtRaw = is_string($body['occurred_at'] ?? null) ? trim((string)$body['occurred_at']) : null;
		$timezoneRaw = is_string($body['timezone'] ?? null) ? trim((string)$body['timezone']) : null;
		$sessionTypeRaw = is_string($body['session_type'] ?? null) ? trim((string)$body['session_type']) : '';
		$studyMinutes = $this->toInt($body['study_minutes'] ?? ($body['duration_minutes'] ?? 0));
		if ($studyMinutes < 0) {
			$studyMinutes = 0;
		}

		$profileBefore = $this->loadProfile($token, $user->getId());
		if ($profileBefore === null) {
			JsonResponder::withStatus(404, ['error' => 'Profile not found']);
			return;
		}

		$timezoneName = $this->sanitizeTimezone($timezoneRaw ?? ($profileBefore['streak_timezone'] ?? null));
		if (($profileBefore['streak_timezone'] ?? null) !== $timezoneName) {
			if (!$this->updateProfileTimezone($token, $user->getId(), $timezoneName)) {
				JsonResponder::withStatus(500, ['error' => 'Unable to update timezone']);
				return;
			}
			$profileBefore['streak_timezone'] = $timezoneName;
		}

		$eventInstant = $this->parseTimestamp($occurredAtRaw) ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
		$eventInstant = $eventInstant->setTimezone(new DateTimeZone('UTC'));
		$durationSeconds = max(0, $studyMinutes * 60);
		if ($durationSeconds > 365 * 24 * 60 * 60) {
			$durationSeconds = 365 * 24 * 60 * 60;
		}
		$sessionEnd = $durationSeconds > 0
			? $eventInstant->add(new DateInterval('PT' . $durationSeconds . 'S'))
			: $eventInstant;

		$sessionType = $sessionTypeRaw !== '' ? $sessionTypeRaw : 'manual';
		$sessionPayload = [
			'user_id' => $user->getId(),
			'session_type' => $sessionType,
			'duration' => $durationSeconds,
			'time_started' => $eventInstant->format(DATE_ATOM),
			'time_end' => $sessionEnd->format(DATE_ATOM),
		];

		[$sessionStatus, $sessionResponse] = $this->forward('POST', '/rest/v1/' . $this->studySessionTable, [
			'headers' => [
				'Authorization' => 'Bearer ' . $token,
				'apikey' => $this->anonKey,
				'Content-Type' => 'application/json',
				'Prefer' => 'return=representation',
			],
			'json' => $sessionPayload,
		]);

		if ($sessionStatus >= 400) {
			JsonResponder::withStatus($sessionStatus, [
				'error' => 'Unable to record study session',
				'details' => $sessionResponse,
			]);
			return;
		}

		$profileAfter = $this->loadProfile($token, $user->getId());
		if ($profileAfter === null) {
			JsonResponder::withStatus(500, ['error' => 'Unable to refresh profile']);
			return;
		}

		$previousStreak = $this->toInt($profileBefore['streak_count'] ?? 0);
		$currentStreak = $this->toInt($profileAfter['streak_count'] ?? 0);
		$streakWasIncremented = $currentStreak > $previousStreak;
		$streakWasReset = $previousStreak > 0 && $currentStreak === 1 && !$streakWasIncremented;
		$saversBefore = $this->toInt($profileBefore['streak_savers_available'] ?? 0);
		$saversAfter = $this->toInt($profileAfter['streak_savers_available'] ?? 0);
		$streakSaverWasUsed = $saversAfter < $saversBefore;

		JsonResponder::ok([
			'profile' => $profileAfter,
			'streak_was_incremented' => $streakWasIncremented,
			'streak_was_reset' => $streakWasReset,
			'streak_saver_was_used' => $streakSaverWasUsed,
			'study_minutes_applied' => $studyMinutes,
			'session' => $sessionResponse,
		]);
	}

	public function useStreakSaver(Request $request): void
	{
		/** @var \App\Auth\AuthenticatedUser|null $user */
		$user = $request->getAttribute('user');
		$token = (string) $request->getAttribute('access_token');

		if ($user === null || $token === '') {
			JsonResponder::unauthorized();
			return;
		}

		[$status, $rpcPayload] = $this->forward('POST', '/rest/v1/rpc/use_streak_saver', [
			'headers' => [
				'Authorization' => 'Bearer ' . $token,
				'apikey' => $this->anonKey,
				'Content-Type' => 'application/json',
			],
			'json' => new \stdClass(),
		]);

		if ($status >= 400) {
			JsonResponder::withStatus($status, [
				'error' => 'Unable to use streak saver',
				'details' => $rpcPayload,
			]);
			return;
		}

		$profile = $this->loadProfile($token, $user->getId());
		if ($profile === null) {
			JsonResponder::withStatus(500, ['error' => 'Unable to refresh profile']);
			return;
		}

		JsonResponder::ok([
			'success' => ($rpcPayload['success'] ?? null) === true,
			'payload' => $rpcPayload,
			'profile' => $profile,
		]);
	}

	public function setTimezone(Request $request): void
	{
		/** @var \App\Auth\AuthenticatedUser|null $user */
		$user = $request->getAttribute('user');
		$token = (string) $request->getAttribute('access_token');

		if ($user === null || $token === '') {
			JsonResponder::unauthorized();
			return;
		}

		$body = $request->getBody() ?? [];
		$timezoneRaw = is_string($body['timezone'] ?? null) ? trim((string)$body['timezone']) : null;
		if ($timezoneRaw === null || $timezoneRaw === '') {
			JsonResponder::withStatus(400, ['error' => 'Timezone is required']);
			return;
		}

		$timezoneName = $this->sanitizeTimezone($timezoneRaw);
		$profile = $this->loadProfile($token, $user->getId());
		if ($profile === null) {
			JsonResponder::withStatus(404, ['error' => 'Profile not found']);
			return;
		}

		if (($profile['streak_timezone'] ?? null) === $timezoneName) {
			JsonResponder::ok([
				'success' => true,
				'timezone' => $timezoneName,
			]);
			return;
		}

		$now = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ATOM);
		[$status, $payload] = $this->forward('PATCH', '/rest/v1/profiles?id=eq.' . $user->getId(), [
			'headers' => [
				'Authorization' => 'Bearer ' . $token,
				'apikey' => $this->anonKey,
				'Content-Type' => 'application/json',
				'Prefer' => 'return=representation',
			],
			'json' => [
				'streak_timezone' => $timezoneName,
				'updated_at' => $now,
			],
		]);

		if ($status >= 400 || !is_array($payload) || count($payload) === 0) {
			JsonResponder::withStatus($status, [
				'error' => 'Unable to update timezone',
				'details' => $payload,
			]);
			return;
		}

		JsonResponder::ok([
			'success' => true,
			'timezone' => $timezoneName,
		]);
	}

	/**
	 * @return array{int, array<string, mixed>|null}
	 */
	private function forward(string $method, string $path, array $options): array
	{
		try {
			$options['http_errors'] = false;
			$options['timeout'] = $options['timeout'] ?? 10;
			$response = $this->client->request($method, $path, $options);
			$status = $response->getStatusCode();
			$body = (string)$response->getBody();
			$decoded = json_decode($body, true);
			$payload = is_array($decoded) ? $decoded : null;
			return [$status, $payload];
		} catch (\Throwable $e) {
			return [502, ['error' => 'Upstream error', 'message' => $e->getMessage()]];
		}
	}

	private function updateProfileTimezone(string $accessToken, string $userId, string $timezone): bool
	{
		$now = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ATOM);

		[$status, $payload] = $this->forward('PATCH', '/rest/v1/profiles?id=eq.' . $userId, [
			'headers' => [
				'Authorization' => 'Bearer ' . $accessToken,
				'apikey' => $this->anonKey,
				'Content-Type' => 'application/json',
				'Prefer' => 'return=minimal',
			],
			'json' => [
				'streak_timezone' => $timezone,
				'updated_at' => $now,
			],
		]);

		return $status >= 200 && $status < 300 && (!is_array($payload) || $payload === []);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function loadProfile(string $accessToken, string $userId): ?array
	{
		$query = [
			'id' => 'eq.' . $userId,
			'select' => implode(',', $this->profileColumns),
		];

		[$status, $payload] = $this->forward('GET', '/rest/v1/profiles', [
			'headers' => [
				'Authorization' => 'Bearer ' . $accessToken,
				'apikey' => $this->anonKey,
				'Accept' => 'application/json',
			],
			'query' => $query,
		]);

		if ($status !== 200 || !is_array($payload) || count($payload) === 0) {
			return null;
		}

		return $this->normalizeProfile($payload[0]);
	}

	/**
	 * @param array<string, mixed> $record
	 * @return array<string, mixed>
	 */
	private function normalizeProfile(array $record): array
	{
		$streakTimezone = $this->sanitizeTimezone($record['streak_timezone'] ?? null);
		$lastActiveRaw = $record['streak_last_active_at'] ?? null;
		$lastActiveFormatted = $this->formatTimestamp($lastActiveRaw);
		$lastResetFormatted = $this->formatTimestamp($record['streak_savers_last_reset'] ?? null);
		$isActive = $this->isStreakActiveForTimezone($lastActiveRaw, $streakTimezone);

		return [
			'username' => $record['username'] ?? null,
			'level' => $this->toInt($record['level'] ?? 0),
			'experience_points' => $this->toInt($record['experience_points'] ?? 0),
			'streak_count' => $this->toInt($record['streak_count'] ?? 0),
			'streak_longest' => $this->toInt($record['streak_longest'] ?? 0),
			'total_study_time' => $this->toInt($record['total_study_time'] ?? 0),
			'created_at' => $this->formatTimestamp($record['created_at'] ?? null),
			'streak_last_active_at' => $lastActiveFormatted,
			'streak_timezone' => $streakTimezone,
			'streak_savers_available' => max(0, $this->toInt($record['streak_savers_available'] ?? 0)),
			'streak_savers_used' => max(0, $this->toInt($record['streak_savers_used'] ?? 0)),
			'streak_savers_max_per_month' => max(0, $this->toInt($record['streak_savers_max_per_month'] ?? 0)),
			'streak_savers_last_reset' => $lastResetFormatted,
			'is_streak_active' => $isActive,
		];
	}

	private function formatTimestamp($value): ?string
	{
		if (!is_string($value) || $value === '') {
			return null;
		}

		$dt = $this->parseTimestamp($value);
		return $dt ? $dt->format(DATE_ATOM) : null;
	}

	private function parseTimestamp(?string $value): ?DateTimeImmutable
	{
		if ($value === null || $value === '') {
			return null;
		}

		try {
			return new DateTimeImmutable($value);
		} catch (\Exception $e) {
			// Attempt to normalise space-separated timestamp.
			$normalized = str_replace(' ', 'T', $value);
			try {
				return new DateTimeImmutable($normalized);
			} catch (\Exception $inner) {
				return null;
			}
		}
	}

	private function isStreakActiveForTimezone($value, string $timezone): bool
	{
		$timestamp = is_string($value) ? $this->parseTimestamp($value) : null;
		if ($timestamp === null) {
			return false;
		}

		try {
			$tz = new DateTimeZone($timezone);
		} catch (\Throwable $e) {
			$tz = new DateTimeZone('UTC');
		}

		$today = new DateTimeImmutable('now', $tz);
		$lastActiveLocal = $timestamp->setTimezone($tz);

		return $today->format('Y-m-d') === $lastActiveLocal->format('Y-m-d');
	}

	private function sanitizeTimezone(?string $timezone): string
	{
		$tz = $timezone ?: 'UTC';
		try {
			new DateTimeZone($tz);
			return $tz;
		} catch (\Throwable $e) {
			return 'UTC';
		}
	}

	private function toInt($value): int
	{
		if (is_int($value)) {
			return $value;
		}
		if (is_float($value)) {
			return (int)round($value);
		}
		if (is_numeric($value)) {
			return (int)$value;
		}
		return 0;
	}
}

