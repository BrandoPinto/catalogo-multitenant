<?php
// controllers/AuthController.php

class AuthController
{
    public function login(): void
    {
        $data = self::jsonBody();

        $email    = trim($data['email']    ?? '');
        $password = trim($data['password'] ?? '');

        if (!$email || !$password) {
            Response::error('Email y contraseña son requeridos.', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Email inválido.', 422);
        }

        $companyId = TenantMiddleware::getCompanyId();
        $pdo       = Database::getInstance();

        $stmt = $pdo->prepare(
            'SELECT id, name, email, password, role, company_id
             FROM users
             WHERE email = :email AND company_id = :company_id AND active = 1
             LIMIT 1'
        );
        $stmt->execute([':email' => $email, ':company_id' => $companyId]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            Response::error('Credenciales incorrectas.', 401);
        }

        $token = JWT::encode([
            'sub'        => $user['id'],
            'email'      => $user['email'],
            'role'       => $user['role'],
            'company_id' => $user['company_id'],
        ]);

        Response::success([
            'token' => $token,
            'user'  => [
                'id'         => $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'],
                'role'       => $user['role'],
                'company_id' => $user['company_id'],
            ],
        ], 'Login exitoso');
    }

    public function me(): void
    {
        AuthMiddleware::require();
        $user = AuthMiddleware::getUser();
        unset($user['password']);
        Response::success($user);
    }

    public function changePassword(): void
    {
        AuthMiddleware::require();
        $user = AuthMiddleware::getUser();
        $data = self::jsonBody();

        $current = $data['current_password'] ?? '';
        $new      = $data['new_password']     ?? '';

        if (!$current || !$new) {
            Response::error('Contraseña actual y nueva son requeridas.', 422);
        }

        if (strlen($new) < 8) {
            Response::error('La nueva contraseña debe tener al menos 8 caracteres.', 422);
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare('SELECT password FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $user['id']]);
        $row = $stmt->fetch();

        if (!password_verify($current, $row['password'])) {
            Response::error('Contraseña actual incorrecta.', 401);
        }

        $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 12]);
        $upd  = $pdo->prepare('UPDATE users SET password = :p WHERE id = :id');
        $upd->execute([':p' => $hash, ':id' => $user['id']]);

        Response::success(null, 'Contraseña actualizada correctamente.');
    }

    private static function jsonBody(): array
    {
        $raw = file_get_contents('php://input');
        return (array)json_decode($raw, true);
    }
}
