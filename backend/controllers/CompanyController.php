<?php
// controllers/CompanyController.php

class CompanyController
{
    /**
     * GET /company - Datos públicos de la empresa actual
     */
    public function show(): void
    {
        $company = TenantMiddleware::getCompany();

        if ($company['logo']) {
            $company['logo_url'] = self::assetUrl($company['logo']);
        } else {
            $company['logo_url'] = null;
        }

        if (!empty($company['popup_image'])) {
            $company['popup_image_url'] = self::assetUrl($company['popup_image']);
        } else {
            $company['popup_image_url'] = null;
        }

        Response::success($company);
    }

    /**
     * PUT /admin/company - Actualizar datos de la empresa (admin)
     */
    public function update(): void
    {
        AuthMiddleware::requireRole('admin');

        $companyId = TenantMiddleware::getCompanyId();
        $pdo       = Database::getInstance();

        $name           = trim($_POST['name']           ?? '');
        $primaryColor   = trim($_POST['primary_color']  ?? '');
        $secondaryColor = trim($_POST['secondary_color']?? '');
        $description    = trim($_POST['description']    ?? '');

        $fields = [];
        $params = [':id' => $companyId];

        if ($name !== '') {
            $fields[]        = 'name = :name';
            $params[':name'] = $name;
        }

        if ($primaryColor && preg_match('/^#[0-9A-Fa-f]{6}$/', $primaryColor)) {
            $fields[]                 = 'primary_color = :pc';
            $params[':pc']            = $primaryColor;
        }

        if ($secondaryColor && preg_match('/^#[0-9A-Fa-f]{6}$/', $secondaryColor)) {
            $fields[]                  = 'secondary_color = :sc';
            $params[':sc']             = $secondaryColor;
        }

        if ($description !== '') {
            $fields[]        = 'description = :desc';
            $params[':desc'] = $description;
        }

        // WhatsApp
        if (array_key_exists('whatsapp_number', $_POST)) {
            $fields[]           = 'whatsapp_number = :wa_num';
            $params[':wa_num']  = trim($_POST['whatsapp_number']) ?: null;
        }
        if (array_key_exists('whatsapp_active', $_POST)) {
            $fields[]           = 'whatsapp_active = :wa_act';
            $params[':wa_act']  = (int)(bool)$_POST['whatsapp_active'];
        }

        // Social media
        foreach (['facebook', 'instagram', 'tiktok', 'youtube'] as $p) {
            if (array_key_exists("{$p}_url", $_POST)) {
                $fields[]            = "{$p}_url = :{$p}_url";
                $params[":{$p}_url"] = trim($_POST["{$p}_url"]) ?: null;
            }
            if (array_key_exists("{$p}_active", $_POST)) {
                $fields[]               = "{$p}_active = :{$p}_active";
                $params[":{$p}_active"] = (int)(bool)$_POST["{$p}_active"];
            }
        }

        // Popup de bienvenida
        if (array_key_exists('popup_active', $_POST)) {
            $fields[]                = 'popup_active = :popup_active';
            $params[':popup_active'] = (int)(bool)$_POST['popup_active'];
        }
        if (array_key_exists('popup_link', $_POST)) {
            $fields[]             = 'popup_link = :popup_link';
            $params[':popup_link'] = trim($_POST['popup_link']) ?: null;
        }
        if (!empty($_FILES['popup_image']['name'])) {
            $oldStmt = $pdo->prepare('SELECT popup_image FROM companies WHERE id = :id');
            $oldStmt->execute([':id' => $companyId]);
            $oldPopup = $oldStmt->fetchColumn();
            if ($oldPopup) Upload::delete($oldPopup);
            $fields[]               = 'popup_image = :popup_image';
            $params[':popup_image'] = Upload::image($_FILES['popup_image'], 'popups');
        }
        if (isset($_POST['remove_popup_image']) && $_POST['remove_popup_image'] === '1') {
            $oldStmt = $pdo->prepare('SELECT popup_image FROM companies WHERE id = :id');
            $oldStmt->execute([':id' => $companyId]);
            $oldPopup = $oldStmt->fetchColumn();
            if ($oldPopup) Upload::delete($oldPopup);
            $fields[]               = 'popup_image = :popup_image';
            $params[':popup_image'] = null;
        }

        // Subida de logo
        if (!empty($_FILES['logo']['name'])) {
            $logoPath = Upload::image($_FILES['logo'], 'logos');

            // Borrar logo anterior
            $stmt = $pdo->prepare('SELECT logo FROM companies WHERE id = :id');
            $stmt->execute([':id' => $companyId]);
            $old = $stmt->fetchColumn();
            if ($old) Upload::delete($old);

            $fields[]           = 'logo = :logo';
            $params[':logo']    = $logoPath;
        }

        if (empty($fields)) {
            Response::error('No se enviaron cambios.', 422);
        }

        $sql  = 'UPDATE companies SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Devolver empresa actualizada con URLs construidas
        $stmt2 = $pdo->prepare('SELECT * FROM companies WHERE id = :id');
        $stmt2->execute([':id' => $companyId]);
        $updated = $stmt2->fetch();
        $updated['logo_url']         = $updated['logo']         ? self::assetUrl($updated['logo'])         : null;
        $updated['popup_image_url']  = $updated['popup_image']  ? self::assetUrl($updated['popup_image'])  : null;

        Response::success($updated, 'Empresa actualizada.');
    }

    private static function assetUrl(string $path): string
    {
        $base = rtrim($_ENV['APP_URL'] ?? '', '/');
        $uploadPath = rtrim($_ENV['UPLOAD_PATH'] ?? 'uploads/', '/');
        return "{$base}/{$uploadPath}/{$path}";
    }
}
