<?php
// helpers/JWT.php

class JWT
{
    private static string $secret;
    private static int    $expiry;

    private static function init(): void
    {
        self::$secret = $_ENV['JWT_SECRET'] ?? 'fallback_secret_change_in_production';
        self::$expiry = (int)($_ENV['JWT_EXPIRY'] ?? 86400);
    }

    public static function encode(array $payload): string
    {
        self::init();
        $payload['iat'] = time();
        $payload['exp'] = time() + self::$expiry;

        $header  = self::base64url(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $body    = self::base64url(json_encode($payload));
        $sig     = self::base64url(hash_hmac('sha256', "$header.$body", self::$secret, true));

        return "$header.$body.$sig";
    }

    public static function decode(string $token): ?array
    {
        self::init();
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $body, $sig] = $parts;

        $expected = self::base64url(hash_hmac('sha256', "$header.$body", self::$secret, true));
        if (!hash_equals($expected, $sig)) return null;

        $payload = json_decode(self::base64urlDecode($body), true);
        if (!$payload || $payload['exp'] < time()) return null;

        return $payload;
    }

    private static function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }
}
