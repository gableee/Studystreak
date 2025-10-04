<?php
namespace App\Auth;

use App\Auth\AuthenticatedUser;
use GuzzleHttp\Client;

class SupabaseAuth {
    private string $supabaseUrl;
    private string $anonKey;
    private ?string $serviceRoleKey;
    private Client $client;

    public function __construct(string $supabaseUrl, string $anonKey, ?string $serviceRoleKey = null)
    {
        $this->supabaseUrl = rtrim($supabaseUrl, '/');
        $this->anonKey = $anonKey;
        $this->serviceRoleKey = $serviceRoleKey;
        $this->client = new Client(['base_uri' => $this->supabaseUrl]);
    }

    public function validateToken(string $token): ?AuthenticatedUser
    {
        try {
            [$status, $payload] = $this->request('GET', '/auth/v1/user', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'application/json',
                    'apikey' => $this->anonKey,
                ],
            ]);

            if ($status !== 200 || !is_array($payload)) {
                return null;
            }

            return new AuthenticatedUser($payload);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * @return array<string,mixed>
     * @throws SupabaseAuthException
     */
    public function signInWithPassword(string $email, string $password): array
    {
        $this->assertServiceRole();
        [$status, $payload] = $this->request('POST', '/auth/v1/token?grant_type=password', [
            'headers' => $this->serviceHeaders(),
            'json' => [
                'email' => $email,
                'password' => $password,
            ],
        ]);

        if ($status >= 400 || !is_array($payload)) {
            throw new SupabaseAuthException($payload['message'] ?? 'Sign-in failed', $status, $payload ?? []);
        }

        return $payload;
    }

    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     * @throws SupabaseAuthException
     */
    public function signUp(array $data): array
    {
        $this->assertServiceRole();
        [$status, $payload] = $this->request('POST', '/auth/v1/signup', [
            'headers' => $this->serviceHeaders(),
            'json' => $data,
        ]);

        if ($status >= 400 || !is_array($payload)) {
            throw new SupabaseAuthException($payload['message'] ?? 'Sign-up failed', $status, $payload ?? []);
        }

        return $payload;
    }

    /**
     * @return array<string,mixed>
     * @throws SupabaseAuthException
     */
    public function refreshAccessToken(string $refreshToken): array
    {
        $this->assertServiceRole();
        [$status, $payload] = $this->request('POST', '/auth/v1/token?grant_type=refresh_token', [
            'headers' => $this->serviceHeaders(),
            'json' => ['refresh_token' => $refreshToken],
        ]);

        if ($status >= 400 || !is_array($payload)) {
            throw new SupabaseAuthException($payload['message'] ?? 'Token refresh failed', $status, $payload ?? []);
        }

        return $payload;
    }

    /**
     * @return array{int,array<string,mixed>|null}
     */
    private function request(string $method, string $path, array $options): array
    {
        $options['http_errors'] = false;
        $options['timeout'] = $options['timeout'] ?? 10;
        $response = $this->client->request($method, $path, $options);
        $status = $response->getStatusCode();
        $body = (string)$response->getBody();
        $decoded = json_decode($body, true);
        $payload = is_array($decoded) ? $decoded : null;
        return [$status, $payload];
    }

    /**
     * @return array<string,string>
     */
    private function serviceHeaders(): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'apikey' => $this->anonKey,
        ];

        if ($this->serviceRoleKey !== null && $this->serviceRoleKey !== '') {
            $headers['Authorization'] = 'Bearer ' . $this->serviceRoleKey;
        }

        return $headers;
    }

    private function assertServiceRole(): void
    {
        if ($this->serviceRoleKey === null || $this->serviceRoleKey === '') {
            throw new SupabaseAuthException('Supabase service role key is required for this operation');
        }
    }
}
