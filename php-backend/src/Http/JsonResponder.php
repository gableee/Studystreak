<?php

namespace App\Http;

final class JsonResponder
{
    public static function ok($data): void
    {
        $r = new Response();
        $r->setStatus(200);
        $r->sendJson($data);
    }

    public static function created($data): void
    {
        $r = new Response();
        $r->setStatus(201);
        $r->sendJson($data);
    }

    public static function unauthorized(string $message = 'Unauthorized'): void
    {
        $r = new Response();
        $r->setStatus(401);
        $r->sendJson(['error' => $message]);
    }

    public static function error(int $code = 500, string $message = 'Server error'): void
    {
        $r = new Response();
        $r->setStatus($code);
        $r->sendJson(['error' => $message]);
    }

    /**
     * Convenience method for 400 responses with optional error details.
     *
     * @param string $message
     * @param array<string,mixed> $details
     */
    public static function badRequest(string $message = 'Bad request', array $details = []): void
    {
        $payload = ['error' => $message];
        if ($details !== []) {
            $payload['details'] = $details;
        }

        $r = new Response();
        $r->setStatus(400);
        $r->sendJson($payload);
    }

    /**
     * Send a JSON response with arbitrary status code and payload.
     *
     * @param array<string,mixed> $payload
     */
    public static function withStatus(int $statusCode, array $payload): void
    {
        $r = new Response();
        $r->setStatus($statusCode);
        $r->sendJson($payload);
    }
}
