<?php
// Router para PHP built-in server (reemplaza el .htaccess)
if (preg_match('/^\/uploads\//', $_SERVER['REQUEST_URI'])) {
    return false; // servir archivos de uploads directamente
}
require __DIR__ . '/index.php';
