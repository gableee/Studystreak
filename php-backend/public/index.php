<?php
declare(strict_types=1);

// Ensure PHP upload limits align with the 100MB application constraint.
ini_set('upload_max_filesize', '120M');
ini_set('post_max_size', '125M');
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
$learningMaterialsController = new LearningMaterialsController($config, $supabaseAuth);

// Basic CORS (dev) - adjust origin in production
// Allow the health endpoint to be checked by probes that do not send an Origin header.
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
$allowedOrigins = $config->getAllowedOrigins();
header('Vary: Origin');

$fallbackOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'https://localhost:8173',
];

$normalizeOrigin = static function (?string $value): ?string {
  if ($value === null) {
    return null;
  }
  $trimmed = trim($value);
  if ($trimmed === '') {
    return null;
  }

  $trimmed = rtrim($trimmed, '/');
  $parts = parse_url($trimmed);
  if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
    return strtolower($trimmed);
  }

  $scheme = strtolower($parts['scheme']);
  $host = strtolower($parts['host']);
  $port = isset($parts['port']) ? ':' . $parts['port'] : '';

  return $scheme . '://' . $host . $port;
};

$allowAnyConfiguredOrigin = false;
$normalizedAllowedMap = [];
foreach ($allowedOrigins as $candidateOrigin) {
  if ($candidateOrigin === '*') {
    $allowAnyConfiguredOrigin = true;
    continue;
  }

  $normalized = $normalizeOrigin($candidateOrigin);
  if ($normalized !== null) {
    $normalizedAllowedMap[$normalized] = $candidateOrigin;
  }
}

$normalizedFallbackMap = [];
foreach ($fallbackOrigins as $candidateOrigin) {
  $normalized = $normalizeOrigin($candidateOrigin);
  if ($normalized !== null) {
    $normalizedFallbackMap[$normalized] = $candidateOrigin;
  }
}

$normalizedOrigin = $normalizeOrigin($origin);

// Quick path: if this is the health endpoint, allow any origin so platform probes succeed.
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
if ($requestPath === '/health' || $requestPath === '/' || str_starts_with($requestPath, '/docs') || $requestPath === '/debug-cors') {
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

  if ($allowAnyConfiguredOrigin && $origin !== null) {
    $allowedOrigin = $origin;
  } elseif ($normalizedOrigin !== null) {
    if (isset($normalizedAllowedMap[$normalizedOrigin])) {
      $allowedOrigin = $origin ?? $normalizedAllowedMap[$normalizedOrigin];
    } elseif (isset($normalizedFallbackMap[$normalizedOrigin])) {
      $allowedOrigin = $origin ?? $normalizedFallbackMap[$normalizedOrigin];
    } elseif ($normalizedAllowedMap === []) {
      $hostedFallbacks = [
        'https://studystreak-peach.vercel.app',
        'https://studystreak-backend.onrender.com',
      ];

      $normalizedHostedFallbackMap = [];
      foreach ($hostedFallbacks as $candidateOrigin) {
        $normalized = $normalizeOrigin($candidateOrigin);
        if ($normalized !== null) {
          $normalizedHostedFallbackMap[$normalized] = $candidateOrigin;
        }
      }

      if (isset($normalizedHostedFallbackMap[$normalizedOrigin])) {
        $allowedOrigin = $origin ?? $normalizedHostedFallbackMap[$normalizedOrigin];
      }
    }
  }

  if ($allowedOrigin === null && $origin !== null && !$allowAnyConfiguredOrigin) {
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

// Debug CORS route
if ($path === '/debug-cors') {
  header('Content-Type: application/json');
  $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
  echo json_encode([
    'origin' => $origin,
    'normalizedOrigin' => $normalizedOrigin,
    'allowAnyConfiguredOrigin' => $allowAnyConfiguredOrigin,
    'allowedOrigins' => $allowedOrigins,
    'normalizedAllowedOrigins' => array_values(array_unique(array_keys($normalizedAllowedMap))),
    'fallbackOrigins' => $fallbackOrigins,
    'normalizedFallbackOrigins' => array_values(array_unique(array_keys($normalizedFallbackMap)))
  ]);
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

// Learning materials collection routes
if ($path === '/api/learning-materials' && $method === 'GET') {
  $learningMaterialsController->index($request);
  exit;
}

if ($path === '/api/learning-materials' && $method === 'POST') {
  $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController): void {
    $learningMaterialsController->create($authedRequest);
  });
  exit;
}

// Learning material signed URL route
if (preg_match('#^/api/learning-materials/([0-9a-fA-F\-]{36})/signed-url$#', $path, $matches)) {
  $materialId = $matches[1];
  if ($method === 'GET') {
    $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $materialId): void {
      $learningMaterialsController->signedUrl($authedRequest, $materialId);
    });
  } else {
    JsonResponder::withStatus(405, ['error' => 'Method not allowed']);
  }
  exit;
}

// Learning material like route
if (preg_match('#^/api/learning-materials/([0-9a-fA-F\-]{36})/like$#', $path, $matches)) {
  $materialId = $matches[1];
  if ($method === 'POST') {
    $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $materialId): void {
      $learningMaterialsController->like($authedRequest, $materialId);
    });
  } else {
    JsonResponder::withStatus(405, ['error' => 'Method not allowed']);
  }
  exit;
}

// Learning material unlike route
if (preg_match('#^/api/learning-materials/([0-9a-fA-F\-]{36})/unlike$#', $path, $matches)) {
  $materialId = $matches[1];
  if ($method === 'POST') {
    $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $materialId): void {
      $learningMaterialsController->unlike($authedRequest, $materialId);
    });
  } else {
    JsonResponder::withStatus(405, ['error' => 'Method not allowed']);
  }
  exit;
}

// Learning material detail routes
if (preg_match('#^/api/learning-materials/([0-9a-fA-F\-]{36})$#', $path, $matches)) {
  $materialId = $matches[1];

  if ($method === 'GET') {
    $learningMaterialsController->show($request, $materialId);
    exit;
  }

  if ($method === 'DELETE') {
    $authMiddleware->handle($request, function(Request $authedRequest) use ($learningMaterialsController, $materialId): void {
      $learningMaterialsController->delete($authedRequest, $materialId);
    });
    exit;
  }

  JsonResponder::withStatus(405, ['error' => 'Method not allowed']);
  exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
