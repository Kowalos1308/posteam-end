<?php
header('Content-Type: application/json');
require_once __DIR__ . '/auth-common.php';
require_admin_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Metoda niedozwolona.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);

if (!isset($payload['data']) || !is_array($payload['data'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Brak danych do zapisu.']);
    exit;
}

$targetDir = __DIR__ . '/../data';
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0775, true);
}

$targetFile = $targetDir . '/gracze.json';
$encoded = json_encode($payload['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if ($encoded === false) {
    http_response_code(500);
    echo json_encode(['message' => 'Nie udało się przetworzyć danych.']);
    exit;
}

$result = file_put_contents($targetFile, $encoded, LOCK_EX);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['message' => 'Nie udało się zapisać pliku.']);
    exit;
}

echo json_encode(['message' => 'Plik gracze.json został zaktualizowany.']);
