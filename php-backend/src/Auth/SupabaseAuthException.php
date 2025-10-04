<?php

namespace App\Auth;

use Throwable;

final class SupabaseAuthException extends \RuntimeException
{
    private array $details;

    /**
     * @param string $message
     * @param int $code
     * @param array<string,mixed> $details
     * @param Throwable|null $previous
     */
    public function __construct(string $message, int $code = 0, array $details = [], ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->details = $details;
    }

    /**
     * @return array<string,mixed>
     */
    public function getDetails(): array
    {
        return $this->details;
    }
}
