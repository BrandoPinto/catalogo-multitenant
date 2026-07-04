<?php
// controllers/BannerController.php

class BannerController
{
    private PDO $pdo;
    private int $companyId;

    public function __construct()
    {
        $this->pdo       = Database::getInstance();
        $this->companyId = TenantMiddleware::getCompanyId();
    }

    /** GET /banners */
    public function index(): void
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM banners
             WHERE company_id = :cid AND active = 1
             ORDER BY sort_order ASC, id ASC'
        );
        $stmt->execute([':cid' => $this->companyId]);
        $banners = $stmt->fetchAll();
        $banners = array_map([$this, 'withImageUrl'], $banners);
        Response::success($banners);
    }

    /** GET /admin/banners */
    public function adminIndex(): void
    {
        AuthMiddleware::require();
        $stmt = $this->pdo->prepare('SELECT * FROM banners WHERE company_id = :cid ORDER BY sort_order ASC');
        $stmt->execute([':cid' => $this->companyId]);
        $banners = array_map([$this, 'withImageUrl'], $stmt->fetchAll());
        Response::success($banners);
    }

    /** POST /admin/banners */
    public function store(): void
    {
        AuthMiddleware::require();

        if (empty($_FILES['image']['name'])) {
            Response::error('La imagen del banner es requerida.', 422);
        }

        $imagePath = Upload::image($_FILES['image'], 'banners');

        $stmt = $this->pdo->prepare(
            'INSERT INTO banners (company_id, title, subtitle, image, link_url, link_text, sort_order)
             VALUES (:cid, :title, :sub, :img, :link, :ltext, :order)'
        );
        $stmt->execute([
            ':cid'   => $this->companyId,
            ':title' => $_POST['title']     ?? null,
            ':sub'   => $_POST['subtitle']  ?? null,
            ':img'   => $imagePath,
            ':link'  => $_POST['link_url']  ?? null,
            ':ltext' => $_POST['link_text'] ?? null,
            ':order' => (int)($_POST['sort_order'] ?? 0),
        ]);

        $id     = (int)$this->pdo->lastInsertId();
        $banner = $this->findOrFail($id);
        Response::success($this->withImageUrl($banner), 'Banner creado.', 201);
    }

    /** PUT /admin/banners/:id */
    public function update(int $id): void
    {
        AuthMiddleware::require();
        $banner = $this->findOrFail($id);

        $fields = [];
        $params = [':id' => $id, ':cid' => $this->companyId];

        $textFields = ['title', 'subtitle', 'link_url', 'link_text'];
        foreach ($textFields as $f) {
            if (isset($_POST[$f])) {
                $fields[]         = "{$f} = :{$f}";
                $params[":{$f}"]  = $_POST[$f] ?: null;
            }
        }

        if (isset($_POST['sort_order'])) {
            $fields[]           = 'sort_order = :order';
            $params[':order']   = (int)$_POST['sort_order'];
        }

        if (isset($_POST['active'])) {
            $fields[]           = 'active = :active';
            $params[':active']  = (int)(bool)$_POST['active'];
        }

        if (!empty($_FILES['image']['name'])) {
            Upload::delete($banner['image']);
            $path             = Upload::image($_FILES['image'], 'banners');
            $fields[]         = 'image = :img';
            $params[':img']   = $path;
        }

        if (!empty($fields)) {
            $sql = 'UPDATE banners SET ' . implode(', ', $fields) . ' WHERE id = :id AND company_id = :cid';
            $this->pdo->prepare($sql)->execute($params);
        }

        Response::success($this->withImageUrl($this->findOrFail($id)), 'Banner actualizado.');
    }

    /** DELETE /admin/banners/:id */
    public function destroy(int $id): void
    {
        AuthMiddleware::require();
        $banner = $this->findOrFail($id);
        Upload::delete($banner['image']);
        $this->pdo->prepare('DELETE FROM banners WHERE id = :id AND company_id = :cid')
            ->execute([':id' => $id, ':cid' => $this->companyId]);
        Response::success(null, 'Banner eliminado.');
    }

    private function findOrFail(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM banners WHERE id = :id AND company_id = :cid LIMIT 1');
        $stmt->execute([':id' => $id, ':cid' => $this->companyId]);
        $b = $stmt->fetch();
        if (!$b) Response::error('Banner no encontrado.', 404);
        return $b;
    }

    private function withImageUrl(array $banner): array
    {
        if ($banner['image'] && !str_starts_with($banner['image'], 'http')) {
            $base             = rtrim($_ENV['APP_URL'] ?? '', '/');
            $uploadPath       = rtrim($_ENV['UPLOAD_PATH'] ?? 'uploads/', '/');
            $banner['image_url'] = "{$base}/{$uploadPath}/{$banner['image']}";
        } else {
            $banner['image_url'] = $banner['image'];
        }
        return $banner;
    }
}
