-- ============================================================
-- MULTI-TENANT CATALOG SYSTEM - DATABASE SCHEMA
-- ============================================================

CREATE DATABASE IF NOT EXISTS catalog_multitenant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE catalog_multitenant;

-- ============================================================
-- COMPANIES (tenants)
-- ============================================================
CREATE TABLE companies (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(80)  NOT NULL UNIQUE COMMENT 'Subdominio único',
  logo          VARCHAR(255) DEFAULT NULL,
  primary_color VARCHAR(7)   NOT NULL DEFAULT '#3B82F6' COMMENT 'Hex color',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#1E40AF',
  description   TEXT         DEFAULT NULL,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- USERS (admins por empresa)
-- ============================================================
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    INT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(200) NOT NULL,
  password      VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  role          ENUM('admin','editor') NOT NULL DEFAULT 'admin',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_company (email, company_id),
  INDEX idx_company (company_id),
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    INT UNSIGNED NOT NULL,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(120) NOT NULL,
  description   TEXT         DEFAULT NULL,
  image         VARCHAR(255) DEFAULT NULL,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slug_company (slug, company_id),
  INDEX idx_company (company_id),
  CONSTRAINT fk_categories_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    INT UNSIGNED NOT NULL,
  category_id   INT UNSIGNED DEFAULT NULL,
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(220) NOT NULL,
  description   TEXT         DEFAULT NULL,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  compare_price DECIMAL(10,2) DEFAULT NULL COMMENT 'Precio tachado anterior',
  sku           VARCHAR(100) DEFAULT NULL,
  stock         INT          DEFAULT NULL COMMENT 'NULL = sin control de stock',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  featured      TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slug_company (slug, company_id),
  INDEX idx_company (company_id),
  INDEX idx_company_active (company_id, active),
  INDEX idx_company_featured (company_id, featured),
  INDEX idx_category (category_id),
  CONSTRAINT fk_products_company  FOREIGN KEY (company_id)  REFERENCES companies(id)   ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE product_images (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    INT UNSIGNED NOT NULL,
  url           VARCHAR(255) NOT NULL,
  alt           VARCHAR(200) DEFAULT NULL,
  sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BANNERS
-- ============================================================
CREATE TABLE banners (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    INT UNSIGNED NOT NULL,
  title         VARCHAR(200) DEFAULT NULL,
  subtitle      VARCHAR(300) DEFAULT NULL,
  image         VARCHAR(255) NOT NULL,
  link_url      VARCHAR(500) DEFAULT NULL,
  link_text     VARCHAR(100) DEFAULT NULL,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  CONSTRAINT fk_banners_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEEDERS - Datos de prueba
-- ============================================================

-- Empresa 1: Moda Femenina
INSERT INTO companies (name, slug, primary_color, secondary_color, description) VALUES
('Elegance Moda', 'elegance', '#E91E8C', '#AD1457', 'Ropa y accesorios femeninos de alta gama'),
('TechStore Pro',  'techstore', '#1976D2', '#0D47A1', 'Electrónica y gadgets para profesionales');

-- Usuarios admin (password: Admin1234! → bcrypt)
-- Hash generado: $2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO users (company_id, name, email, password, role) VALUES
(1, 'Admin Elegance', 'admin@elegance.com',  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
(2, 'Admin TechStore','admin@techstore.com', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Categorías Empresa 1
INSERT INTO categories (company_id, name, slug, sort_order) VALUES
(1, 'Vestidos',    'vestidos',    1),
(1, 'Blusas',      'blusas',      2),
(1, 'Pantalones',  'pantalones',  3),
(1, 'Accesorios',  'accesorios',  4);

-- Categorías Empresa 2
INSERT INTO categories (company_id, name, slug, sort_order) VALUES
(2, 'Smartphones',  'smartphones',  1),
(2, 'Laptops',      'laptops',      2),
(2, 'Auriculares',  'auriculares',  3),
(2, 'Accesorios',   'accesorios',   4);

-- Productos Empresa 1
INSERT INTO products (company_id, category_id, name, slug, description, price, compare_price, featured, active) VALUES
(1, 1, 'Vestido Floral Primavera',    'vestido-floral-primavera',   'Vestido midi floral perfecto para eventos de día. Tela ligera y fresca.', 129.99, 179.99, 1, 1),
(1, 1, 'Vestido Noche Elegante',      'vestido-noche-elegante',     'Vestido largo negro ideal para cenas y eventos formales.',               249.99, NULL,   1, 1),
(1, 2, 'Blusa Seda Natural',          'blusa-seda-natural',         'Blusa de seda 100% natural. Suave y sofisticada.',                       89.99, 110.00, 0, 1),
(1, 2, 'Blusa Estampada Bohemia',     'blusa-estampada-bohemia',    'Blusa con estampados étnicos, corte holgado y cómodo.',                  65.00, NULL,   0, 1),
(1, 3, 'Pantalón Wide Leg Beige',     'pantalon-wide-leg-beige',    'Pantalón de pierna ancha en tono beige. Muy versátil.',                  99.99, 130.00, 1, 1),
(1, 3, 'Jean Skinny Premium',         'jean-skinny-premium',        'Jean skinny con tiro alto. Corte favorecedor para todo tipo de cuerpo.', 119.00, NULL,  0, 1),
(1, 4, 'Bolso Cuero Italiano',        'bolso-cuero-italiano',       'Bolso de cuero genuino importado de Italia.',                           199.99, 280.00, 1, 1),
(1, 4, 'Cinturón Dorado Fino',        'cinturon-dorado-fino',       'Cinturón fino con hebilla dorada. Complemento ideal.',                   45.00, NULL,   0, 1);

-- Productos Empresa 2
INSERT INTO products (company_id, category_id, name, slug, description, price, compare_price, featured, active) VALUES
(2, 5, 'iPhone 16 Pro 256GB',         'iphone-16-pro-256gb',        'El último iPhone con chip A18 Pro y sistema de cámaras avanzado.',     1299.99, NULL,   1, 1),
(2, 5, 'Samsung Galaxy S25 Ultra',    'samsung-galaxy-s25-ultra',   'Pantalla AMOLED 6.9", S Pen incluido, 200MP de cámara.',               1199.00, 1350.00, 1, 1),
(2, 6, 'MacBook Pro M4 14"',          'macbook-pro-m4-14',          'Chip M4, 16GB RAM, 512GB SSD. Potencia profesional en formato compacto.', 1999.00, NULL, 1, 1),
(2, 6, 'Dell XPS 15 OLED',            'dell-xps-15-oled',           'Pantalla OLED 3.5K, Intel Core Ultra 7, RTX 4060.',                    1799.99, 2100.00, 0, 1),
(2, 7, 'Sony WH-1000XM6',             'sony-wh-1000xm6',            'Cancelación de ruido líder en la industria. 30h de batería.',           349.99, 399.99, 1, 1),
(2, 7, 'AirPods Pro 3ra Gen',         'airpods-pro-3ra-gen',        'Audio espacial adaptativo y cancelación de ruido activa.',              279.00, NULL,   0, 1),
(2, 8, 'Hub USB-C 12 en 1',           'hub-usb-c-12-en-1',          'Hub con HDMI 4K, 3x USB-A, 2x USB-C, SD, Ethernet y más.',              79.99, 99.99,  0, 1),
(2, 8, 'Cargador GaN 140W',           'cargador-gan-140w',          'Cargador GaN ultra compacto 140W. Carga 3 dispositivos simultáneos.',    89.00, NULL,   1, 1);

-- Banners Empresa 1
INSERT INTO banners (company_id, title, subtitle, image, link_text, sort_order) VALUES
(1, 'Nueva Colección Primavera 2025', 'Descubre los últimos estilos de la temporada', 'banners/elegance-spring.jpg', 'Ver Colección', 1),
(1, 'Hasta 40% en Accesorios',        'Ofertas por tiempo limitado',                  'banners/elegance-sale.jpg',   'Ver Ofertas',    2);

-- Banners Empresa 2
INSERT INTO banners (company_id, title, subtitle, image, link_text, sort_order) VALUES
(2, 'Tecnología de Última Generación', 'Los mejores gadgets del mercado',    'banners/tech-hero.jpg',  'Explorar',       1),
(2, 'MacBook Pro M4 Ya Disponible',    'El chip más potente para creadores', 'banners/macbook-m4.jpg', 'Comprar Ahora',  2);
