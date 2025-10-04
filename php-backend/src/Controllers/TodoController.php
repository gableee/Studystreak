<?php
namespace App\Controllers;

use App\Auth\AuthenticatedUser;
use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
use GuzzleHttp\Client;

class TodoController {
  private string $supabaseUrl;
  private string $anonKey;
  private Client $client;

  public function __construct(SupabaseConfig $config) {
    $this->supabaseUrl = $config->getUrl();
    $this->anonKey = $config->getAnonKey();
    $this->client = new Client(['base_uri' => $this->supabaseUrl]);
  }

  public function index(Request $request): void {
    /** @var AuthenticatedUser|null $user */
    $user = $request->getAttribute('user');
    $token = (string)$request->getAttribute('access_token');
    if ($user === null || $token === '') {
      JsonResponder::unauthorized();
      return;
    }

    $query = [
      'user_id' => 'eq.' . $user->getId(),
    ];

    [$status, $payload] = $this->forward('GET', '/rest/v1/todos', [
      'headers' => [
        'Authorization' => 'Bearer ' . $token,
        'apikey' => $this->anonKey,
        'Accept' => 'application/json',
      ],
      'query' => $query,
    ]);

    if ($status !== 200) {
      JsonResponder::withStatus($status, [
        'error' => 'Unable to fetch todos',
        'details' => $payload,
      ]);
      return;
    }

    JsonResponder::ok($payload ?? []);
  }

  public function create(Request $request): void {
    /** @var AuthenticatedUser|null $user */
    $user = $request->getAttribute('user');
    $token = (string)$request->getAttribute('access_token');
    if ($user === null || $token === '') {
      JsonResponder::unauthorized();
      return;
    }

    $body = $request->getBody() ?? [];
    $payload = $body;
    $payload['user_id'] = $user->getId();

    [$status, $responseBody] = $this->forward('POST', '/rest/v1/todos', [
      'headers' => [
        'Authorization' => 'Bearer ' . $token,
        'apikey' => $this->anonKey,
        'Content-Type' => 'application/json',
        'Prefer' => 'return=representation',
      ],
      'json' => $payload,
    ]);

    if ($status >= 400) {
      JsonResponder::withStatus($status, [
        'error' => 'Unable to create todo',
        'details' => $responseBody,
      ]);
      return;
    }

    JsonResponder::withStatus($status, $responseBody ?? []);
  }

  /**
   * @return array{int, array<string,mixed>|null}
   */
  private function forward(string $method, string $path, array $options): array {
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
}
