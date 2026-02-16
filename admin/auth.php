<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth-common.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    echo json_encode([
        'success' => true,
        'authenticated' => is_admin_authenticated(),
        'username' => admin_user(),
    ]);
    exit;
}

if ($method === 'DELETE') {
    start_admin_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], '', false, true);
    }
    session_destroy();

    echo json_encode(['success' => true, 'message' => 'Wylogowano.']);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metoda niedozwolona.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$username = trim((string)($payload['username'] ?? ''));
$password = trim((string)($payload['password'] ?? ''));

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Podaj login i hasło.']);
    exit;
}

if (!hash_equals(admin_user(), $username) || !password_verify($password, admin_password_hash())) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Niepoprawne dane logowania.']);
    exit;
}

start_admin_session();
session_regenerate_id(true);
$_SESSION['is_admin'] = true;
$_SESSION['admin_user'] = admin_user();

if (function_exists('random_bytes')) {
    $_SESSION['session_nonce'] = bin2hex(random_bytes(16));
}

echo json_encode(['success' => true, 'message' => 'Zalogowano jako administrator.']);
