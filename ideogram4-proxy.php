<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// TEST MODE: GET request ritorna diagnostica
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $diag = [
        'php_version' => PHP_VERSION,
        'curl_available' => function_exists('curl_init'),
        'dir' => __DIR__,
        'key_file_exists' => file_exists(__DIR__ . '/ideogram4-key.php'),
        'prompt_file_exists' => file_exists(__DIR__ . '/ideogram4-system-prompt.txt'),
        'prompt_file_size' => @filesize(__DIR__ . '/ideogram4-system-prompt.txt'),
    ];
    
    // Test curl verso esterno
    if (function_exists('curl_init')) {
        $ch = curl_init('https://httpbin.org/get');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8, CURLOPT_SSL_VERIFYPEER=>false]);
        $r = curl_exec($ch);
        $diag['curl_external_ok'] = ($r !== false);
        $diag['curl_external_error'] = curl_error($ch);
        curl_close($ch);
        
        // Test curl verso Anthropic
        $ch2 = curl_init('https://api.anthropic.com');
        curl_setopt_array($ch2, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8, CURLOPT_SSL_VERIFYPEER=>false]);
        $r2 = curl_exec($ch2);
        $diag['curl_anthropic_reachable'] = ($r2 !== false);
        $diag['curl_anthropic_error'] = curl_error($ch2);
        curl_close($ch2);
    }
    
    // Try loading key
    if (file_exists(__DIR__ . '/ideogram4-key.php')) {
        require __DIR__ . '/ideogram4-key.php';
        $diag['key_loaded'] = !empty($ANTHROPIC_API_KEY);
        $diag['key_prefix'] = isset($ANTHROPIC_API_KEY) ? substr($ANTHROPIC_API_KEY, 0, 15).'...' : 'not set';
    }
    
    echo json_encode($diag, JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit;
}

$key_file = __DIR__ . '/ideogram4-key.php';
if (!file_exists($key_file)) {
    http_response_code(500);
    echo json_encode(['error'=>'Key file not found', 'looked_in'=>$key_file]);
    exit;
}
require $key_file;

if (empty($ANTHROPIC_API_KEY)) {
    http_response_code(500);
    echo json_encode(['error'=>'API key empty']);
    exit;
}

$sp_path = __DIR__ . '/ideogram4-system-prompt.txt';
$system_prompt = @file_get_contents($sp_path);
if (!$system_prompt) {
    http_response_code(500);
    echo json_encode(['error'=>'System prompt not found']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!$body || !isset($body['idea'])) {
    http_response_code(400);
    echo json_encode(['error'=>'Missing idea field']);
    exit;
}

$payload = json_encode([
    'model'      => 'claude-sonnet-4-20250514',
    'max_tokens' => 4096,
    'system'     => $system_prompt,
    'messages'   => [['role'=>'user','content'=>trim($body['idea'])]]
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'x-api-key: '.$ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
        'content-type: application/json'
    ],
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_SSL_VERIFYPEER => false
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
    echo json_encode(['error'=>'Anthropic HTTP '.$code, 'detail'=>substr($resp,0,600)]);
    exit;
}

$data = json_decode($resp, true);
$text = '';
foreach (($data['content'] ?? []) as $block) {
    if ($block['type'] === 'text') $text .= $block['text'];
}
$text = trim($text);

$json_obj = json_decode($text, true);
if (!$json_obj) {
    if (preg_match('/\{[\s\S]*\}/s', $text, $m)) $json_obj = json_decode($m[0], true);
}
if (!$json_obj) {
    http_response_code(500);
    echo json_encode(['error'=>'Cannot parse AI JSON response', 'raw'=>substr($text,0,500)]);
    exit;
}

echo json_encode(['success'=>true, 'json'=>$json_obj]);
?>
