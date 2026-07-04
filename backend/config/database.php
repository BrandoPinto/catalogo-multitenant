<?php
// config/Database.php

class Database
{
    private static ?PDO $instance = null;

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $host    = $_ENV['DB_HOST']     ?? 'localhost';
            $dbname  = $_ENV['DB_NAME']     ?? 'catalog_multitenant';
            $user    = $_ENV['DB_USER']     ?? 'root';
            $pass    = $_ENV['DB_PASS']     ?? '';
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";

            self::$instance = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }

        return self::$instance;
    }

    private function __construct() {}
    private function __clone() {}
}
