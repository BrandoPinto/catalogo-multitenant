<?php
// controllers/UserController.php

class UserController
{
    private PDO $pdo;
    private int $companyId;

    public function __construct()
    {
        $this->pdo       = Database::getInstance();
        $this->companyId = TenantMiddleware::getCompanyId();
    }

    /** GET /admin/users */
    public function index(): void
    {
        AuthMiddleware::requireRole('admin');

        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, role, active, created_at
             FROM users
             WHERE company_id = :cid
             ORDER BY created_at DESC'
        );
        $stmt->execute([':cid' => $this->companyId]);
        Response::success($stmt->fetchAll());
    }

    /** POST /admin/users */
    public function store(): void
    {
        AuthMiddleware::requireRole('admin');
        $data = $this->jsonBody();

        $name     = trim($data['name']     ?? '');
        $email    = trim($data['email']    ?? '');
        $password = trim($data['password'] ?? '');
        $role     = $data['role'] ?? 'editor';

        $errors = [];
        if (!$name)                              $errors[] = 'Nombre requerido.';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Email inválido.';
        if (strlen($password) < 8)               $errors[] = 'Contraseña mínimo 8 caracteres.';
        if (!in_array($role, ['admin', 'editor'])) $errors[] = 'Rol inválido.';
        if (!empty($errors)) Response::error('Datos inválidos.', 422, $errors);

        // Verificar email único por empresa
        $stmt = $this->pdo->prepare('SELECT id FROM users WHERE email = :e AND company_id = :cid LIMIT 1');
        $stmt->execute([':e' => $email, ':cid' => $this->companyId]);
        if ($stmt->fetch()) Response::error('El email ya está registrado en esta empresa.', 409);

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $ins = $this->pdo->prepare(
            'INSERT INTO users (company_id, name, email, password, role) VALUES (:cid, :name, :email, :pass, :role)'
        );
        $ins->execute([
            ':cid'   => $this->companyId,
            ':name'  => $name,
            ':email' => $email,
            ':pass'  => $hash,
            ':role'  => $role,
        ]);

        $user = $this->findOrFail((int)$this->pdo->lastInsertId());
        Response::success($user, 'Usuario creado.', 201);
    }

    /** PUT /admin/users/:id */
    public function update(int $id): void
    {
        AuthMiddleware::requireRole('admin');
        $this->findOrFail($id);
        $data   = $this->jsonBody();
        $fields = [];
        $params = [':id' => $id, ':cid' => $this->companyId];

        if (!empty($data['name'])) {
            $fields[]         = 'name = :name';
            $params[':name']  = trim($data['name']);
        }
        if (!empty($data['role']) && in_array($data['role'], ['admin', 'editor'])) {
            $fields[]         = 'role = :role';
            $params[':role']  = $data['role'];
        }
        if (isset($data['active'])) {
            $fields[]           = 'active = :active';
            $params[':active']  = (int)(bool)$data['active'];
        }
        if (!empty($data['password']) && strlen($data['password']) >= 8) {
            $fields[]           = 'password = :pass';
            $params[':pass']    = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }

        if (!empty($fields)) {
            $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id AND company_id = :cid';
            $this->pdo->prepare($sql)->execute($params);
        }

        Response::success($this->findOrFail($id), 'Usuario actualizado.');
    }

    /** DELETE /admin/users/:id */
    public function destroy(int $id): void
    {
        AuthMiddleware::requireRole('admin');
        $this->findOrFail($id);

        // No permitir borrar el propio usuario
        $current = AuthMiddleware::getUser();
        if ((int)$current['id'] === $id) {
            Response::error('No puedes eliminar tu propio usuario.', 400);
        }

        $this->pdo->prepare('DELETE FROM users WHERE id = :id AND company_id = :cid')
            ->execute([':id' => $id, ':cid' => $this->companyId]);

        Response::success(null, 'Usuario eliminado.');
    }

    private function findOrFail(int $id): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, role, active, created_at FROM users WHERE id = :id AND company_id = :cid LIMIT 1'
        );
        $stmt->execute([':id' => $id, ':cid' => $this->companyId]);
        $u = $stmt->fetch();
        if (!$u) Response::error('Usuario no encontrado.', 404);
        return $u;
    }

    private function jsonBody(): array
    {
        return (array)json_decode(file_get_contents('php://input'), true);
    }
}
