<?php

/**
 * Response
 *
 * Minimal HTTP response helper used by JsonResponder. Manages status
 * code, headers and body, and can send JSON responses with proper
 * Content-Type and status.
 */
namespace App\Http;

final class Response
{
    private int $status = 200;
    private array $headers = [];
    private $body = null;

    public function setStatus(int $code): void { $this->status = $code; }
    public function setHeader(string $name, string $value): void { $this->headers[$name] = $value; }
    public function setBody($value): void { $this->body = $value; }

    public function sendJson($payload): void
    {
        http_response_code($this->status);
        header('Content-Type: application/json');
        foreach ($this->headers as $n => $v) header(sprintf('%s: %s', $n, $v));
        echo json_encode($payload);
    }
}
