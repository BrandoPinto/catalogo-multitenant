<?php
// index.php - Entry point

declare(strict_types=1);

// ── Carga de variables de entorno ────────────────────────────
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
        putenv(trim($key) . '=' . trim($val));
    }
}

// ── Configuración de errores ─────────────────────────────────
$isProduction = ($_ENV['APP_ENV'] ?? 'production') === 'production';
if ($isProduction) {
    ini_set('display_errors', '0');
    error_reporting(0);
} else {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
}

// ── Zona horaria ─────────────────────────────────────────────
date_default_timezone_set('America/Lima');

// ── CORS ─────────────────────────────────────────────────────
$allowedOrigins = array_map('trim', explode(',', $_ENV['CORS_ORIGINS'] ?? '*'));
$origin         = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
} else {
    header('Access-Control-Allow-Origin: ' . ($allowedOrigins[0] ?? '*'));
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-Slug, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Autoload ─────────────────────────────────────────────────
$autoloadDirs = [
    __DIR__ . '/config',
    __DIR__ . '/helpers',
    __DIR__ . '/middlewares',
    __DIR__ . '/controllers',
    __DIR__ . '/routes',
];

spl_autoload_register(function (string $class) use ($autoloadDirs) {
    foreach ($autoloadDirs as $dir) {
        $file = $dir . '/' . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// ── Manejador global de excepciones ─────────────────────────
set_exception_handler(function (Throwable $e) {
    $isProduction = ($_ENV['APP_ENV'] ?? 'production') === 'production';
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');

    $response = ['success' => false, 'message' => 'Error interno del servidor.'];
    if (!$isProduction) {
        $response['debug'] = [
            'exception' => get_class($e),
            'message'   => $e->getMessage(),
            'file'      => $e->getFile(),
            'line'      => $e->getLine(),
        ];
    }
    echo json_encode($response);
    exit;
});

// ── Parsear body en PUT/PATCH (PHP no llena $_POST automáticamente) ──
if (in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'])) {
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ct, 'multipart/form-data')) {
        preg_match('/boundary=(.+)$/i', $ct, $m);
        if (!empty($m[1])) {
            $boundary = trim($m[1], '"');
            $raw      = file_get_contents('php://input');
            foreach (array_slice(explode('--' . $boundary, $raw), 1) as $part) {
                if (!str_contains($part, 'Content-Disposition')) continue;
                [$hdrs, $val] = explode("\r\n\r\n", $part, 2);
                if (str_contains($hdrs, 'filename=')) continue; // skip files
                preg_match('/name="([^"]+)"/', $hdrs, $nm);
                if (isset($nm[1])) $_POST[$nm[1]] = rtrim($val, "\r\n");
            }
        }
    } elseif (str_contains($ct, 'application/x-www-form-urlencoded')) {
        parse_str(file_get_contents('php://input'), $parsed);
        $_POST = array_merge($_POST, $parsed);
    }
}

// ── Middleware multi-tenant (SIEMPRE primero) ────────────────
TenantMiddleware::resolve();

// ── Router ───────────────────────────────────────────────────
$router = new Router();
require_once __DIR__ . '/routes/api.php';
$router->dispatch();
