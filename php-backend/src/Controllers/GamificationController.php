<?php

namespace App\Controllers;

use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
use GuzzleHttp\Client;
use DateTimeImmutable;
use DateTimeZone;

final class GamificationController
{
	private string $supabaseUrl;
	private string $anonKey;
	private Client $client;

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
	];

	public function __construct(SupabaseConfig $config)
	{
		$this->supabaseUrl = $config->getUrl();
		$this->anonKey = $config->getAnonKey();
		$this->client = new Client(['base_uri' => $this->supabaseUrl]);
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
		$studyMinutes = $this->toInt($body['study_minutes'] ?? ($body['duration_minutes'] ?? 0));
		if ($studyMinutes < 0) {
			$studyMinutes = 0;
		}

		$profile = $this->loadProfile($token, $user->getId());
		if ($profile === null) {
			JsonResponder::withStatus(404, ['error' => 'Profile not found']);
			return;
		}

		$timezoneName = $this->sanitizeTimezone($timezoneRaw ?? ($profile['streak_timezone'] ?? null));
		$timezone = new DateTimeZone($timezoneName);
		$eventInstant = $this->parseTimestamp($occurredAtRaw) ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
		$eventInstant = $eventInstant->setTimezone(new DateTimeZone('UTC'));
		$eventLocal = $eventInstant->setTimezone($timezone);

		$lastActiveInstant = $this->parseTimestamp($profile['streak_last_active_at'] ?? null);
		if ($lastActiveInstant instanceof DateTimeImmutable) {
			$lastActiveInstant = $lastActiveInstant->setTimezone(new DateTimeZone('UTC'));
		}

		$shouldUpdateStreakCount = false;
		$shouldUpdateLastActive = false;
		$streakIncremented = false;
		$streakReset = false;
		$newStreakCount = max(0, $this->toInt($profile['streak_count'] ?? 0));

		if ($lastActiveInstant === null) {
			$shouldUpdateStreakCount = true;
			$shouldUpdateLastActive = true;
			$newStreakCount = max(1, $newStreakCount);
			$streakIncremented = true;
		} else {
			$lastActiveLocal = $lastActiveInstant->setTimezone($timezone);
			$dayDiff = (int)$lastActiveLocal->diff($eventLocal)->format('%r%a');

			if ($dayDiff < 0) {
				// Ignore out-of-order events that predate the stored streak day.
			} elseif ($dayDiff === 0) {
				// Same day: keep the larger timestamp so progress appears recent.
				if ($eventInstant > $lastActiveInstant) {
					$shouldUpdateLastActive = true;
				}
				if ($newStreakCount === 0) {
					$newStreakCount = 1;
					$shouldUpdateStreakCount = true;
					$streakIncremented = true;
				}
			} elseif ($dayDiff === 1) {
				$shouldUpdateStreakCount = true;
				$shouldUpdateLastActive = true;
				$newStreakCount = max(0, $newStreakCount) + 1;
				$streakIncremented = true;
			} else {
				$shouldUpdateStreakCount = true;
				$shouldUpdateLastActive = true;
				$newStreakCount = 1;
				$streakReset = true;
			}
		}

		$updatePayload = [];
		if ($shouldUpdateLastActive) {
			$updatePayload['streak_last_active_at'] = $eventInstant->format(DATE_ATOM);
		}
		if ($shouldUpdateStreakCount) {
			$updatePayload['streak_count'] = $newStreakCount;
			$currentLongest = $this->toInt($profile['streak_longest'] ?? 0);
			$updatePayload['streak_longest'] = max($currentLongest, $newStreakCount);
		}
		if ($studyMinutes > 0) {
			$updatePayload['total_study_time'] = max(0, $this->toInt($profile['total_study_time'] ?? 0)) + $studyMinutes;
		}
		if (($profile['streak_timezone'] ?? null) !== $timezoneName) {
			$updatePayload['streak_timezone'] = $timezoneName;
		}

		if ($updatePayload !== []) {
			[$status, $updatedPayload] = $this->forward('PATCH', '/rest/v1/profiles?id=eq.' . $user->getId(), [
				'headers' => [
					'Authorization' => 'Bearer ' . $token,
					'apikey' => $this->anonKey,
					'Content-Type' => 'application/json',
					'Prefer' => 'return=representation',
				],
				'json' => $updatePayload,
			]);

			if ($status >= 400 || !is_array($updatedPayload) || count($updatedPayload) === 0) {
				JsonResponder::withStatus($status, [
					'error' => 'Unable to update streak',
					'details' => $updatedPayload,
				]);
				return;
			}

			$profile = $this->normalizeProfile($updatedPayload[0]);
		}

		JsonResponder::ok([
			'profile' => $profile,
			'streak_was_incremented' => $streakIncremented,
			'streak_was_reset' => $streakReset,
			'study_minutes_applied' => $studyMinutes,
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
		return [
			'username' => $record['username'] ?? null,
			'level' => $this->toInt($record['level'] ?? 0),
			'experience_points' => $this->toInt($record['experience_points'] ?? 0),
			'streak_count' => $this->toInt($record['streak_count'] ?? 0),
			'streak_longest' => $this->toInt($record['streak_longest'] ?? 0),
			'total_study_time' => $this->toInt($record['total_study_time'] ?? 0),
			'created_at' => $this->formatTimestamp($record['created_at'] ?? null),
			'streak_last_active_at' => $this->formatTimestamp($record['streak_last_active_at'] ?? null),
			'streak_timezone' => $record['streak_timezone'] ?? null,
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

