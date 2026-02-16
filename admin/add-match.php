<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth-common.php';
require_admin_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metoda niedozwolona.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$rows = $payload['rows'] ?? null;

if (!is_array($rows) || count($rows) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Brak poprawnych danych meczu (tablica JSON).']);
    exit;
}

$matchIds = [];
foreach ($rows as $row) {
    if (!is_array($row) || !array_key_exists('ID meczu', $row)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Każdy rekord musi zawierać pole "ID meczu".']);
        exit;
    }
    $matchIds[] = (string)$row['ID meczu'];
}

$uniqueInputMatchIds = array_values(array_unique($matchIds));
if (count($uniqueInputMatchIds) !== 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Wklej dane jednego meczu (jeden ID meczu na import).']);
    exit;
}

$targetFile = __DIR__ . '/../data/gracze.json';
if (!file_exists($targetFile)) {
    file_put_contents($targetFile, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

$current = json_decode(file_get_contents($targetFile), true);
if (!is_array($current)) {
    $current = [];
}

$targetMatchId = $uniqueInputMatchIds[0];
$exists = false;
foreach ($current as $existingRow) {
    if (is_array($existingRow) && array_key_exists('ID meczu', $existingRow) && (string)$existingRow['ID meczu'] === $targetMatchId) {
        $exists = true;
        break;
    }
}

if ($exists) {
    echo json_encode([
        'success' => true,
        'added' => false,
        'message' => 'Mecz już istnieje w data/gracze.json — nic nie dodano.',
        'matchId' => $targetMatchId,
    ]);
    exit;
}

$merged = array_merge($current, $rows);
$encoded = json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($encoded === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd kodowania JSON.']);
    exit;
}

$written = file_put_contents($targetFile, $encoded, LOCK_EX);
if ($written === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Nie udało się zapisać data/gracze.json.']);
    exit;
}

echo json_encode([
    'success' => true,
    'added' => true,
    'message' => 'Mecz został dodany do data/gracze.json.',
    'matchId' => $targetMatchId,
    'rowsAdded' => count($rows),
]);
