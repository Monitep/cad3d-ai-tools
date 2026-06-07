<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

function getKey() {
    $p = '/web/htdocs/www.cad3d.expert/home/ai/ideogram4-key.php';
    if (!file_exists($p)) $p = __DIR__ . '/ideogram4-key.php';
    $c = @file_get_contents($p);
    if ($c && preg_match("/'(sk-ant-[^']+)'/", $c, $m)) return $m[1];
    return null;
}

function getSP() {
    return 'You are an expert Ideogram 4 JSON prompt assistant. Convert any image idea into a structured Ideogram 4 JSON prompt.

OUTPUT RULES:
- Return valid JSON only. No markdown, no code fences, no commentary.
- Use exactly these top-level keys in this order: high_level_description, style_description, compositional_deconstruction

JSON STRUCTURE:
{
  "high_level_description": "One clear sentence describing the full scene, subject, mood, medium, time of day.",
  "style_description": {
    "aesthetics": "Overall visual treatment",
    "lighting": "Light source, direction, quality, shadows, highlights",
    "photo": "Camera/lens details (for photographic images only)",
    "art_style": "Visual language (for non-photographic only - NEVER use both photo and art_style)",
    "medium": "photograph | digital illustration | concept art | 3D render | etc.",
    "color_palette": ["#RRGGBB", "#RRGGBB"]
  },
  "compositional_deconstruction": {
    "background": "Environment, atmosphere, surfaces, depth - NOT the main subjects",
    "elements": [
      {
        "type": "obj",
        "bbox": [y_min, x_min, y_max, x_max],
        "desc": "Detailed visual description of this object/subject",
        "color_palette": ["#RRGGBB"]
      },
      {
        "type": "text",
        "bbox": [y_min, x_min, y_max, x_max],
        "text": "Exact text to render",
        "desc": "Font, size, weight, color, style description",
        "color_palette": ["#RRGGBB"]
      }
    ]
  }
}

BBOX: normalized coordinates 0-1000, format [y_min, x_min, y_max, x_max]. Origin = top-left.

RULES:
- photo format: use "photo" key (not "art_style"), medium = "photograph"
- art format: use "art_style" key (not "photo"), medium = "digital illustration" etc.
- color_palette: uppercase hex #RRGGBB, max 16 global, max 5 per element
- elements: 4-7 elements ordered background to foreground
- background: describe environment only, never main subjects
- If idea is vague, make strong creative decisions
- Produce detailed, precise, render-ready output every time';
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['status'=>'ok','key'=>!empty(getKey()),'sp_len'=>strlen(getSP())], JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit;
}

$key = getKey();
if (!$key) { http_response_code(500); echo json_encode(['error'=>'Key not found']); exit; }

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!$body || !isset($body['idea'])) {
    http_response_code(400); echo json_encode(['error'=>'Missing idea']); exit;
}

$payload = json_encode([
    'model'      => 'claude-haiku-4-5-20251001',
    'max_tokens' => 2048,
    'system'     => getSP(),
    'messages'   => [['role'=>'user','content'=>trim($body['idea'])]]
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'x-api-key: '.$key,
        'anthropic-version: 2023-06-01',
        'content-type: application/json',
    ],
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => false,
]);

$resp     = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlerr  = curl_error($ch);
curl_close($ch);

if ($curlerr) { http_response_code(502); echo json_encode(['error'=>'cURL: '.$curlerr]); exit; }
if ($httpcode !== 200) {
    http_response_code(502);
    echo json_encode(['error'=>'Anthropic HTTP '.$httpcode, 'detail'=>substr($resp,0,400)]);
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
    echo json_encode(['error'=>'Cannot parse JSON', 'raw'=>substr($text,0,400)]);
    exit;
}

echo json_encode(['success'=>true, 'json'=>$json_obj]);
?>