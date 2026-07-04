<?php
// helpers/Upload.php

class Upload
{
    private static array $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private static int   $maxSize      = 5242880; // 5MB

    public static function image(array $file, string $folder = 'products'): string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Error al subir archivo: código ' . $file['error']);
        }

        $allowedTypes = array_map('trim', explode(',', $_ENV['ALLOWED_IMAGE_TYPES'] ?? implode(',', self::$allowedTypes)));
        $maxSize      = (int)($_ENV['MAX_FILE_SIZE'] ?? self::$maxSize);

        if ($file['size'] > $maxSize) {
            throw new RuntimeException('El archivo excede el tamaño máximo de ' . ($maxSize / 1024 / 1024) . 'MB');
        }

        // Verificar MIME real (no confiar en el del cliente)
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, $allowedTypes, true)) {
            throw new RuntimeException("Tipo de archivo no permitido: {$mimeType}");
        }

        $ext       = self::mimeToExt($mimeType);
        $filename  = uniqid('img_', true) . '.' . $ext;
        $uploadDir = rtrim($_ENV['UPLOAD_PATH'] ?? 'uploads/', '/') . '/' . $folder . '/';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $destination = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException('No se pudo mover el archivo subido');
        }

        return $folder . '/' . $filename;
    }

    public static function delete(string $relativePath): void
    {
        $full = rtrim($_ENV['UPLOAD_PATH'] ?? 'uploads/', '/') . '/' . $relativePath;
        if (file_exists($full)) {
            @unlink($full);
        }
    }

    private static function mimeToExt(string $mime): string
    {
        return match($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
            default      => 'jpg',
        };
    }
}
