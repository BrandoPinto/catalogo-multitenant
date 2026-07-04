# 🚀 Multi-Tenant Catalog Backend

Sistema de catálogo web multi-empresa (multi-tenant) con detección automática de subdominio.

---

## 📋 Requisitos

- PHP 8.1+
- MySQL 5.7+ / MariaDB 10.4+
- Apache con `mod_rewrite`
- Extensiones PHP: `pdo`, `pdo_mysql`, `fileinfo`, `json`, `mbstring`

---

## ⚙️ Instalación en cPanel

### 1. Crear Base de Datos
En cPanel → MySQL Databases:
1. Crear base de datos: `tuusuario_catalog`
2. Crear usuario con contraseña segura
3. Asignar el usuario a la base de datos con **todos los privilegios**
4. Importar el archivo `database.sql`

### 2. Subir Archivos
Subir el contenido de esta carpeta a:
```
public_html/api/   (recomendado para el backend)
```
O directamente en `public_html/` si el backend es la raíz.

### 3. Configurar Variables de Entorno
Copiar `.env.example` a `.env` y editar:
```bash
cp .env.example .env
```

Editar `.env`:
```
DB_HOST=localhost
DB_NAME=tuusuario_catalog
DB_USER=tuusuario_dbuser
DB_PASS=tu_password_segura

JWT_SECRET=genera_una_clave_aleatoria_de_64_chars_aqui_2025xyzabc

APP_ENV=production
APP_URL=https://api.midominio.com
BASE_DOMAIN=midominio.com

UPLOAD_PATH=uploads/
CORS_ORIGINS=https://midominio.com,https://empresa1.midominio.com,https://empresa2.midominio.com
```

### 4. Permisos de Carpeta de Uploads
```bash
chmod 755 uploads/
chmod 755 uploads/products/
chmod 755 uploads/logos/
chmod 755 uploads/banners/
```

### 5. Configurar DNS Wildcard
En tu panel de DNS (cPanel → Zone Editor):
```
*.midominio.com  →  A  →  tu.ip.del.servidor
```

### 6. SSL Wildcard (HTTPS)
En cPanel → SSL/TLS → Let's Encrypt:
- Solicitar certificado wildcard: `*.midominio.com`

---

## 🌐 Configuración de Subdominios en cPanel

### Opción A: Wildcard automático
1. cPanel → Subdominios
2. Crear: `*` como subdominio, apuntando a `public_html/api`
3. Todos los subdominios se enrutarán automáticamente

### Opción B: Subdominios individuales
Para cada empresa, crear manualmente:
- `empresa1.midominio.com` → `public_html/api`
- `empresa2.midominio.com` → `public_html/api`

---

## 🧪 Prueba Local (Desarrollo)

### Con XAMPP/Laragon (hosts file)
Editar `/etc/hosts` (Linux/Mac) o `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1  elegance.localhost
127.0.0.1  techstore.localhost
```

Configurar `.env`:
```
APP_ENV=development
BASE_DOMAIN=localhost
APP_URL=http://localhost/backend
```

### Prueba con curl
```bash
# Probar empresa elegance
curl -H "Host: elegance.midominio.com" http://localhost/backend/company

# Con header X-Company-Slug (alternativa para dev)
curl -H "X-Company-Slug: elegance" http://localhost/backend/company

# Login
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Company-Slug: elegance" \
  -d '{"email":"admin@elegance.com","password":"password"}' \
  http://localhost/backend/auth/login
```

---

## 📡 Endpoints de la API

### Públicos (sin auth)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/company` | Datos de la empresa actual |
| GET | `/categories` | Lista de categorías activas |
| GET | `/categories/:id` | Detalle de categoría |
| GET | `/products` | Lista de productos activos |
| GET | `/products/:id` | Detalle de producto |
| GET | `/banners` | Banners activos |
| POST | `/auth/login` | Login de administrador |

#### Parámetros de /products:
- `?page=1` - Paginación
- `?per_page=20` - Items por página
- `?category_id=1` - Filtrar por categoría
- `?featured=1` - Solo destacados
- `?search=texto` - Búsqueda por nombre/descripción

### Protegidos (JWT requerido)
Todos los endpoints `/admin/*` requieren header:
```
Authorization: Bearer <token>
```

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/auth/me` | Usuario actual |
| POST | `/auth/change-password` | Cambiar contraseña |
| PUT | `/admin/company` | Actualizar empresa |
| GET/POST/PUT/DELETE | `/admin/categories` | CRUD categorías |
| GET/POST/PUT/DELETE | `/admin/products` | CRUD productos |
| PATCH | `/admin/products/:id/toggle` | Activar/desactivar |
| PATCH | `/admin/products/:id/feature` | Destacar/quitar |
| DELETE | `/admin/products/:id/images/:imgId` | Eliminar imagen |
| GET/POST/PUT/DELETE | `/admin/banners` | CRUD banners |
| GET/POST/PUT/DELETE | `/admin/users` | CRUD usuarios |

---

## 👤 Usuarios de Prueba

| Empresa | Email | Contraseña |
|---------|-------|------------|
| Elegance Moda (`elegance`) | admin@elegance.com | `password` |
| TechStore Pro (`techstore`) | admin@techstore.com | `password` |

⚠️ **Cambiar contraseñas antes de producción**

---

## 🔐 Seguridad Implementada

- ✅ Aislamiento total por `company_id` en todas las queries
- ✅ JWT firmado con HS256
- ✅ Bcrypt para contraseñas (cost=12)
- ✅ Validación MIME real de imágenes (no solo extensión)
- ✅ Prepared statements en todas las queries (previene SQL injection)
- ✅ Headers de seguridad HTTP
- ✅ Cross-tenant access denied (403)
- ✅ Validación de ownership en cada operación

---

## 🗂️ Estructura de Archivos

```
backend/
├── index.php              # Entry point
├── .htaccess              # URL rewriting + security
├── .env.example           # Variables de entorno (template)
├── database.sql           # Schema + seeders
├── config/
│   ├── database.php       # Config de BD
│   └── Database.php       # Singleton PDO
├── helpers/
│   ├── JWT.php            # JWT encode/decode
│   ├── Response.php       # HTTP responses helper
│   ├── Upload.php         # File upload handler
│   └── Slug.php           # Slug generator
├── middlewares/
│   ├── TenantMiddleware.php  # Multi-tenant detection ⭐
│   └── AuthMiddleware.php    # JWT authentication
├── controllers/
│   ├── AuthController.php
│   ├── CompanyController.php
│   ├── CategoryController.php
│   ├── ProductController.php
│   ├── BannerController.php
│   └── UserController.php
└── routes/
    ├── Router.php         # HTTP router
    └── api.php            # Route definitions
```
