<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth-common.php';
require_admin_auth();

$targetFile = __DIR__ . '/../data/excluded-matches.json';

function load_ids($file) {
    if (!file_exists($file)) {
        return [];
    }
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) {
        return [];
    }
    return array_values(array_unique(array_map('strval', $data)));
}

function save_ids($file, $ids) {
    $encoded = json_encode(array_values(array_unique(array_map('strval', $ids))), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        return false;
    }
    return file_put_contents($file, $encoded, LOCK_EX) !== false;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['success' => true, 'matchIds' => load_ids($targetFile)]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metoda niedozwolona.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$matchId = trim((string)($payload['matchId'] ?? ''));
if ($matchId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Brak ID meczu.']);
    exit;
}

$ids = load_ids($targetFile);
if (!in_array($matchId, $ids, true)) {
    $ids[] = $matchId;
}
if (!save_ids($targetFile, $ids)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Nie udało się zapisać listy wykluczonych meczów.']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'ID meczu dodane do wykluczonych.', 'matchIds' => load_ids($targetFile)]);
