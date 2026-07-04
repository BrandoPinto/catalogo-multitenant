<?php
// helpers/Slug.php

class Slug
{
    public static function make(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');

        // Reemplazar caracteres con tilde
        $map = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ñ' => 'n', 'ü' => 'u', 'ä' => 'a', 'ö' => 'o',
            'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u',
            'â' => 'a', 'ê' => 'e', 'î' => 'i', 'ô' => 'o', 'û' => 'u',
        ];
        $text = strtr($text, $map);

        // Reemplazar no alfanuméricos con guión
        $text = preg_replace('/[^a-z0-9]+/', '-', $text);
        return trim($text, '-');
    }

    /**
     * Genera slug único asegurando que no exista en tabla/columna/condición
     */
    public static function unique(string $text, PDO $pdo, string $table, string $column, array $where = [], ?int $excludeId = null): string
    {
        $base = self::make($text);
        $slug = $base;
        $i    = 1;

        do {
            $conditions = ["{$column} = :slug"];
            $params     = [':slug' => $slug];

            foreach ($where as $col => $val) {
                $key               = ':' . $col;
                $conditions[]      = "{$col} = {$key}";
                $params[$key]      = $val;
            }

            if ($excludeId !== null) {
                $conditions[] = 'id != :excl_id';
                $params[':excl_id'] = $excludeId;
            }

            $sql   = "SELECT id FROM {$table} WHERE " . implode(' AND ', $conditions) . " LIMIT 1";
            $stmt  = $pdo->prepare($sql);
            $stmt->execute($params);
            $exists = $stmt->fetchColumn();

            if (!$exists) break;

            $slug = $base . '-' . $i++;
        } while (true);

        return $slug;
    }
}
