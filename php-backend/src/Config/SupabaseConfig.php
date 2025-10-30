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
	private string $storageBucket;
	private string $storagePublicBaseUrl;
	private string $storagePublicBucket;
	private string $storagePublicBucketBaseUrl;
	private ?string $aiServiceUrl;
	private ?string $aiServiceApiKey;

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

		$bucket = (string)($env['SUPABASE_STORAGE_BUCKET'] ?? getenv('SUPABASE_STORAGE_BUCKET') ?? '');
		$this->storageBucket = $bucket !== '' ? $bucket : 'learning-materials';

		$publicBucket = (string)($env['SUPABASE_STORAGE_PUBLIC_BUCKET'] ?? getenv('SUPABASE_STORAGE_PUBLIC_BUCKET') ?? '');
		$this->storagePublicBucket = $publicBucket !== '' ? $publicBucket : 'learning-materials-public';

		$publicBase = (string)($env['SUPABASE_STORAGE_PUBLIC_BASE_URL'] ?? getenv('SUPABASE_STORAGE_PUBLIC_BASE_URL') ?? '');
		if ($publicBase === '') {
			$publicBase = $this->url . '/storage/v1/object/public/' . $this->storageBucket;
		}
		$this->storagePublicBaseUrl = rtrim($publicBase, '/') . '/';

		$publicBucketBase = (string)($env['SUPABASE_STORAGE_PUBLIC_BUCKET_BASE_URL'] ?? getenv('SUPABASE_STORAGE_PUBLIC_BUCKET_BASE_URL') ?? '');
		if ($publicBucketBase === '') {
			$publicBucketBase = $this->url . '/storage/v1/object/public/' . $this->storagePublicBucket;
		}
		$this->storagePublicBucketBaseUrl = rtrim($publicBucketBase, '/') . '/';

		$aiServiceUrl = (string)($env['AI_SERVICE_URL'] ?? getenv('AI_SERVICE_URL') ?? '');
		$this->aiServiceUrl = $aiServiceUrl !== '' ? rtrim($aiServiceUrl, '/') : null;

		$aiServiceApiKey = $env['AI_SERVICE_API_KEY'] ?? getenv('AI_SERVICE_API_KEY');
		if ($aiServiceApiKey === false) {
			$aiServiceApiKey = null;
		}
		$aiServiceApiKey = $aiServiceApiKey !== null ? trim((string)$aiServiceApiKey) : null;
		$this->aiServiceApiKey = $aiServiceApiKey !== '' ? $aiServiceApiKey : null;

		if ($this->url === '' || $this->anonKey === '') {
			throw new \RuntimeException('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
		}
	}

	/**
	 * Return the Supabase project base URL.
	 * Example: https://your-project.supabase.co
	 * Used as the Guzzle base_uri for REST and Storage API calls.
	 */
	public function getUrl(): string
	{
		return $this->url;
	}

	/**
	 * Return the Supabase anon (public) API key.
	 * This key is used for client-scoped REST requests and supplied in the
	 * `apikey` header when calling PostgREST endpoints.
	 */
	public function getAnonKey(): string
	{
		return $this->anonKey;
	}

	/**
	 * Return the optional Supabase service role key.
	 * The service role key is a privileged server-side key used for operations
	 * that require elevated permissions (for example, privileged inserts or
	 * uploads when RLS would otherwise block anon access).
	 */
	public function getServiceRoleKey(): ?string
	{
		return $this->serviceRoleKey;
	}

	/**
	 * Return the storage bucket name used for file uploads.
	 * Defaults to `learning-materials` when not configured.
	 */
	public function getStorageBucket(): string
	{
		return $this->storageBucket;
	}

	/**
	 * Return the public base URL prefix for storage objects.
	 * Default: {SUPABASE_URL}/storage/v1/object/public/{bucket}/
	 * Controllers use this to compose public file URLs returned to clients.
	 */
	/**
	 * Return the public storage bucket name used for public file uploads.
	 * Defaults to `learning-materials-public` when not configured.
	 */
	public function getStoragePublicBucket(): string
	{
		return $this->storagePublicBucket;
	}

	/**
	 * Return the public base URL prefix for public storage objects.
	 * Default: {SUPABASE_URL}/storage/v1/object/public/{public_bucket}/
	 * Controllers use this to compose public file URLs for public materials.
	 */
	public function getStoragePublicBucketBaseUrl(): string
	{
		return $this->storagePublicBucketBaseUrl;
	}

	public function getAiServiceUrl(): ?string
	{
		return $this->aiServiceUrl;
	}

	public function getAiServiceApiKey(): ?string
	{
		return $this->aiServiceApiKey;
	}

	/**
	 * @return string[]
	 *
	 * Return the configured list of allowed CORS origins. Each entry is an
	 * origin string such as `http://localhost:5173` or `https://app.example.com`.
	 */
	public function getAllowedOrigins(): array
	{
		return $this->allowedOrigins;
	}

	/**
	 * Check whether the supplied origin is present in the allowlist.
	 * Returns false when no origin is provided or when the allowlist is empty.
	 */
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