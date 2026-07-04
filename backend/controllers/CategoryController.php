<?php
// controllers/CategoryController.php

class CategoryController
{
    private PDO $pdo;
    private int $companyId;

    public function __construct()
    {
        $this->pdo       = Database::getInstance();
        $this->companyId = TenantMiddleware::getCompanyId();
    }

    // ── PUBLIC ──────────────────────────────────────────────

    /** GET /categories */
    public function index(): void
    {
        $stmt = $this->pdo->prepare(
            'SELECT c.*, 
                    COUNT(p.id) AS product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id AND p.active = 1 AND p.company_id = :cid2
             WHERE c.company_id = :cid AND c.active = 1
             GROUP BY c.id
             ORDER BY c.sort_order ASC, c.name ASC'
        );
        $stmt->execute([':cid' => $this->companyId, ':cid2' => $this->companyId]);
        Response::success($stmt->fetchAll());
    }

    /** GET /categories/:id */
    public function show(int $id): void
    {
        $cat = $this->findOrFail($id);
        Response::success($cat);
    }

    // ── ADMIN ────────────────────────────────────────────────

    /** GET /admin/categories */
    public function adminIndex(): void
    {
        AuthMiddleware::require();
        $stmt = $this->pdo->prepare(
            'SELECT c.*, COUNT(p.id) AS product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id AND p.company_id = :cid2
             WHERE c.company_id = :cid
             GROUP BY c.id
             ORDER BY c.sort_order ASC, c.name ASC'
        );
        $stmt->execute([':cid' => $this->companyId, ':cid2' => $this->companyId]);
        Response::success($stmt->fetchAll());
    }

    /** POST /admin/categories */
    public function store(): void
    {
        AuthMiddleware::require();
        $data = $this->jsonBody();

        $name  = trim($data['name'] ?? '');
        $desc  = trim($data['description'] ?? '');
        $order = (int)($data['sort_order'] ?? 0);

        if (!$name) Response::error('El nombre es requerido.', 422);

        $slug = Slug::unique($name, $this->pdo, 'categories', 'slug', ['company_id' => $this->companyId]);

        $stmt = $this->pdo->prepare(
            'INSERT INTO categories (company_id, name, slug, description, sort_order)
             VALUES (:cid, :name, :slug, :desc, :order)'
        );
        $stmt->execute([
            ':cid'   => $this->companyId,
            ':name'  => $name,
            ':slug'  => $slug,
            ':desc'  => $desc ?: null,
            ':order' => $order,
        ]);

        $cat = $this->findOrFail((int)$this->pdo->lastInsertId());
        Response::success($cat, 'Categoría creada.', 201);
    }

    /** PUT /admin/categories/:id */
    public function update(int $id): void
    {
        AuthMiddleware::require();
        $this->findOrFail($id); // asegura ownership
        $data = $this->jsonBody();

        $fields = [];
        $params = [':id' => $id, ':cid' => $this->companyId];

        if (isset($data['name']) && trim($data['name']) !== '') {
            $slug = Slug::unique($data['name'], $this->pdo, 'categories', 'slug',
                ['company_id' => $this->companyId], $id);
            $fields[] = 'name = :name';
            $fields[] = 'slug = :slug';
            $params[':name'] = trim($data['name']);
            $params[':slug'] = $slug;
        }

        if (array_key_exists('description', $data)) {
            $fields[]        = 'description = :desc';
            $params[':desc'] = $data['description'] ?: null;
        }

        if (array_key_exists('sort_order', $data)) {
            $fields[]         = 'sort_order = :order';
            $params[':order'] = (int)$data['sort_order'];
        }

        if (array_key_exists('active', $data)) {
            $fields[]          = 'active = :active';
            $params[':active'] = $data['active'] ? 1 : 0;
        }

        if (empty($fields)) Response::error('No hay cambios.', 422);

        $sql = 'UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = :id AND company_id = :cid';
        $this->pdo->prepare($sql)->execute($params);

        Response::success($this->findOrFail($id), 'Categoría actualizada.');
    }

    /** DELETE /admin/categories/:id */
    public function destroy(int $id): void
    {
        AuthMiddleware::require();
        $this->findOrFail($id);

        // Mover productos a sin categoría
        $this->pdo->prepare('UPDATE products SET category_id = NULL WHERE category_id = :id AND company_id = :cid')
            ->execute([':id' => $id, ':cid' => $this->companyId]);

        $this->pdo->prepare('DELETE FROM categories WHERE id = :id AND company_id = :cid')
            ->execute([':id' => $id, ':cid' => $this->companyId]);

        Response::success(null, 'Categoría eliminada.');
    }

    // ── PRIVATE ──────────────────────────────────────────────

    private function findOrFail(int $id): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM categories WHERE id = :id AND company_id = :cid LIMIT 1'
        );
        $stmt->execute([':id' => $id, ':cid' => $this->companyId]);
        $cat = $stmt->fetch();
        if (!$cat) Response::error('Categoría no encontrada.', 404);
        return $cat;
    }

    private function jsonBody(): array
    {
        return (array)json_decode(file_get_contents('php://input'), true);
    }
}
