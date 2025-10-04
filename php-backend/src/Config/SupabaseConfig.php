<?php

namespace App\Config;

/**
 * Central configuration wrapper for Supabase environment values.
 *
 * Reads the Supabase URL, anon key, optional service role key, and allowed
 * CORS origins from the process environment (loaded via Dotenv in index.php).
 *
 * Usage:
 *   $config = new SupabaseConfig();
 *   $client = new SupabaseAuth($config->getUrl(), $config->getAnonKey());
 */
final class SupabaseConfig
{
	private string $url;
	private string $anonKey;
	private ?string $serviceRoleKey;
	private array $allowedOrigins;

	/**
	 * @param array<string, mixed>|null $env Optional env array for testing.
	 * @throws \RuntimeException when required config is missing.
	 */
	public function __construct(?array $env = null) {
		$env = $env ?? $_ENV;

		$this->url = rtrim((string)($env['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?? ''), '/');
		$this->anonKey = (string)($env['SUPABASE_ANON_KEY'] ?? getenv('SUPABASE_ANON_KEY') ?? '');
		$serviceRole = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY');
		$this->serviceRoleKey = $serviceRole !== false ? ($serviceRole !== null ? (string)$serviceRole : null) : null;

		$originsRaw = (string)($env['API_ALLOWED_ORIGINS'] ?? getenv('API_ALLOWED_ORIGINS') ?? '');
		$this->allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $originsRaw))));

		if ($this->url === '' || $this->anonKey === '') {
			throw new \RuntimeException('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
		}
	}

	public function getUrl(): string
	{
		return $this->url;
	}

	public function getAnonKey(): string
	{
		return $this->anonKey;
	}

	public function getServiceRoleKey(): ?string
	{
		return $this->serviceRoleKey;
	}

	/**
	 * @return string[]
	 */
	public function getAllowedOrigins(): array
	{
		return $this->allowedOrigins;
	}

	public function isOriginAllowed(?string $origin): bool
	{
		if ($origin === null || $origin === '') {
			return false;
		}
		if ($this->allowedOrigins === []) {
			return false;
		}
		return in_array($origin, $this->allowedOrigins, true);
	}
}