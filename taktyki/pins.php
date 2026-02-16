<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$targetFile = __DIR__ . '/../data/pins.json';

if (!file_exists($targetFile)) {
    file_put_contents($targetFile, json_encode(new stdClass(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$data = json_decode(file_get_contents($targetFile), true);
if (!is_array($data)) {
    $data = [];
}

if ($method === 'GET') {
    echo json_encode($data);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Metoda niedozwolona.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$action = $payload['action'] ?? '';
$map = $payload['map'] ?? null;
$board = $payload['board'] ?? null;

$requiresMapBoard = in_array($action, ['addPin', 'deletePin', 'clearBoard', 'addBoard', 'deleteBoard', 'setBoardNote', 'renameBoard'], true);
$requiresMapOnly = in_array($action, [], true);

if ($requiresMapBoard && (!$map || !$board)) {
    http_response_code(400);
    echo json_encode(['message' => 'Brak mapy lub planszy.']);
    exit;
}

if ($requiresMapOnly && !$map) {
    http_response_code(400);
    echo json_encode(['message' => 'Brak mapy.']);
    exit;
}

if ($requiresMapBoard) {
    if (!isset($data[$map])) {
        $data[$map] = [];
    }

    if (!isset($data[$map][$board])) {
        $data[$map][$board] = [];
    }
}

switch ($action) {
    case 'addPin':
        $pin = $payload['pin'] ?? null;
        if (!$pin) {
            http_response_code(400);
            echo json_encode(['message' => 'Brak danych pinezki.']);
            exit;
        }

        $pins = &$data[$map][$board];
        $found = false;
        foreach ($pins as $index => $existing) {
            if (isset($existing['id']) && $existing['id'] == $pin['id']) {
                $pins[$index] = $pin;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $pins[] = $pin;
        }
        break;
    case 'deletePin':
        $pinId = $payload['pinId'] ?? null;
        if ($pinId === null) {
            http_response_code(400);
            echo json_encode(['message' => 'Brak ID pinezki.']);
            exit;
        }
        $data[$map][$board] = array_values(array_filter($data[$map][$board], function ($pin) use ($pinId) {
            return isset($pin['id']) && $pin['id'] != $pinId;
        }));
        break;
    case 'clearBoard':
        $data[$map][$board] = [];
        break;
    case 'addBoard':
        $boardName = $payload['boardName'] ?? '';
        if ($boardName === '') {
            http_response_code(400);
            echo json_encode(['message' => 'Brak nazwy planszy.']);
            exit;
        }
        if (!isset($data[$map][$boardName])) {
            $data[$map][$boardName] = [];
        }
        if (!isset($data['_customBoards']) || !is_array($data['_customBoards'])) {
            $data['_customBoards'] = [];
        }
        if (!isset($data['_customBoards'][$map]) || !is_array($data['_customBoards'][$map])) {
            $data['_customBoards'][$map] = [];
        }
        $data['_customBoards'][$map][$boardName] = true;
        break;
    case 'setBoardNote':
        $noteHtml = $payload['noteHtml'] ?? '';
        if (!isset($data['_boardNotes']) || !is_array($data['_boardNotes'])) {
            $data['_boardNotes'] = [];
        }
        if (!isset($data['_boardNotes'][$map]) || !is_array($data['_boardNotes'][$map])) {
            $data['_boardNotes'][$map] = [];
        }
        $data['_boardNotes'][$map][$board] = $noteHtml;
        break;
    case 'deleteBoard':
        if ($board === 'Miejscowki') {
            http_response_code(400);
            echo json_encode(['message' => 'Nie można usunąć domyślnej planszy.']);
            exit;
        }
        unset($data[$map][$board]);
        if (isset($data['_boardNotes'][$map][$board])) {
            unset($data['_boardNotes'][$map][$board]);
        }
        if (isset($data['_customBoards'][$map][$board])) {
            unset($data['_customBoards'][$map][$board]);
        }
        break;
    case 'renameBoard':
        $newBoardName = trim($payload['newBoardName'] ?? '');
        if ($board === 'Miejscowki') {
            http_response_code(400);
            echo json_encode(['message' => 'Nie można zmienić nazwy domyślnej planszy.']);
            exit;
        }
        if ($newBoardName === '') {
            http_response_code(400);
            echo json_encode(['message' => 'Brak nowej nazwy planszy.']);
            exit;
        }
        if (isset($data[$map][$newBoardName])) {
            http_response_code(400);
            echo json_encode(['message' => 'Plansza o tej nazwie już istnieje.']);
            exit;
        }
        if (!isset($data[$map][$board])) {
            http_response_code(404);
            echo json_encode(['message' => 'Nie znaleziono planszy.']);
            exit;
        }
        $data[$map][$newBoardName] = $data[$map][$board];
        unset($data[$map][$board]);
        if (isset($data['_boardNotes'][$map][$board])) {
            $data['_boardNotes'][$map][$newBoardName] = $data['_boardNotes'][$map][$board];
            unset($data['_boardNotes'][$map][$board]);
        }
        if (isset($data['_customBoards'][$map][$board])) {
            $data['_customBoards'][$map][$newBoardName] = $data['_customBoards'][$map][$board];
            unset($data['_customBoards'][$map][$board]);
        }
        break;
    default:
        http_response_code(400);
        echo json_encode(['message' => 'Nieznana akcja.']);
        exit;
}

file_put_contents($targetFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

echo json_encode(['success' => true]);
