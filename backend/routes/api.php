<?php
// routes/api.php

/** @var Router $router */

// ══════════════════════════════════════════════════════════════
//  PUBLIC ROUTES (no auth required)
// ══════════════════════════════════════════════════════════════

// Company info
$router->get('/company', [CompanyController::class, 'show']);

// Categories (public)
$router->get('/categories',      [CategoryController::class, 'index']);
$router->get('/categories/:id',  [CategoryController::class, 'show']);

// Products (public)
$router->get('/products',        [ProductController::class, 'index']);
$router->get('/products/:id',    [ProductController::class, 'show']);

// Banners (public)
$router->get('/banners',         [BannerController::class, 'index']);

// Auth
$router->post('/auth/login',     [AuthController::class, 'login']);


// ══════════════════════════════════════════════════════════════
//  ADMIN ROUTES (JWT required)
// ══════════════════════════════════════════════════════════════

// Auth
$router->get('/auth/me',              [AuthController::class, 'me']);
$router->post('/auth/change-password',[AuthController::class, 'changePassword']);

// Company (admin update)
$router->post('/admin/company',       [CompanyController::class, 'update']);
$router->put('/admin/company',        [CompanyController::class, 'update']);

// Categories CRUD
$router->get('/admin/categories',        [CategoryController::class, 'adminIndex']);
$router->post('/admin/categories',       [CategoryController::class, 'store']);
$router->put('/admin/categories/:id',    [CategoryController::class, 'update']);
$router->delete('/admin/categories/:id', [CategoryController::class, 'destroy']);

// Products CRUD
$router->get('/admin/products',               [ProductController::class, 'adminIndex']);
$router->post('/admin/products',              [ProductController::class, 'store']);
$router->put('/admin/products/:id',           [ProductController::class, 'update']);
$router->delete('/admin/products/:id',        [ProductController::class, 'destroy']);
$router->patch('/admin/products/:id/toggle',  [ProductController::class, 'toggle']);
$router->patch('/admin/products/:id/feature', [ProductController::class, 'feature']);
$router->post('/admin/products/:id/images',                   [ProductController::class, 'addImages']);
$router->delete('/admin/products/:productId/images/:imageId', [ProductController::class, 'deleteImage']);

// Banners CRUD
$router->get('/admin/banners',        [BannerController::class, 'adminIndex']);
$router->post('/admin/banners',       [BannerController::class, 'store']);
$router->put('/admin/banners/:id',    [BannerController::class, 'update']);
$router->delete('/admin/banners/:id', [BannerController::class, 'destroy']);

// Users CRUD
$router->get('/admin/users',        [UserController::class, 'index']);
$router->post('/admin/users',       [UserController::class, 'store']);
$router->put('/admin/users/:id',    [UserController::class, 'update']);
$router->delete('/admin/users/:id', [UserController::class, 'destroy']);

// Inventory
$router->get('/admin/inventory/reasons',          [InventoryController::class, 'reasonsList']);
$router->post('/admin/inventory/reasons',         [InventoryController::class, 'reasonsStore']);
$router->put('/admin/inventory/reasons/:id',      [InventoryController::class, 'reasonsUpdate']);
$router->delete('/admin/inventory/reasons/:id',   [InventoryController::class, 'reasonsDestroy']);
$router->get('/admin/inventory/movements',          [InventoryController::class, 'movementsList']);
$router->post('/admin/inventory/movements',        [InventoryController::class, 'movementsStore']);
$router->delete('/admin/inventory/movements/:id',  [InventoryController::class, 'movementsDestroy']);
$router->get('/admin/inventory/stock',            [InventoryController::class, 'stockSummary']);
$router->get('/admin/inventory/report',           [InventoryController::class, 'report']);
$router->get('/admin/inventory/sales-report',     [InventoryController::class, 'salesReport']);
