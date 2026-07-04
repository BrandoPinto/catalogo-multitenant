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

// Mostrar columnas exactas
echo "=== inventory_reasons columns ===\n";
foreach ($pdo->query("DESCRIBE inventory_reasons") as $row) {
    echo "  {$row['Field']}  ({$row['Type']})  default={$row['Default']}\n";
}

echo "\n=== Test INSERT ===\n";
try {
    $pdo->prepare(
        'INSERT INTO inventory_reasons (company_id, name, type, allows_custom_text, active)
         VALUES (1, :name, :type, :custom, :active)'
    )->execute([':name' => 'Test', ':type' => 'salida', ':custom' => 1, ':active' => 1]);
    echo "INSERT OK — id: " . $pdo->lastInsertId() . "\n";
    $pdo->exec("DELETE FROM inventory_reasons WHERE name='Test'");
} catch (Exception $e) {
    echo "INSERT ERROR: " . $e->getMessage() . "\n";
}
