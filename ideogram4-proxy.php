<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// GET = diagnostica
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $key_file = __DIR__ . '/ideogram4-key.php';
    if (file_exists($key_file)) require $key_file;
    echo json_encode([
        'status'   => 'proxy ok',
        'php'      => PHP_VERSION,
        'curl'     => function_exists('curl_init'),
        'key_ok'   => !empty($ANTHROPIC_API_KEY),
        'key'      => isset($ANTHROPIC_API_KEY) ? substr($ANTHROPIC_API_KEY,0,15).'...' : 'missing',
        'prompt'   => file_exists(__DIR__.'/ideogram4-system-prompt.txt'),
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit;
}

// Carica key
$key_file = __DIR__ . '/ideogram4-key.php';
if (!file_exists($key_file)) {
    http_response_code(500); echo json_encode(['error'=>'Key file not found']); exit;
}
require $key_file;
if (empty($ANTHROPIC_API_KEY)) {
    http_response_code(500); echo json_encode(['error'=>'API key empty after require']); exit;
}

// Carica system prompt
$system_prompt = @file_get_contents(__DIR__ . '/ideogram4-system-prompt.txt');
if (!$system_prompt) {
    http_response_code(500); echo json_encode(['error'=>'System prompt not found']); exit;
}

// Leggi body
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

// TEST MODE: se mandi {"test":true} risponde solo con diagnostica senza chiamare Anthropic
if (!empty($body['test'])) {
    echo json_encode([
        'test_ok'     => true,
        'key_prefix'  => substr($ANTHROPIC_API_KEY,0,15).'...',
        'prompt_len'  => strlen($system_prompt),
        'body_recv'   => $body,
    ]);
    exit;
}

if (!$body || !isset($body['idea'])) {
    http_response_code(400); echo json_encode(['error'=>'Missing idea field', 'raw_recv'=>substr($raw,0,100)]); exit;
}

$payload = json_encode([
    'model'    => 'claude-sonnet-4-20250514',
    'max_tokens' => 4096,
    'system'   => $system_prompt,
    'messages' => [['role'=>'user','content'=>trim($body['idea'])]]
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'x-api-key: '.$ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
        'content-type: application/json',
    ],
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_SSL_VERIFYPEER => false,
]);

$resp     = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlerr  = curl_error($ch);
curl_close($ch);

if ($curlerr) {
    http_response_code(502); echo json_encode(['error'=>'cURL: '.$curlerr]); exit;
}
if ($httpcode !== 200) {
    http_response_code(502);
    echo json_encode(['error'=>'Anthropic HTTP '.$httpcode, 'detail'=>substr($resp,0,800)]);
    exit;
}

$data = json_decode($resp, true);
$text = '';
foreach (($data['content'] ?? []) as $b) { if ($b['type']==='text') $text .= $b['text']; }
$text = trim($text);

$json_obj = json_decode($text, true);
if (!$json_obj && preg_match('/\{[\s\S]*\}/s', $text, $m)) $json_obj = json_decode($m[0], true);
if (!$json_obj) {
    http_response_code(500);
    echo json_encode(['error'=>'Cannot parse AI JSON', 'raw'=>substr($text,0,600)]);
    exit;
}

echo json_encode(['success'=>true, 'json'=>$json_obj]);
?>
