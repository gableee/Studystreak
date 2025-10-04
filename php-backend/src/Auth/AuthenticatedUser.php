<?php

namespace App\Auth;

/**
 * Value object representing an authenticated Supabase user.
 */
final class AuthenticatedUser
{
    private string $id;
    private string $email;
    private array $raw;

    /**
     * @param array{id:string,email:string}|array<string,mixed> $payload Raw user payload returned by Supabase.
     */
    public function __construct(array $payload)
    {
        $this->id = (string)($payload['id'] ?? '');
        $this->email = (string)($payload['email'] ?? '');
        $this->raw = $payload;

        if ($this->id === '') {
            throw new \InvalidArgumentException('Authenticated user payload missing id');
        }
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    /**
     * @return array<string,mixed>
     */
    public function getRaw(): array
    {
        return $this->raw;
    }
}
