<?php
// middlewares/AuthMiddleware.php

/**
 * MIDDLEWARE DE AUTENTICACIÓN
 * 
 * Valida JWT y asegura que el usuario pertenece a la empresa (tenant) actual.
 * NUNCA permite acceso cross-tenant.
 */
class AuthMiddleware
{
    private static ?array $currentUser = null;

    public static function require(): void
    {
        $token = self::extractToken();

        if (!$token) {
            Response::error('Token de autenticación requerido.', 401);
        }

        $payload = JWT::decode($token);

        if (!$payload) {
            Response::error('Token inválido o expirado.', 401);
        }

        // SEGURIDAD CRÍTICA: El usuario debe pertenecer a la empresa actual
        $companyId = TenantMiddleware::getCompanyId();

        if ((int)($payload['company_id'] ?? 0) !== $companyId) {
            Response::error('Acceso denegado: no pertenece a esta empresa.', 403);
        }

        // Verificar que el usuario sigue activo en BD
        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT id, name, email, role, company_id
             FROM users
             WHERE id = :id AND company_id = :company_id AND active = 1
             LIMIT 1'
        );
        $stmt->execute([':id' => $payload['sub'], ':company_id' => $companyId]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Usuario no encontrado o inactivo.', 401);
        }

        self::$currentUser         = $user;
        $GLOBALS['current_user']   = $user;
    }

    public static function getUser(): array
    {
        return self::$currentUser ?? [];
    }

    public static function requireRole(string ...$roles): void
    {
        self::require();
        $user = self::getUser();
        if (!in_array($user['role'] ?? '', $roles, true)) {
            Response::error('Permisos insuficientes.', 403);
        }
    }

    private static function extractToken(): ?string
    {
        // Authorization: Bearer <token>
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            return $m[1];
        }
        // Cookie alternativa
        return $_COOKIE['auth_token'] ?? null;
    }
}
