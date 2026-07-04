<?php
$envFile = __DIR__ . '/.env';
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
    [$k, $v] = explode('=', $line, 2);
    $_ENV[trim($k)] = trim($v);
}
$pdo = new PDO(
    "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
    $_ENV['DB_USER'], $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$tables = ['inventory_reasons', 'inventory_movements'];
foreach ($tables as $t) {
    try {
        $r = $pdo->query("DESCRIBE `$t`")->fetchAll(PDO::FETCH_COLUMN);
        echo "$t: OK — columns: " . implode(', ', $r) . "\n";
    } catch (Exception $e) {
        echo "$t: ERROR — " . $e->getMessage() . "\n";
    }
}
