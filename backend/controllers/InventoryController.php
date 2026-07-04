<?php
// controllers/InventoryController.php

class InventoryController
{
    private PDO $pdo;
    private int $companyId;

    public function __construct()
    {
        $this->pdo       = Database::getInstance();
        $this->companyId = TenantMiddleware::getCompanyId();
    }

    // ── REASONS ─────────────────────────────────────────────

    /** GET /admin/inventory/reasons */
    public function reasonsList(): void
    {
        AuthMiddleware::require();

        $stmt = $this->pdo->prepare(
            'SELECT * FROM inventory_reasons WHERE company_id = :cid ORDER BY type ASC, name ASC'
        );
        $stmt->execute([':cid' => $this->companyId]);
        Response::success($stmt->fetchAll());
    }

    /** POST /admin/inventory/reasons */
    public function reasonsStore(): void
    {
        AuthMiddleware::require();

        $data = $this->parseInput();
        if (empty($data['name'])) Response::error('El nombre es requerido.', 422);

        $stmt = $this->pdo->prepare(
            'INSERT INTO inventory_reasons (company_id, name, type, allows_custom_text, is_sale, active)
             VALUES (:cid, :name, :type, :custom, :is_sale, :active)'
        );
        $stmt->execute([
            ':cid'     => $this->companyId,
            ':name'    => trim($data['name']),
            ':type'    => in_array($data['type'] ?? '', ['entrada','salida','ambos'])
                             ? $data['type'] : 'ambos',
            ':custom'  => isset($data['allows_custom_text']) ? (int)(bool)$data['allows_custom_text'] : 0,
            ':is_sale' => isset($data['is_sale']) ? (int)(bool)$data['is_sale'] : 0,
            ':active'  => isset($data['active']) ? (int)(bool)$data['active'] : 1,
        ]);

        $id = (int)$this->pdo->lastInsertId();
        $reason = $this->pdo->prepare('SELECT * FROM inventory_reasons WHERE id = :id LIMIT 1');
        $reason->execute([':id' => $id]);
        Response::success($reason->fetch(), 'Motivo creado.', 201);
    }

    /** PUT /admin/inventory/reasons/:id */
    public function reasonsUpdate(int $id): void
    {
        AuthMiddleware::require();
        $this->findReasonOrFail($id);

        $data   = $this->parseInput();
        $fields = [];
        $params = [':id' => $id, ':cid' => $this->companyId];

        if (isset($data['name'])) {
            $fields[] = 'name = :name';
            $params[':name'] = trim($data['name']);
        }
        if (isset($data['type']) && in_array($data['type'], ['entrada','salida','ambos'])) {
            $fields[] = 'type = :type';
            $params[':type'] = $data['type'];
        }
        if (isset($data['allows_custom_text'])) {
            $fields[] = 'allows_custom_text = :custom';
            $params[':custom'] = (int)(bool)$data['allows_custom_text'];
        }
        if (isset($data['active'])) {
            $fields[] = 'active = :active';
            $params[':active'] = (int)(bool)$data['active'];
        }
        if (isset($data['is_sale'])) {
            $fields[] = 'is_sale = :is_sale';
            $params[':is_sale'] = (int)(bool)$data['is_sale'];
        }

        if (!empty($fields)) {
            $this->pdo->prepare(
                'UPDATE inventory_reasons SET ' . implode(', ', $fields) .
                ' WHERE id = :id AND company_id = :cid'
            )->execute($params);
        }

        $reason = $this->pdo->prepare('SELECT * FROM inventory_reasons WHERE id = :id LIMIT 1');
        $reason->execute([':id' => $id]);
        Response::success($reason->fetch(), 'Motivo actualizado.');
    }

    /** DELETE /admin/inventory/reasons/:id */
    public function reasonsDestroy(int $id): void
    {
        AuthMiddleware::require();
        $this->findReasonOrFail($id);

        $this->pdo->prepare(
            'DELETE FROM inventory_reasons WHERE id = :id AND company_id = :cid'
        )->execute([':id' => $id, ':cid' => $this->companyId]);

        Response::success(null, 'Motivo eliminado.');
    }

    // ── MOVEMENTS ────────────────────────────────────────────

    /** GET /admin/inventory/movements */
    public function movementsList(): void
    {
        AuthMiddleware::require();

        $page      = max(1, (int)($_GET['page']       ?? 1));
        $perPage   = min(100, max(1, (int)($_GET['per_page'] ?? 30)));
        $offset    = ($page - 1) * $perPage;
        $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;
        $type      = $_GET['type']      ?? '';
        $reasonId  = isset($_GET['reason_id']) ? (int)$_GET['reason_id'] : null;
        $dateFrom  = $_GET['date_from'] ?? '';
        $dateTo    = $_GET['date_to']   ?? '';

        [$where, $params] = $this->buildMovementsWhere($productId, $type, $reasonId, $dateFrom, $dateTo);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM inventory_movements m WHERE {$where}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql = "SELECT m.*,
                       p.name AS product_name, p.sku AS product_sku,
                       r.name AS reason_name,
                       u.name AS created_by_name
                FROM inventory_movements m
                LEFT JOIN products p ON p.id = m.product_id
                LEFT JOIN inventory_reasons r ON r.id = m.reason_id
                LEFT JOIN users u ON u.id = m.created_by
                WHERE {$where}
                ORDER BY m.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();

        Response::paginated($stmt->fetchAll(), $total, $page, $perPage);
    }

    /** DELETE /admin/inventory/movements/:id */
    public function movementsDestroy(int $id): void
    {
        AuthMiddleware::requireRole('admin');

        $stmt = $this->pdo->prepare(
            'SELECT * FROM inventory_movements WHERE id = :id AND company_id = :cid LIMIT 1'
        );
        $stmt->execute([':id' => $id, ':cid' => $this->companyId]);
        $movement = $stmt->fetch();
        if (!$movement) Response::error('Movimiento no encontrado.', 404);

        $productId = (int)$movement['product_id'];
        $size      = $movement['size'];
        $netChange = (float)$movement['stock_after'] - (float)$movement['stock_before'];

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare(
                'DELETE FROM inventory_movements WHERE id = :id AND company_id = :cid'
            )->execute([':id' => $id, ':cid' => $this->companyId]);

            $pStmt = $this->pdo->prepare(
                'SELECT stock, sizes_enabled FROM products WHERE id = :id AND company_id = :cid LIMIT 1'
            );
            $pStmt->execute([':id' => $productId, ':cid' => $this->companyId]);
            $product = $pStmt->fetch();

            if ($product && $netChange != 0) {
                if ($size) {
                    $ssStmt = $this->pdo->prepare(
                        'SELECT stock FROM product_size_stocks WHERE product_id = :pid AND size = :size LIMIT 1'
                    );
                    $ssStmt->execute([':pid' => $productId, ':size' => $size]);
                    $currentSizeStock = (float)($ssStmt->fetchColumn() ?: 0);
                    $newSizeStock = max(0, $currentSizeStock - $netChange);

                    $this->pdo->prepare(
                        'UPDATE product_size_stocks SET stock = :stock WHERE product_id = :pid AND size = :size'
                    )->execute([':stock' => $newSizeStock, ':pid' => $productId, ':size' => $size]);

                    $sumStmt = $this->pdo->prepare(
                        'SELECT COALESCE(SUM(stock), 0) FROM product_size_stocks WHERE product_id = :pid'
                    );
                    $sumStmt->execute([':pid' => $productId]);
                    $totalStock = (float)$sumStmt->fetchColumn();

                    $this->pdo->prepare(
                        'UPDATE products SET stock = :stock WHERE id = :id AND company_id = :cid'
                    )->execute([':stock' => $totalStock, ':id' => $productId, ':cid' => $this->companyId]);
                } else {
                    $newStock = max(0, (float)$product['stock'] - $netChange);
                    $this->pdo->prepare(
                        'UPDATE products SET stock = :stock WHERE id = :id AND company_id = :cid'
                    )->execute([':stock' => $newStock, ':id' => $productId, ':cid' => $this->companyId]);
                }
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        Response::success(null, 'Movimiento eliminado y stock ajustado.');
    }

    /** POST /admin/inventory/movements */
    public function movementsStore(): void
    {
        AuthMiddleware::require();

        $data   = $this->parseInput();
        $errors = [];

        if (empty($data['product_id'])) $errors[] = 'El producto es requerido.';
        if (empty($data['type']) || !in_array($data['type'], ['entrada','salida','ajuste']))
            $errors[] = 'El tipo debe ser entrada, salida o ajuste.';
        if (!isset($data['quantity']) || !is_numeric($data['quantity']) || (float)$data['quantity'] <= 0)
            $errors[] = 'La cantidad debe ser un número positivo.';
        if (!empty($errors)) Response::error('Datos inválidos.', 422, $errors);

        $productId = (int)$data['product_id'];
        $qty       = (float)$data['quantity'];
        $type      = $data['type'];
        $size      = isset($data['size']) && trim((string)$data['size']) !== '' ? trim($data['size']) : null;

        $pStmt = $this->pdo->prepare(
            'SELECT id, stock, sizes_enabled, price FROM products WHERE id = :id AND company_id = :cid LIMIT 1'
        );
        $pStmt->execute([':id' => $productId, ':cid' => $this->companyId]);
        $product = $pStmt->fetch();
        if (!$product) Response::error('Producto no encontrado.', 404);

        $hasSizes = (bool)($product['sizes_enabled'] ?? false);
        if ($hasSizes && !$size) {
            Response::error('Este producto tiene tallas. Debe seleccionar una talla.', 422);
        }

        // Validar reason_id y detectar si es venta
        $reasonId  = null;
        $isSale    = false;
        $salePrice = null;
        $saleTotal = null;

        if (!empty($data['reason_id'])) {
            $rStmt = $this->pdo->prepare(
                'SELECT id, is_sale FROM inventory_reasons WHERE id = :id AND company_id = :cid AND active = 1 LIMIT 1'
            );
            $rStmt->execute([':id' => (int)$data['reason_id'], ':cid' => $this->companyId]);
            $reason = $rStmt->fetch();
            if ($reason) {
                $reasonId = (int)$reason['id'];
                $isSale   = (bool)$reason['is_sale'];
            }
        }

        if ($isSale && $type === 'salida') {
            $salePrice = !empty($data['sale_price']) && is_numeric($data['sale_price'])
                ? (float)$data['sale_price']
                : (float)$product['price'];
            $saleTotal = $salePrice * $qty;
        }

        $user = AuthMiddleware::getUser();

        $this->pdo->beginTransaction();
        try {
            if ($hasSizes && $size) {
                // Movimiento por talla
                $ssStmt = $this->pdo->prepare(
                    'SELECT stock FROM product_size_stocks WHERE product_id = :pid AND size = :size LIMIT 1'
                );
                $ssStmt->execute([':pid' => $productId, ':size' => $size]);
                $sizeRow     = $ssStmt->fetch();
                $stockBefore = $sizeRow ? (float)$sizeRow['stock'] : 0;

                if ($type === 'entrada')     $stockAfter = $stockBefore + $qty;
                elseif ($type === 'salida')  $stockAfter = $stockBefore - $qty;
                else                         $stockAfter = $qty;

                $this->pdo->prepare(
                    'INSERT INTO product_size_stocks (product_id, size, stock)
                     VALUES (:pid, :size, :stock)
                     ON DUPLICATE KEY UPDATE stock = :stock2'
                )->execute([':pid' => $productId, ':size' => $size,
                             ':stock' => $stockAfter, ':stock2' => $stockAfter]);

                // Calcular total sumando todas las tallas (sin subquery)
                $sumStmt = $this->pdo->prepare(
                    'SELECT COALESCE(SUM(stock), 0) FROM product_size_stocks WHERE product_id = :pid'
                );
                $sumStmt->execute([':pid' => $productId]);
                $totalStock = (float)$sumStmt->fetchColumn();

                $this->pdo->prepare(
                    'UPDATE products SET stock = :stock WHERE id = :id AND company_id = :cid'
                )->execute([':stock' => $totalStock, ':id' => $productId, ':cid' => $this->companyId]);

            } else {
                // Movimiento sin tallas
                $stockBefore = (float)($product['stock'] ?? 0);
                if ($type === 'entrada')    $stockAfter = $stockBefore + $qty;
                elseif ($type === 'salida') $stockAfter = $stockBefore - $qty;
                else                        $stockAfter = $qty;

                $this->pdo->prepare(
                    'UPDATE products SET stock = :stock WHERE id = :id AND company_id = :cid'
                )->execute([':stock' => $stockAfter, ':id' => $productId, ':cid' => $this->companyId]);
            }

            // Registrar movimiento
            $this->pdo->prepare(
                'INSERT INTO inventory_movements
                    (company_id, product_id, size, type, reason_id, reason_custom, quantity,
                     stock_before, stock_after, notes, created_by, sale_price, sale_total)
                 VALUES
                    (:cid, :pid, :size, :type, :rid, :rtext, :qty,
                     :qbefore, :qafter, :notes, :uid, :sprice, :stotal)'
            )->execute([
                ':cid'    => $this->companyId,
                ':pid'    => $productId,
                ':size'   => $size,
                ':type'   => $type,
                ':rid'    => $reasonId,
                ':rtext'  => $data['reason_text'] ?? null,
                ':qty'    => $qty,
                ':qbefore'=> $stockBefore,
                ':qafter' => $stockAfter,
                ':notes'  => $data['notes'] ?? null,
                ':uid'    => $user['id'] ?? null,
                ':sprice' => $salePrice,
                ':stotal' => $saleTotal,
            ]);

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        Response::success(
            ['size' => $size, 'stock_before' => $stockBefore, 'stock_after' => $stockAfter],
            'Movimiento registrado.',
            201
        );
    }

    // ── STOCK SUMMARY ────────────────────────────────────────

    /** GET /admin/inventory/stock */
    public function stockSummary(): void
    {
        AuthMiddleware::require();

        $search  = trim($_GET['search'] ?? '');
        $catId   = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;
        $lowOnly = isset($_GET['low_stock']) && $_GET['low_stock'] === '1';

        $where  = ['p.company_id = :cid'];
        $params = [':cid' => $this->companyId];

        if ($catId !== null) {
            $where[] = 'p.category_id = :cat';
            $params[':cat'] = $catId;
        }
        if ($search !== '') {
            $where[] = '(p.name LIKE :s1 OR p.sku LIKE :s2)';
            $params[':s1'] = "%{$search}%";
            $params[':s2'] = "%{$search}%";
        }
        if ($lowOnly) {
            $where[] = 'p.stock IS NOT NULL AND p.stock <= 5';
        }

        $whereStr = implode(' AND ', $where);

        $stmt = $this->pdo->prepare(
            "SELECT p.id, p.name, p.sku, p.stock, p.active, p.sizes_enabled, p.sizes,
                    c.name AS category_name,
                    (SELECT COUNT(*) FROM inventory_movements m
                     WHERE m.product_id = p.id AND m.company_id = :cid2) AS total_movements
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE {$whereStr}
             ORDER BY p.name ASC"
        );
        $params[':cid2'] = $this->companyId;
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Enrich sized products with per-size stocks
        if (!empty($products)) {
            $ids          = array_column($products, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $ssStmt       = $this->pdo->prepare(
                "SELECT product_id, size, stock FROM product_size_stocks
                 WHERE product_id IN ({$placeholders}) ORDER BY product_id ASC"
            );
            $ssStmt->execute(array_values($ids));
            $ssMap = [];
            foreach ($ssStmt->fetchAll() as $ss) {
                $ssMap[$ss['product_id']][$ss['size']] = (int)$ss['stock'];
            }

            $products = array_map(function ($p) use ($ssMap) {
                $sizes = !empty($p['sizes']) && is_string($p['sizes'])
                    ? (json_decode($p['sizes'], true) ?? [])
                    : [];
                $p['sizes'] = $sizes;
                if ($p['sizes_enabled'] && !empty($sizes)) {
                    $sMap = $ssMap[$p['id']] ?? [];
                    $p['size_stocks'] = array_map(fn($s) => [
                        'size'  => $s,
                        'stock' => $sMap[$s] ?? 0,
                    ], $sizes);
                } else {
                    $p['size_stocks'] = [];
                }
                return $p;
            }, $products);
        }

        // Totals
        $totalStmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total_products,
                    SUM(COALESCE(stock, 0)) AS total_units,
                    SUM(CASE WHEN stock IS NOT NULL AND stock <= 5 THEN 1 ELSE 0 END) AS low_stock_count
             FROM products WHERE company_id = :cid'
        );
        $totalStmt->execute([':cid' => $this->companyId]);
        $totals = $totalStmt->fetch();

        Response::success(['products' => $products, 'totals' => $totals]);
    }

    // ── REPORT ───────────────────────────────────────────────

    /** GET /admin/inventory/report */
    public function report(): void
    {
        AuthMiddleware::require();

        $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
        $dateTo   = $_GET['date_to']   ?? date('Y-m-d');

        $params = [
            ':cid'  => $this->companyId,
            ':from' => $dateFrom . ' 00:00:00',
            ':to'   => $dateTo   . ' 23:59:59',
        ];

        // Totals by type
        $byType = $this->pdo->prepare(
            'SELECT type,
                    COUNT(*) AS movements,
                    SUM(quantity) AS total_qty
             FROM inventory_movements
             WHERE company_id = :cid AND created_at BETWEEN :from AND :to
             GROUP BY type'
        );
        $byType->execute($params);

        // Top products by activity
        $byProduct = $this->pdo->prepare(
            "SELECT m.product_id, p.name AS product_name, p.sku,
                    COUNT(*) AS movements,
                    SUM(CASE WHEN m.type = 'entrada' THEN m.quantity ELSE 0 END) AS entradas,
                    SUM(CASE WHEN m.type = 'salida'  THEN m.quantity ELSE 0 END) AS salidas,
                    p.stock AS current_stock
             FROM inventory_movements m
             LEFT JOIN products p ON p.id = m.product_id
             WHERE m.company_id = :cid AND m.created_at BETWEEN :from AND :to
             GROUP BY m.product_id, p.name, p.sku, p.stock
             ORDER BY COUNT(*) DESC
             LIMIT 20"
        );
        $byProduct->execute($params);

        // Movements by reason
        $byReason = $this->pdo->prepare(
            "SELECT COALESCE(r.name, m.reason_custom, 'Sin motivo') AS reason,
                    m.type, COUNT(*) AS movements, SUM(m.quantity) AS total_qty
             FROM inventory_movements m
             LEFT JOIN inventory_reasons r ON r.id = m.reason_id
             WHERE m.company_id = :cid AND m.created_at BETWEEN :from AND :to
             GROUP BY COALESCE(r.name, m.reason_custom, 'Sin motivo'), m.type
             ORDER BY COUNT(*) DESC"
        );
        $byReason->execute($params);

        // Daily activity
        $daily = $this->pdo->prepare(
            "SELECT DATE(created_at) AS day,
                    SUM(CASE WHEN type = 'entrada' THEN quantity ELSE 0 END) AS entradas,
                    SUM(CASE WHEN type = 'salida'  THEN quantity ELSE 0 END) AS salidas,
                    COUNT(*) AS movements
             FROM inventory_movements
             WHERE company_id = :cid AND created_at BETWEEN :from AND :to
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at) ASC"
        );
        $daily->execute($params);

        Response::success([
            'period'     => ['from' => $dateFrom, 'to' => $dateTo],
            'by_type'    => $byType->fetchAll(),
            'by_product' => $byProduct->fetchAll(),
            'by_reason'  => $byReason->fetchAll(),
            'daily'      => $daily->fetchAll(),
        ]);
    }

    // ── SALES REPORT ────────────────────────────────────────────

    /** GET /admin/inventory/sales-report */
    public function salesReport(): void
    {
        AuthMiddleware::require();

        $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
        $dateTo   = $_GET['date_to']   ?? date('Y-m-d');

        $params = [
            ':cid'  => $this->companyId,
            ':from' => $dateFrom . ' 00:00:00',
            ':to'   => $dateTo   . ' 23:59:59',
        ];

        // Resumen general
        $summary = $this->pdo->prepare(
            "SELECT COUNT(*)           AS total_sales,
                    SUM(quantity)      AS total_units,
                    SUM(sale_total)    AS total_revenue,
                    MAX(sale_total)    AS max_sale
             FROM inventory_movements
             WHERE company_id = :cid
               AND created_at BETWEEN :from AND :to
               AND sale_total IS NOT NULL"
        );
        $summary->execute($params);
        $summaryData = $summary->fetch();

        // Top productos por ingreso
        $topProducts = $this->pdo->prepare(
            "SELECT m.product_id,
                    p.name AS product_name, p.sku,
                    SUM(m.quantity)   AS units_sold,
                    SUM(m.sale_total) AS revenue,
                    COUNT(*)          AS sales_count
             FROM inventory_movements m
             LEFT JOIN products p ON p.id = m.product_id
             WHERE m.company_id = :cid
               AND m.created_at BETWEEN :from AND :to
               AND m.sale_total IS NOT NULL
             GROUP BY m.product_id, p.name, p.sku
             ORDER BY SUM(m.sale_total) DESC
             LIMIT 10"
        );
        $topProducts->execute($params);

        // Ingresos diarios
        $daily = $this->pdo->prepare(
            "SELECT DATE(created_at)   AS day,
                    COUNT(*)           AS sales_count,
                    SUM(quantity)      AS units_sold,
                    SUM(sale_total)    AS revenue
             FROM inventory_movements
             WHERE company_id = :cid
               AND created_at BETWEEN :from AND :to
               AND sale_total IS NOT NULL
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at) ASC"
        );
        $daily->execute($params);

        Response::success([
            'period'       => ['from' => $dateFrom, 'to' => $dateTo],
            'summary'      => $summaryData,
            'top_products' => $topProducts->fetchAll(),
            'daily'        => $daily->fetchAll(),
        ]);
    }

    // ── PRIVATE ──────────────────────────────────────────────

    private function findReasonOrFail(int $id): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM inventory_reasons WHERE id = :id AND company_id = :cid LIMIT 1'
        );
        $stmt->execute([':id' => $id, ':cid' => $this->companyId]);
        $r = $stmt->fetch();
        if (!$r) Response::error('Motivo no encontrado.', 404);
        return $r;
    }

    private function buildMovementsWhere(
        ?int $productId, string $type, ?int $reasonId, string $dateFrom, string $dateTo
    ): array {
        $where  = ['m.company_id = :cid'];
        $params = [':cid' => $this->companyId];

        if ($productId !== null) {
            $where[] = 'm.product_id = :pid';
            $params[':pid'] = $productId;
        }
        if (in_array($type, ['entrada','salida','ajuste'])) {
            $where[] = 'm.type = :type';
            $params[':type'] = $type;
        }
        if ($reasonId !== null) {
            $where[] = 'm.reason_id = :rid';
            $params[':rid'] = $reasonId;
        }
        if ($dateFrom !== '') {
            $where[] = 'm.created_at >= :from';
            $params[':from'] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo !== '') {
            $where[] = 'm.created_at <= :to';
            $params[':to'] = $dateTo . ' 23:59:59';
        }

        return [implode(' AND ', $where), $params];
    }

    private function parseInput(): array
    {
        $ct = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains($ct, 'application/json')) {
            return (array)json_decode(file_get_contents('php://input'), true);
        }
        return $_POST;
    }
}
