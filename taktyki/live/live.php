<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$targetFile = __DIR__ . '/../../data/live.json';

$defaultState = [
    'active' => false,
    'map' => null,
    'board' => null,
    'strokes' => [],
    'updatedAt' => null,
    'expiresAt' => null,
    'brushColor' => '#32d583',
    'brushSize' => 4
];

if (!file_exists($targetFile)) {
    file_put_contents($targetFile, json_encode($defaultState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$state = json_decode(file_get_contents($targetFile), true);
if (!is_array($state)) {
    $state = $defaultState;
}

if ($method === 'GET') {
    echo json_encode($state);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Metoda niedozwolona.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$action = $payload['action'] ?? '';

if ($action !== 'setState') {
    http_response_code(400);
    echo json_encode(['message' => 'Nieznana akcja.']);
    exit;
}

$newState = $payload['state'] ?? null;
if (!is_array($newState)) {
    http_response_code(400);
    echo json_encode(['message' => 'Brak danych live.']);
    exit;
}

$state = [
    'active' => !empty($newState['active']),
    'map' => $newState['map'] ?? null,
    'board' => $newState['board'] ?? null,
    'strokes' => isset($newState['strokes']) && is_array($newState['strokes']) ? $newState['strokes'] : [],
    'updatedAt' => $newState['updatedAt'] ?? null,
    'expiresAt' => $newState['expiresAt'] ?? null,
    'brushColor' => $newState['brushColor'] ?? '#32d583',
    'brushSize' => $newState['brushSize'] ?? 4
];

file_put_contents($targetFile, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

echo json_encode(['success' => true]);
