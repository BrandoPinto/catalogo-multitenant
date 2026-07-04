<?php
// middlewares/TenantMiddleware.php

/**
 * MIDDLEWARE MULTI-TENANT
 * 
 * Detecta automáticamente la empresa (tenant) basándose en el subdominio.
 * Guarda el company_id en una variable global para todas las consultas.
 * 
 * Flujo:
 *   1. Leer Host header  →  empresa1.midominio.com
 *   2. Extraer subdominio →  empresa1
 *   3. Buscar en companies.slug → obtener company_id
 *   4. Guardar en $GLOBALS['company_id']
 */
class TenantMiddleware
{
    private static ?int    $companyId   = null;
    private static ?array  $company     = null;

    public static function resolve(): void
    {
        $pdo  = Database::getInstance();
        $slug = self::extractSubdomain();

        if ($slug === null) {
            // En desarrollo local o sin subdominio: usar header X-Company-Slug
            $slug = $_SERVER['HTTP_X_COMPANY_SLUG'] ?? null;

            // Fallback: parámetro GET ?company=slug (SOLO en dev)
            if ($slug === null && ($_ENV['APP_ENV'] ?? 'production') === 'development') {
                $slug = $_GET['company'] ?? null;
            }

            if ($slug === null) {
                Response::error('Empresa no identificada. Subdominio requerido.', 400);
            }
        }

        $stmt = $pdo->prepare(
            'SELECT * FROM companies WHERE slug = :slug AND active = 1 LIMIT 1'
        );
        $stmt->execute([':slug' => strtolower(trim($slug))]);
        $company = $stmt->fetch();

        if (!$company) {
            Response::error("Empresa '{$slug}' no encontrada o inactiva.", 404);
        }

        self::$companyId = (int)$company['id'];
        self::$company   = $company;

        // Disponible globalmente
        $GLOBALS['company_id'] = self::$companyId;
        $GLOBALS['company']    = self::$company;
    }

    public static function getCompanyId(): int
    {
        if (self::$companyId === null) {
            throw new RuntimeException('TenantMiddleware::resolve() no fue llamado');
        }
        return self::$companyId;
    }

    public static function getCompany(): array
    {
        if (self::$company === null) {
            throw new RuntimeException('TenantMiddleware::resolve() no fue llamado');
        }
        return self::$company;
    }

    /**
     * Extrae el subdominio del Host header.
     * empresa1.midominio.com → empresa1
     * www.midominio.com      → null (ignorar www)
     * localhost              → null
     */
    private static function extractSubdomain(): ?string
    {
        $host       = strtolower($_SERVER['HTTP_HOST'] ?? '');
        $baseDomain = strtolower($_ENV['BASE_DOMAIN'] ?? '');

        // Quitar puerto si existe
        $host = preg_replace('/:\d+$/', '', $host);

        // Si no hay dominio base configurado, intentar detectar
        if ($baseDomain === '') {
            $parts = explode('.', $host);
            if (count($parts) < 2) return null; // localhost, etc.
            $sub = $parts[0];
            return ($sub === 'www' || $sub === 'api') ? null : $sub;
        }

        // Verificar que el host termina con el dominio base
        $suffix = '.' . $baseDomain;
        if (!str_ends_with($host, $suffix) && $host !== $baseDomain) {
            return null;
        }

        // Extraer subdominio
        if ($host === $baseDomain) return null;

        $sub = substr($host, 0, strlen($host) - strlen($suffix));
        if ($sub === '' || $sub === 'www' || $sub === 'api') return null;

        return $sub;
    }
}
