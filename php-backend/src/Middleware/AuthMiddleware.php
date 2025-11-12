<?php

/**
 * AuthMiddleware
 *
 * Middleware that validates incoming requests contain a valid
 * Bearer token. On success it attaches an AuthenticatedUser and the
 * raw access token to the Request attributes and forwards to the
 * next handler; on failure it returns a 401 JSON response.
 */
namespace App\Middleware;

use App\Auth\SupabaseAuth;
use App\Http\JsonResponder;
use App\Http\Request;

final class AuthMiddleware
{
    private SupabaseAuth $auth;

    public function __construct(SupabaseAuth $auth)
    {
        $this->auth = $auth;
    }

    /**
     * Executes the callback when the request has a valid bearer token.
     * Returns immediately with a 401 response otherwise.
     *
     * @param Request $request
     * @param callable $next receives the authenticated Request instance.
     */
    public function handle(Request $request, callable $next): void
    {
        $token = $request->getBearerToken();
        if (!$token) {
            // Log incoming headers to help debug missing Authorization on uploads
            if (function_exists('getallheaders')) {
                $hdrs = getallheaders();
                error_log('[AUTH DEBUG] missing bearer token. request headers: ' . json_encode($hdrs));
            }
            JsonResponder::unauthorized('Missing bearer token');
            return;
        }

        $user = $this->auth->validateToken($token);
        if ($user === null) {
            JsonResponder::unauthorized('Invalid or expired token');
            return;
        }

        $request->setAttribute('user', $user);
        $request->setAttribute('access_token', $token);
        $next($request);
    }
}
