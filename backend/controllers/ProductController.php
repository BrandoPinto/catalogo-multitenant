<?php
// controllers/ProductController.php

class ProductController
{
    private PDO $pdo;
    private int $companyId;

    public function __construct()
    {
        $this->pdo       = Database::getInstance();
        $this->companyId = TenantMiddleware::getCompanyId();
    }

    // ── PUBLIC ──────────────────────────────────────────────

    /** GET /products */
    public function index(): void
    {
        $page       = max(1, (int)($_GET['page']        ?? 1));
        $perPage    = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
        $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
        $featured   = isset($_GET['featured'])   ? (bool)$_GET['featured']    : null;
        $search     = trim($_GET['search'] ?? '');
        $minPrice   = isset($_GET['min_price']) && is_numeric($_GET['min_price']) ? (float)$_GET['min_price'] : null;
        $maxPrice   = isset($_GET['max_price']) && is_numeric($_GET['max_price']) ? (float)$_GET['max_price'] : null;
        $offset     = ($page - 1) * $perPage;

        [$where, $params] = $this->buildPublicWhere($categoryId, $featured, $search, $minPrice, $maxPrice);

        // Total
        $countSql = "SELECT COUNT(*) FROM products p WHERE {$where}";
        $countStmt = $this->pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Datos
        $sql   = "SELECT p.*, c.name AS category_name
                  FROM products p
                  LEFT JOIN categories c ON c.id = p.category_id
                  WHERE {$where}
                  ORDER BY p.featured DESC, p.sort_order ASC, p.created_at DESC
                  LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();

        // Agregar imágenes a cada producto
        $products = array_map([$this, 'appendImages'], $products);

        Response::paginated($products, $total, $page, $perPage);
    }

    /** GET /products/:id */
    public function show(int $id): void
    {
        $product = $this->findOrFail($id, false);
        $product = $this->appendImages($product);
        Response::success($product);
    }

    // ── ADMIN ────────────────────────────────────────────────

    /** GET /admin/products */
    public function adminIndex(): void
    {
        AuthMiddleware::require();

        $page     = max(1, (int)($_GET['page']       ?? 1));
        $perPage  = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
        $catId    = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
        $active   = isset($_GET['active'])   ? (bool)$_GET['active']   : null;
        $featured = isset($_GET['featured']) ? (bool)$_GET['featured'] : null;
        $search   = trim($_GET['search'] ?? '');
        $offset   = ($page - 1) * $perPage;

        [$where, $params] = $this->buildAdminWhere($catId, $active, $featured, $search);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM products p WHERE {$where}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql  = "SELECT p.*, c.name AS category_name
                 FROM products p
                 LEFT JOIN categories c ON c.id = p.category_id
                 WHERE {$where}
                 ORDER BY p.created_at DESC
                 LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();
        $products = array_map([$this, 'appendImages'], $products);

        Response::paginated($products, $total, $page, $perPage);
    }

    /** POST /admin/products */
    public function store(): void
    {
        AuthMiddleware::require();

        // Soporta JSON o multipart/form-data
        $data = $this->parseInput();
        $this->validateProductData($data);

        $slug = Slug::unique($data['name'], $this->pdo, 'products', 'slug',
            ['company_id' => $this->companyId]);

        $sizesRaw     = $data['sizes'] ?? null;
        $sizesDecoded = is_string($sizesRaw) ? json_decode($sizesRaw, true) : (is_array($sizesRaw) ? $sizesRaw : []);
        $sizesJson    = !empty($sizesDecoded) ? json_encode($sizesDecoded) : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO products
                (company_id, category_id, name, slug, description, price, compare_price,
                 sku, stock, active, featured, sort_order, sizes_enabled, sizes)
             VALUES
                (:cid, :cat, :name, :slug, :desc, :price, :cprice,
                 :sku, :stock, :active, :featured, :order, :sizesen, :sizes)'
        );
        $stmt->execute([
            ':cid'     => $this->companyId,
            ':cat'     => $data['category_id'] ?: null,
            ':name'    => $data['name'],
            ':slug'    => $slug,
            ':desc'    => $data['description']   ?: null,
            ':price'   => (float)$data['price'],
            ':cprice'  => isset($data['compare_price']) ? (float)$data['compare_price'] : null,
            ':sku'     => $data['sku']            ?: null,
            ':stock'   => isset($data['stock'])   ? (int)$data['stock'] : null,
            ':active'  => isset($data['active'])  ? (int)(bool)$data['active']   : 1,
            ':featured'=> isset($data['featured'])? (int)(bool)$data['featured'] : 0,
            ':order'   => (int)($data['sort_order'] ?? 0),
            ':sizesen' => isset($data['sizes_enabled']) ? (int)(bool)$data['sizes_enabled'] : 0,
            ':sizes'   => $sizesJson,
        ]);

        $productId = (int)$this->pdo->lastInsertId();

        // Crear filas de stock por talla
        if (!empty($sizesDecoded)) {
            $this->syncSizeStocks($productId, $sizesDecoded);
        }

        // Procesar imágenes subidas
        if (!empty($_FILES['images'])) {
            $this->handleImageUploads($productId, $_FILES['images']);
        }

        $product = $this->findOrFail($productId);
        $product = $this->appendImages($product);

        Response::success($product, 'Producto creado.', 201);
    }

    /** PUT /admin/products/:id */
    public function update(int $id): void
    {
        AuthMiddleware::require();
        $existing = $this->findOrFail($id);

        $data   = $this->parseInput();
        $fields = [];
        $params = [':id' => $id, ':cid' => $this->companyId];

        $mappings = [
            'name'          => 'name',
            'description'   => 'description',
            'price'         => 'price',
            'compare_price' => 'compare_price',
            'sku'           => 'sku',
            'stock'         => 'stock',
            'active'        => 'active',
            'featured'      => 'featured',
            'sort_order'    => 'sort_order',
            'category_id'   => 'category_id',
        ];

        foreach ($mappings as $key => $col) {
            if (!array_key_exists($key, $data)) continue;

            $param = ':' . str_replace('_', '', $key);
            $fields[] = "{$col} = {$param}";

            $val = $data[$key];
            if (in_array($key, ['active', 'featured'])) $val = (int)(bool)$val;
            elseif (in_array($key, ['price', 'compare_price'])) $val = $val !== null ? (float)$val : null;
            elseif (in_array($key, ['stock', 'sort_order', 'category_id'])) $val = $val !== null ? (int)$val : null;

            $params[$param] = $val;
        }

        // Regenerar slug si cambió el nombre
        if (isset($data['name']) && trim($data['name']) !== '') {
            $slug = Slug::unique($data['name'], $this->pdo, 'products', 'slug',
                ['company_id' => $this->companyId], $id);
            $fields[]        = 'slug = :slug';
            $params[':slug'] = $slug;
        }

        if (array_key_exists('sizes_enabled', $data)) {
            $fields[]           = 'sizes_enabled = :sizesen';
            $params[':sizesen'] = (int)(bool)$data['sizes_enabled'];
        }
        if (array_key_exists('sizes', $data)) {
            $fields[]        = 'sizes = :sizes';
            $sv              = $data['sizes'];
            $decoded         = is_string($sv) ? json_decode($sv, true) : (is_array($sv) ? $sv : []);
            $params[':sizes'] = !empty($decoded) ? json_encode($decoded) : null;
        }

        if (!empty($fields)) {
            $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = :id AND company_id = :cid';
            $this->pdo->prepare($sql)->execute($params);
        }

        // Sync size_stocks when sizes are defined
        $sizesEnabled = array_key_exists('sizes_enabled', $data)
            ? (bool)$data['sizes_enabled']
            : (bool)($existing['sizes_enabled'] ?? false);

        if (array_key_exists('sizes', $data)) {
            $sv       = $data['sizes'];
            $newSizes = is_string($sv) ? json_decode($sv, true) : (is_array($sv) ? $sv : []);
        } else {
            $sv       = $existing['sizes'] ?? null;
            $newSizes = is_string($sv) ? json_decode($sv, true) : (is_array($sv) ? $sv : []);
        }
        if ($sizesEnabled && !empty($newSizes)) {
            $this->syncSizeStocks($id, $newSizes);
        }

        // Nuevas imágenes
        if (!empty($_FILES['images'])) {
            $this->handleImageUploads($id, $_FILES['images']);
        }

        $product = $this->appendImages($this->findOrFail($id));
        Response::success($product, 'Producto actualizado.');
    }

    /** DELETE /admin/products/:id */
    public function destroy(int $id): void
    {
        AuthMiddleware::require();
        $product = $this->findOrFail($id);

        // Borrar imágenes del disco
        $imgs = $this->getImages($id);
        foreach ($imgs as $img) {
            Upload::delete(ltrim(str_replace(
                rtrim($_ENV['APP_URL'] ?? '', '/') . '/' . rtrim($_ENV['UPLOAD_PATH'] ?? 'uploads/', '/') . '/',
                '', $img['url']
            ), '/'));
        }

        $this->pdo->prepare('DELETE FROM products WHERE id = :id AND company_id = :cid')
            ->execute([':id' => $id, ':cid' => $this->companyId]);

        Response::success(null, 'Producto eliminado.');
    }

    /** POST /admin/products/:id/images */
    public function addImages(int $id): void
    {
        AuthMiddleware::require();
        $this->findOrFail($id);

        if (!empty($_FILES['images'])) {
            $this->handleImageUploads($id, $_FILES['images']);
        }

        Response::success($this->appendImages($this->findOrFail($id)), 'Imágenes subidas.');
    }

    /** DELETE /admin/products/:id/images/:imageId */
    public function deleteImage(int $productId, int $imageId): void
    {
        AuthMiddleware::require();
        $this->findOrFail($productId);

        $stmt = $this->pdo->prepare('SELECT * FROM product_images WHERE id = :iid AND product_id = :pid LIMIT 1');
        $stmt->execute([':iid' => $imageId, ':pid' => $productId]);
        $img = $stmt->fetch();
        if (!$img) Response::error('Imagen no encontrada.', 404);

        Upload::delete($img['url']);

        $this->pdo->prepare('DELETE FROM product_images WHERE id = :id')
            ->execute([':id' => $imageId]);

        Response::success(null, 'Imagen eliminada.');
    }

    /** PATCH /admin/products/:id/toggle */
    public function toggle(int $id): void
    {
        AuthMiddleware::require();
        $product = $this->findOrFail($id);
        $new = $product['active'] ? 0 : 1;

        $this->pdo->prepare('UPDATE products SET active = :a WHERE id = :id AND company_id = :cid')
            ->execute([':a' => $new, ':id' => $id, ':cid' => $this->companyId]);

        Response::success(['active' => (bool)$new], $new ? 'Producto activado.' : 'Producto desactivado.');
    }

    /** PATCH /admin/products/:id/feature */
    public function feature(int $id): void
    {
        AuthMiddleware::require();
        $product = $this->findOrFail($id);
        $new = $product['featured'] ? 0 : 1;

        $this->pdo->prepare('UPDATE products SET featured = :f WHERE id = :id AND company_id = :cid')
            ->execute([':f' => $new, ':id' => $id, ':cid' => $this->companyId]);

        Response::success(['featured' => (bool)$new], $new ? 'Marcado como destacado.' : 'Quitado de destacados.');
    }

    // ── PRIVATE ──────────────────────────────────────────────

    private function findOrFail(int $id, bool $onlyActive = false): array
    {
        $activeClause = $onlyActive ? ' AND p.active = 1' : '';
        $stmt = $this->pdo->prepare(
            "SELECT p.*, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.id = :id AND p.company_id = :cid{$activeClause}
             LIMIT 1"
        );
        $stmt->execute([':id' => $id, ':cid' => $this->companyId]);
        $p = $stmt->fetch();
        if (!$p) Response::error('Producto no encontrado.', 404);
        return $p;
    }

    private function appendImages(array $product): array
    {
        $product['images'] = $this->getImages((int)$product['id']);
        $product['main_image'] = $product['images'][0]['url'] ?? null;
        if (!empty($product['sizes']) && is_string($product['sizes'])) {
            $product['sizes'] = json_decode($product['sizes'], true) ?? [];
        } elseif (empty($product['sizes'])) {
            $product['sizes'] = [];
        }
        $product['size_stocks'] = (!empty($product['sizes_enabled']) && !empty($product['sizes']))
            ? $this->getSizeStocks((int)$product['id'], $product['sizes'])
            : [];
        return $product;
    }

    private function getSizeStocks(int $productId, array $sizes): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT size, stock FROM product_size_stocks WHERE product_id = :pid'
        );
        $stmt->execute([':pid' => $productId]);
        $map = [];
        foreach ($stmt->fetchAll() as $r) $map[$r['size']] = (int)$r['stock'];
        return array_map(fn($s) => ['size' => $s, 'stock' => $map[$s] ?? 0], $sizes);
    }

    private function syncSizeStocks(int $productId, array $sizes): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT IGNORE INTO product_size_stocks (product_id, size, stock) VALUES (:pid, :size, 0)'
        );
        foreach ($sizes as $size) {
            if (trim((string)$size) !== '') {
                $stmt->execute([':pid' => $productId, ':size' => trim($size)]);
            }
        }
    }

    private function getImages(int $productId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM product_images WHERE product_id = :id ORDER BY sort_order ASC, id ASC'
        );
        $stmt->execute([':id' => $productId]);
        $images = $stmt->fetchAll();

        $base       = rtrim($_ENV['APP_URL'] ?? '', '/');
        $uploadPath = rtrim($_ENV['UPLOAD_PATH'] ?? 'uploads/', '/');

        return array_map(function ($img) use ($base, $uploadPath) {
            // Si la URL ya es absoluta, no transformar
            if (!str_starts_with($img['url'], 'http')) {
                $img['url'] = "{$base}/{$uploadPath}/{$img['url']}";
            }
            return $img;
        }, $images);
    }

    private function handleImageUploads(int $productId, array $filesArray): void
    {
        // Normalizar estructura (puede venir como array de files o file único)
        $files = [];
        if (is_array($filesArray['name'])) {
            for ($i = 0; $i < count($filesArray['name']); $i++) {
                if ($filesArray['error'][$i] === UPLOAD_ERR_OK) {
                    $files[] = [
                        'name'     => $filesArray['name'][$i],
                        'type'     => $filesArray['type'][$i],
                        'tmp_name' => $filesArray['tmp_name'][$i],
                        'error'    => $filesArray['error'][$i],
                        'size'     => $filesArray['size'][$i],
                    ];
                }
            }
        } else {
            $files[] = $filesArray;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO product_images (product_id, url, sort_order) VALUES (:pid, :url, :order)'
        );

        // Obtener orden actual máximo
        $maxOrderStmt = $this->pdo->prepare(
            'SELECT COALESCE(MAX(sort_order), 0) FROM product_images WHERE product_id = :pid'
        );
        $maxOrderStmt->execute([':pid' => $productId]);
        $maxOrder = (int)$maxOrderStmt->fetchColumn();

        foreach ($files as $i => $file) {
            try {
                $path = Upload::image($file, 'products');
                $stmt->execute([':pid' => $productId, ':url' => $path, ':order' => $maxOrder + $i + 1]);
            } catch (RuntimeException $e) {
                // Log el error pero no interrumpir todo el proceso
                error_log("Image upload error: " . $e->getMessage());
            }
        }
    }

    private function buildPublicWhere(?int $catId, ?bool $featured, string $search, ?float $minPrice = null, ?float $maxPrice = null): array
    {
        $where  = ['p.company_id = :cid', 'p.active = 1'];
        $params = [':cid' => $this->companyId];

        if ($catId !== null) {
            $where[]     = 'p.category_id = :cat';
            $params[':cat'] = $catId;
        }
        if ($featured !== null) {
            $where[]       = 'p.featured = :feat';
            $params[':feat'] = $featured ? 1 : 0;
        }
        if ($search !== '') {
            $where[]           = '(p.name LIKE :search1 OR p.description LIKE :search2)';
            $params[':search1'] = "%{$search}%";
            $params[':search2'] = "%{$search}%";
        }
        if ($minPrice !== null) {
            $where[]              = 'p.price >= :min_price';
            $params[':min_price'] = $minPrice;
        }
        if ($maxPrice !== null) {
            $where[]              = 'p.price <= :max_price';
            $params[':max_price'] = $maxPrice;
        }

        return [implode(' AND ', $where), $params];
    }

    private function buildAdminWhere(?int $catId, ?bool $active, ?bool $featured, string $search): array
    {
        $where  = ['p.company_id = :cid'];
        $params = [':cid' => $this->companyId];

        if ($catId !== null) {
            $where[]        = 'p.category_id = :cat';
            $params[':cat'] = $catId;
        }
        if ($active !== null) {
            $where[]          = 'p.active = :active';
            $params[':active'] = $active ? 1 : 0;
        }
        if ($featured !== null) {
            $where[]           = 'p.featured = :feat';
            $params[':feat']   = $featured ? 1 : 0;
        }
        if ($search !== '') {
            $where[]            = '(p.name LIKE :search1 OR p.sku LIKE :search2)';
            $params[':search1'] = "%{$search}%";
            $params[':search2'] = "%{$search}%";
        }

        return [implode(' AND ', $where), $params];
    }

    private function validateProductData(array $data): void
    {
        $errors = [];
        if (empty($data['name'])) $errors[] = 'El nombre es requerido.';
        if (!isset($data['price']) || !is_numeric($data['price'])) $errors[] = 'El precio es requerido y debe ser numérico.';
        if (!empty($errors)) Response::error('Datos inválidos.', 422, $errors);
    }

    private function parseInput(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (str_contains($contentType, 'application/json')) {
            return (array)json_decode(file_get_contents('php://input'), true);
        }

        // multipart/form-data o application/x-www-form-urlencoded
        return $_POST;
    }
}
