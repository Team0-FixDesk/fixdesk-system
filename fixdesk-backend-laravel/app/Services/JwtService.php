<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    public static function encode(array $payload, string $expiresIn = '+8 hours'): string
    {
        $payload['iat'] = time();
        $payload['exp'] = strtotime($expiresIn, time());

        return JWT::encode($payload, config('app.jwt_secret'), 'HS256');
    }

    /**
     * @throws \Firebase\JWT\ExpiredException|\UnexpectedValueException
     */
    public static function decode(string $token): array
    {
        $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));

        return (array) $decoded;
    }
}
