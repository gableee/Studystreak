<?php
declare(strict_types=1);

// Ensure PHP upload limits align with the 50MB application constraint.
ini_set('upload_max_filesize', '60M');
ini_set('post_max_size', '65M');
ini_set('max_execution_time', '120');
ini_set('max_input_time', '120');

// Quick health probe responder: respond immediately to /health (and /) so platform
// health checks succeed even if autoload or env is not yet available during deploy.
$probePath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
if ($probePath === '/docs') {
  header('Content-Type: text/html; charset=UTF-8');
  readfile(__DIR__ . '/docs/index.html');
  exit;
}

if ($probePath === '/docs/openapi.yaml') {
  header('Content-Type: application/yaml; charset=UTF-8');
  readfile(__DIR__ . '/docs/openapi.yaml');
  exit;
}

if ($probePath === '/health' || $probePath === '/') {
  header('Content-Type: application/json');
  echo json_encode(['status' => 'ok']);
  exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\SupabaseConfig;
use App\Http\Request;
use App\Http\JsonResponder;
use App\Auth\SupabaseAuth;
use App\Controllers\TodoController;
use App\Controllers\AuthController;
use App\Middleware\AuthMiddleware;
use App\Controllers\GamificationController;
use App\Controllers\LearningMaterialsController;


// Load env
$dotenvClass = '\\Dotenv\\Dotenv';
$dotenv = $dotenvClass::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$config = new SupabaseConfig();
$supabaseAuth = new SupabaseAuth($config->getUrl(), $config->getAnonKey(), $config->getServiceRoleKey());
$authMiddleware = new AuthMiddleware($supabaseAuth);
$todoController = new TodoController($config);
$authController = new AuthController($supabaseAuth);
$gamificationController = new GamificationController($config);
$learningMaterialsController = new LearningMaterialsController($config);

// Basic CORS (dev) - adjust origin in production
// Allow the health endpoint to be checked by probes that do not send an Origin header.
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
$allowedOrigins = $config->getAllowedOrigins();
header('Vary: Origin');

// Quick path: if this is the health endpoint, allow any origin so platform probes succeed.
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
if ($requestPath === '/health' || $requestPath === '/' || str_starts_with($requestPath, '/docs')) {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
  header('Access-Control-Allow-Methods: GET, POST, DELETE, PUT, PATCH, OPTIONS');
  header('Access-Control-Allow-Credentials: true');
  // Prevent intermediate caches from serving stale/multiple-choice responses
  header('Cache-Control: no-cache, no-store, must-revalidate');
  header('Pragma: no-cache');
  header('Expires: 0');
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
} else {
  $allowedOrigin = null;

  if ($origin !== null && $config->isOriginAllowed($origin)) {
    $allowedOrigin = $origin;
  } elseif ($allowedOrigins === []) {
    // No allowlist configured, allow common local origins and hosted preview domains
    $fallbackOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
      'https://localhost:8173',
    ];

    $hostedFallbacks = [
      'https://studystreak-peach.vercel.app',
      'https://studystreak-backend.onrender.com',
    ];

    $fallbacks = array_merge($fallbackOrigins, $hostedFallbacks);
    if ($origin !== null && in_array($origin, $fallbacks, true)) {
      $allowedOrigin = $origin;
    }
  }

  if ($allowedOrigin === null && $origin !== null) {
    header('Content-Type: application/json');
    http_response_code(403);
    echo json_encode(['error' => 'Origin not allowed']);
    exit;
  }

  if ($allowedOrigin !== null) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
  }

  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
  header('Access-Control-Allow-Methods: GET, POST, DELETE, PUT, PATCH, OPTIONS');
  header('Access-Control-Allow-Credentials: true');
  // Prevent intermediate caches from serving stale/multiple-choice responses
  header('Cache-Control: no-cache, no-store, must-revalidate');
  header('Pragma: no-cache');
  header('Expires: 0');
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

// Simple routing
// Request helper to parse path/method/headers/body
$request = new Request();
$path = $request->getPath();
$method = $request->getMethod();

// Debug: log incoming requests to aid troubleshooting (method, path, host, origin)
// This will appear in the PHP built-in server console or platform logs.
error_log(sprintf('[request] %s %s Host:%s Origin:%s', $method, $path, $_SERVER['HTTP_HOST'] ?? '-', $_SERVER['HTTP_ORIGIN'] ?? '-'));

// deprecated helper replaced by Request::getBearerToken()

// Health route: GET / or /health
if ($path === '/' || $path === '/health') {
  header('Content-Type: application/json');
  echo json_encode(['status' => 'ok', 'routes' => ['/api/todos']]);
  exit;
}

// Auth routes.
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

// Gamification route: GET /api/gamification/profile (auth required)
if ($path === '/api/gamification/profile' && $method === 'GET') {
  $authMiddleware->handle($request, function(Request $authedRequest) use ($gamificationController): void {
    $gamificationController->getProfile($authedRequest);
  });
  exit;
}

// Gamification route: POST /api/gamification/set-timezone (auth required)
if ($path === '/api/gamification/set-timezone' && $method === 'POST') {
  $authMiddleware->handle($request, function(Request $authedRequest) use ($gamificationController): void {
    $gamificationController->setTimezone($authedRequest);
  });
  exit;
}

// Gamification route: POST /api/gamification/streak/activate (auth required)
if ($path === '/api/gamification/streak/activate' && $method === 'POST') {
  $authMiddleware->handle($request, function(Request $authedRequest) use ($gamificationController): void {
    $gamificationController->activateStreak($authedRequest);
  });
  exit;
}

// Gamification route: POST /api/gamification/streak/use-saver (auth required)
if ($path === '/api/gamification/streak/use-saver' && $method === 'POST') {
  $authMiddleware->handle($request, function(Request $authedRequest) use ($gamificationController): void {
    $gamificationController->useStreakSaver($authedRequest);
  });
  exit;
}

// Learning materials routes (auth required). Centralize allowed methods for clarity.
$learningMaterialsRoutes = [
  '/api/learning-materials' => [
    'GET' => 'index',
    'POST' => 'upload',
  ],
  // Legacy alias retained temporarily for compatibility with older clients
  '/api/learning-materials/upload' => [
    'POST' => 'upload',
  ],
];

if (isset($learningMaterialsRoutes[$path])) {
  $handlersForPath = $learningMaterialsRoutes[$path];
  if (!isset($handlersForPath[$method])) {
    $allowedMethods = implode(', ', array_keys($handlersForPath));
    header('Allow: ' . $allowedMethods);
    JsonResponder::withStatus(405, [
      'error' => 'Method not allowed',
      'allowed_methods' => $handlersForPath,
    ]);
    exit;
  }

  $action = $handlersForPath[$method];
  $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $action): void {
    $learningMaterialsController->{$action}($authedRequest);
  });
  exit;
}

// Route: GET /api/learning-materials/:id/signed-url (auth required)
if (preg_match('#^/api/learning-materials/([^/]+)/signed-url$#', $path, $m) && $method === 'GET') {
  $id = $m[1];
  $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $id): void {
    $learningMaterialsController->signedUrl($authedRequest, $id);
  });
  exit;
}

// Route: POST /api/learning-materials/:id/like (auth required)
if (preg_match('#^/api/learning-materials/([^/]+)/like$#', $path, $m) && $method === 'POST') {
  $id = $m[1];
  $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $id): void {
    $learningMaterialsController->like($authedRequest, $id);
  });
  exit;
}

// Route: POST /api/learning-materials/:id/download (auth required)
if (preg_match('#^/api/learning-materials/([^/]+)/download$#', $path, $m) && $method === 'POST') {
  $id = $m[1];
  $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $id): void {
    $learningMaterialsController->download($authedRequest, $id);
  });
  exit;
}

// Route: GET /api/learning-materials/:id/stream (auth required)
if (preg_match('#^/api/learning-materials/([^/]+)/stream$#', $path, $m) && $method === 'GET') {
  $id = $m[1];
  $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $id): void {
    $learningMaterialsController->stream($authedRequest, $id);
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
