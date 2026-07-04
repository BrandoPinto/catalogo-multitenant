<?php
// routes/Router.php

/**
 * Router minimalista pero completo.
 * Soporta: GET, POST, PUT, PATCH, DELETE
 * Soporta parámetros dinámicos: /products/:id
 */
class Router
{
    private array $routes = [];

    public function get(string $path, callable|array $handler): void
    {
        $this->add('GET', $path, $handler);
    }
    public function post(string $path, callable|array $handler): void
    {
        $this->add('POST', $path, $handler);
    }
    public function put(string $path, callable|array $handler): void
    {
        $this->add('PUT', $path, $handler);
    }
    public function patch(string $path, callable|array $handler): void
    {
        $this->add('PATCH', $path, $handler);
    }
    public function delete(string $path, callable|array $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    private function add(string $method, string $path, callable|array $handler): void
    {
        $pattern = preg_replace('/\/:([a-z_]+)/', '/(?P<$1>[^/]+)', $path);
        $pattern = '@^' . $pattern . '$@';
        $this->routes[] = compact('method', 'pattern', 'handler');
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $uri    = '/' . trim($uri, '/');

        // OPTIONS preflight
        if ($method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        // PUT/PATCH via _method override (para formularios)
        if ($method === 'POST' && isset($_POST['_method'])) {
            $override = strtoupper($_POST['_method']);
            if (in_array($override, ['PUT', 'PATCH', 'DELETE'])) {
                $method = $override;
            }
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) continue;
            if (!preg_match($route['pattern'], $uri, $matches)) continue;

            // Extraer params numéricos como int
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            $params = array_map(fn($v) => is_numeric($v) ? (int)$v : $v, $params);

            $handler = $route['handler'];

            if (is_array($handler)) {
                [$class, $method_name] = $handler;
                $controller = new $class();
                call_user_func_array([$controller, $method_name], array_values($params));
            } else {
                call_user_func_array($handler, array_values($params));
            }
            return;
        }

        Response::error('Ruta no encontrada.', 404);
    }
}
