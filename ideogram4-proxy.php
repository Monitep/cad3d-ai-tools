<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// La key viene ricostruita a runtime da parti
// (sostituire PART_A e PART_B con i valori base64 della propria key)
function getKey() {
    $a = getenv('ANTHROPIC_KEY');
    if ($a) return $a;
    // fallback: leggi da file con path assoluto hardcoded
    $paths = [
        '/web/htdocs/www.cad3d.expert/home/ai/ideogram4-key.php',
        __DIR__ . '/ideogram4-key.php',
        dirname(__DIR__) . '/ai/ideogram4-key.php',
    ];
    foreach ($paths as $p) {
        if (file_exists($p)) {
            $content = file_get_contents($p);
            if (preg_match("/'(sk-ant-[^']+)'/", $content, $m)) return $m[1];
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $key = getKey();
    $sp  = '/web/htdocs/www.cad3d.expert/home/ai/ideogram4-system-prompt.txt';
    echo json_encode([
        'status'      => 'proxy ok',
        'php'         => PHP_VERSION,
        'dir'         => __DIR__,
        'key_found'   => !empty($key),
        'key_prefix'  => $key ? substr($key,0,15).'...' : 'NOT FOUND',
        'prompt_abs'  => file_exists($sp),
        'prompt_dir'  => file_exists(__DIR__.'/ideogram4-system-prompt.txt'),
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit;
}

$ANTHROPIC_API_KEY = getKey();
if (!$ANTHROPIC_API_KEY) {
    http_response_code(500);
    echo json_encode(['error'=>'API key not found in any location']);
    exit;
}

// System prompt con path assoluto
$sp_paths = [
    '/web/htdocs/www.cad3d.expert/home/ai/ideogram4-system-prompt.txt',
    __DIR__ . '/ideogram4-system-prompt.txt',
];
$system_prompt = null;
foreach ($sp_paths as $p) {
    $tmp = @file_get_contents($p);
    if ($tmp) { $system_prompt = $tmp; break; }
}
if (!$system_prompt) {
    http_response_code(500);
    echo json_encode(['error'=>'System prompt not found', 'tried'=>$sp_paths]);
    exit;
}

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!empty($body['test'])) {
    echo json_encode(['test_ok'=>true, 'key_prefix'=>substr($ANTHROPIC_API_KEY,0,15).'...', 'prompt_len'=>strlen($system_prompt)]);
    exit;
}

if (!$body || !isset($body['idea'])) {
    http_response_code(400); echo json_encode(['error'=>'Missing idea field']); exit;
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
