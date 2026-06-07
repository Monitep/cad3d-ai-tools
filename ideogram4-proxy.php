<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit;
}

// ⚠️ INSERISCI LA TUA ANTHROPIC API KEY QUI:
$ANTHROPIC_API_KEY = 'INSERISCI_QUI_LA_TUA_API_KEY';

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!$body || !isset($body['idea'])) {
    http_response_code(400); echo json_encode(['error'=>'Missing idea field']); exit;
}

$idea = trim($body['idea']);

// Carica il system prompt dallo stesso percorso del proxy
$sp_path = __DIR__ . '/ideogram4-system-prompt.txt';
$system_prompt = @file_get_contents($sp_path);
if (!$system_prompt) {
    http_response_code(500);
    echo json_encode(['error'=>'System prompt file not found at: '.$sp_path]);
    exit;
}

$payload = json_encode([
    'model'      => 'claude-sonnet-4-20250514',
    'max_tokens' => 4096,
    'system'     => $system_prompt,
    'messages'   => [['role'=>'user','content'=>$idea]]
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'x-api-key: '          . $ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
        'content-type: application/json'
    ],
    CURLOPT_TIMEOUT => 60
]);

$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err = curl_error($ch);
curl_close($ch);

if ($curl_err) {
    http_response_code(502);
    echo json_encode(['error'=>'cURL error: '.$curl_err]);
    exit;
}
if ($code !== 200) {
    http_response_code(502);
    echo json_encode(['error'=>'Anthropic API returned '.$code, 'detail'=>substr($resp,0,400)]);
    exit;
}

$data = json_decode($resp, true);
$text = '';
foreach (($data['content'] ?? []) as $block) {
    if ($block['type'] === 'text') $text .= $block['text'];
}
$text = trim($text);

// Prova parse diretto
$json_obj = json_decode($text, true);
if (!$json_obj) {
    // Estrai il primo blocco JSON
    if (preg_match('/\{[\s\S]*\}/s', $text, $m)) {
        $json_obj = json_decode($m[0], true);
    }
}

if (!$json_obj) {
    http_response_code(500);
    echo json_encode(['error'=>'Could not parse JSON from AI response', 'raw'=>substr($text,0,500)]);
    exit;
}

echo json_encode(['success'=>true, 'json'=>$json_obj]);
?>
