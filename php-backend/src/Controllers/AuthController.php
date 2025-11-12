<?php

/**
 * AuthController
 *
 * Controller responsible for user authentication actions.
 * Provides endpoints for signing in, signing up, refreshing tokens,
 * and returning the current authenticated user. Delegates auth
 * operations to the SupabaseAuth service and uses JsonResponder
 * to return consistent JSON responses.
 */
namespace App\Controllers;

use App\Auth\SupabaseAuth;
use App\Auth\SupabaseAuthException;
use App\Http\JsonResponder;
use App\Http\Request;

final class AuthController
{
    private SupabaseAuth $auth;

    public function __construct(SupabaseAuth $auth)
    {
        $this->auth = $auth;
    }

    public function signIn(Request $request): void
    {
        $body = $request->getBody() ?? [];
        $email = (string)($body['email'] ?? '');
        $password = (string)($body['password'] ?? '');

        if ($email === '' || $password === '') {
            JsonResponder::badRequest('Email and password are required');
            return;
        }

        try {
            $result = $this->auth->signInWithPassword($email, $password);
            JsonResponder::ok($result);
        } catch (SupabaseAuthException $e) {
            $status = $e->getCode() >= 400 ? $e->getCode() : 400;
            JsonResponder::withStatus($status, [
                'error' => $e->getMessage(),
                'details' => $e->getDetails(),
            ]);
        }
    }

    public function signUp(Request $request): void
    {
        $body = $request->getBody() ?? [];
        $email = (string)($body['email'] ?? '');
        $password = (string)($body['password'] ?? '');

        if ($email === '' || $password === '') {
            JsonResponder::badRequest('Email and password are required');
            return;
        }

        $payload = [
            'email' => $email,
            'password' => $password,
        ];

        if (isset($body['data']) && is_array($body['data'])) {
            $payload['data'] = $body['data'];
        }

        try {
            $result = $this->auth->signUp($payload);
            JsonResponder::withStatus(201, $result);
        } catch (SupabaseAuthException $e) {
            $status = $e->getCode() >= 400 ? $e->getCode() : 400;
            JsonResponder::withStatus($status, [
                'error' => $e->getMessage(),
                'details' => $e->getDetails(),
            ]);
        }
    }

    public function refresh(Request $request): void
    {
        $body = $request->getBody() ?? [];
        $refreshToken = (string)($body['refresh_token'] ?? '');
        if ($refreshToken === '') {
            JsonResponder::badRequest('refresh_token is required');
            return;
        }

        try {
            $result = $this->auth->refreshAccessToken($refreshToken);
            JsonResponder::ok($result);
        } catch (SupabaseAuthException $e) {
            $status = $e->getCode() >= 400 ? $e->getCode() : 400;
            JsonResponder::withStatus($status, [
                'error' => $e->getMessage(),
                'details' => $e->getDetails(),
            ]);
        }
    }

    public function me(Request $request): void
    {
        $user = $request->getAttribute('user');
        if ($user === null) {
            JsonResponder::unauthorized();
            return;
        }

        JsonResponder::ok([
            'user' => $user->getRaw(),
        ]);
    }
}
