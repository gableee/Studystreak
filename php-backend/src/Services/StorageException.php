<?php

declare(strict_types=1);

namespace App\Services;

final class StorageException extends \RuntimeException
{
    private int $status;
    /** @var array<string,mixed> */
    private array $details;

    /**
     * @param array<string,mixed> $details
     */
    public function __construct(string $message, int $status = 500, array $details = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->details = $details;
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    /**
     * @return array<string,mixed>
     */
    public function getDetails(): array
    {
        return $this->details;
    }
}
