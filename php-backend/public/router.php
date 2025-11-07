<?php
/**
 * Router script for PHP built-in server.
 * Forces all non-static file requests through index.php
 */

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?? '/';

// Allow static files in /docs to be served directly
if (str_starts_with($path, '/docs/')) {
    return false; // Let PHP's built-in server handle it
}

// Route all API requests and dynamic routes through index.php
// This includes .pdf routes which should be dynamically generated
if (str_starts_with($path, '/api/') || str_starts_with($path, '/health') || $path === '/') {
    require_once __DIR__ . '/index.php';
    return true;
}

// For other requests, let the built-in server handle them
return false;
