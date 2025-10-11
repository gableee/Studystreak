<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\SupabaseConfig;
use App\Http\Request;
use App\Http\JsonResponder;
use App\Auth\SupabaseAuth;
use App\Controllers\TodoController;
use App\Controllers\AuthController;
use App\Middleware\AuthMiddleware;

// Load env
$dotenvClass = '\\Dotenv\\Dotenv';
$dotenv = $dotenvClass::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$config = new SupabaseConfig();
$supabaseAuth = new SupabaseAuth($config->getUrl(), $config->getAnonKey(), $config->getServiceRoleKey());
$authMiddleware = new AuthMiddleware($supabaseAuth);
$todoController = new TodoController($config);
$authController = new AuthController($supabaseAuth);

// Basic CORS (dev) - adjust origin in production
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
$allowedOrigins = $config->getAllowedOrigins();
header('Vary: Origin');

if ($origin !== null && $config->isOriginAllowed($origin)) {
  header('Access-Control-Allow-Origin: ' . $origin);
} elseif ($allowedOrigins === []) {
  // No allowlist configured, assume local development
  header('Access-Control-Allow-Origin: http://localhost:5173');
} else {
  header('Content-Type: application/json');
  http_response_code(403);
  echo json_encode(['error' => 'Origin not allowed']);
  exit;
}

header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// Simple routing
// We'll use the Request helper to parse path/method/headers/body
$request = new Request();
$path = $request->getPath();
$method = $request->getMethod();

// deprecated helper replaced by Request::getBearerToken()

// Health route: GET / or /health
if ($path === '/' || $path === '/health') {
  header('Content-Type: application/json');
  echo json_encode(['status' => 'ok', 'routes' => ['/api/todos']]);
  exit;
}

// Auth routes
if ($path === '/api/auth/signin' && $method === 'POST') {
  $authController->signIn($request);
  exit;
}

if ($path === '/api/auth/signup' && $method === 'POST') {
  $authController->signUp($request);
  exit;
}

if ($path === '/api/auth/refresh' && $method === 'POST') {
  $authController->refresh($request);
  exit;
}

if ($path === '/api/auth/me' && $method === 'GET') {
  $authMiddleware->handle($request, function(Request $authedRequest) use ($authController): void {
    $authController->me($authedRequest);
  });
  exit;
}

// Route: GET /api/todos and POST /api/todos (auth required)
if ($path === '/api/todos') {
  $authMiddleware->handle($request, function(Request $authedRequest) use ($todoController, $method): void {
    if ($method === 'GET') {
      $todoController->index($authedRequest);
      return;
    }

    if ($method === 'POST') {
      $todoController->create($authedRequest);
      return;
    }

    JsonResponder::withStatus(405, ['error' => 'Method not allowed']);
  });
  exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
