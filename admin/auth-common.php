<?php

function admin_user(): string {
    $envUser = getenv('ADMIN_USER');
    return is_string($envUser) && $envUser !== '' ? $envUser : 'admin';
}

function admin_password_hash(): string {
    $envHash = getenv('ADMIN_PASSWORD_HASH');
    if (is_string($envHash) && $envHash !== '') {
        return $envHash;
    }

    $envPassword = getenv('ADMIN_PASSWORD');
    if (is_string($envPassword) && $envPassword !== '') {
        return password_hash($envPassword, PASSWORD_DEFAULT);
    }

    return '$2y$12$lioFw/UM0YYLcMHFr1Vv0u53CU6ID3u5zg5Pn5T6.fnV4GlHiAOsy';
}

function start_admin_session(): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }
}

function is_admin_authenticated(): bool {
    start_admin_session();
    return !empty($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}

function require_admin_auth(): void {
    if (!is_admin_authenticated()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Brak autoryzacji.']);
        exit;
    }
}
