<?php
/**
 * DroneCheck Proxy — cad3d.expert/ai/notam-proxy.php
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('OAIP_KEY', '1f30b1d752ccf615a93897fd493c488f');

$action = $_GET['action'] ?? '';
$lat    = isset($_GET['lat'])   ? round((float)$_GET['lat'], 6) : null;
$lon    = isset($_GET['lon'])   ? round((float)$_GET['lon'], 6) : null;
$icaos  = isset($_GET['icaos']) ? preg_replace('/[^A-Z0-9,]/', '', strtoupper($_GET['icaos'])) : '';

// ── TEST ──────────────────────────────────────────────────────────────────────
if ($action === 'test') {
    echo json_encode([
        'ok'           => true,
        'php'          => PHP_VERSION,
        'curl'         => function_exists('curl_init'),
        'fopen'        => (bool)ini_get('allow_url_fopen'),
        'server'       => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'time'         => date('c'),
    ]);
    exit;
}

// ── FETCH ─────────────────────────────────────────────────────────────────────
function get_url(string $url, array $hdrs = []): array {
    // Try curl first
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 12,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT      => 'DroneCheck/2.0 (+https://cad3d.expert)',
            CURLOPT_HTTPHEADER     => $hdrs,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);
        return ['code' => $code, 'body' => $body, 'via' => 'curl', 'err' => $err];
    }
    // Fallback: file_get_contents
    if (!ini_get('allow_url_fopen')) {
        return ['code' => 0, 'body' => '', 'via' => 'none', 'err' => 'curl and fopen both disabled'];
    }
    $h = "User-Agent: DroneCheck/2.0\r\nAccept: application/json\r\n";
    foreach ($hdrs as $hdr) $h .= $hdr . "\r\n";
    $ctx  = stream_context_create(['http' => ['method' => 'GET', 'header' => $h,
        'timeout' => 12, 'ignore_errors' => true, 'ssl' => ['verify_peer' => false]]]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (!empty($http_response_header)) {
        foreach ($http_response_header as $h2) {
            if (preg_match('#HTTP/\S+\s+(\d+)#', $h2, $m)) $code = (int)$m[1];
        }
    }
    return ['code' => $code, 'body' => $body ?: '', 'via' => 'fopen', 'err' => ''];
}

// ── NOTAM ─────────────────────────────────────────────────────────────────────
if ($action === 'notam') {
    if (!$lat || !$lon) { http_response_code(400); echo json_encode(['error'=>'lat/lon required']); exit; }
    $pad = 0.8;
    $w = number_format($lon-$pad,3,'.',''); $s = number_format($lat-$pad,3,'.','');
    $e = number_format($lon+$pad,3,'.',''); $n = number_format($lat+$pad,3,'.','');
    $url = "https://aviationweather.gov/api/data/notam?format=json&bbox={$w},{$s},{$e},{$n}&limit=100";
    $r = get_url($url);
    if ($r['code'] === 200 && $r['body']) { echo $r['body']; exit; }
    http_response_code(502);
    echo json_encode(['error'=>"NOTAM HTTP {$r['code']}", 'via'=>$r['via'], 'detail'=>$r['err']]);
    exit;
}

// ── AIRSPACES ─────────────────────────────────────────────────────────────────
if ($action === 'airspaces') {
    if (!$lat || !$lon) { http_response_code(400); echo json_encode(['error'=>'lat/lon required']); exit; }
    $pad = 0.6;
    $mnlo=number_format($lon-$pad,4,'.',''); $mnla=number_format($lat-$pad,4,'.','');
    $mxlo=number_format($lon+$pad,4,'.',''); $mxla=number_format($lat+$pad,4,'.','');
    $hdrs = ['x-openaip-api-key: '.OAIP_KEY, 'Accept: application/json'];

    // Try bbox
    $r = get_url("https://api.core.openaip.net/api/airspaces?bbox={$mnlo},{$mnla},{$mxlo},{$mxla}&limit=300", $hdrs);
    if ($r['code'] === 200 && $r['body']) {
        $d = json_decode($r['body'], true);
        $items = $d['items'] ?? $d['data'] ?? (is_array($d)?$d:[]);
        if (count($items) > 0) { echo json_encode(['items'=>$items,'strategy'=>'bbox']); exit; }
    }
    // Try geometry polygon
    $poly = urlencode(json_encode(['type'=>'Polygon','coordinates'=>[[
        [$lon-$pad,$lat-$pad],[$lon+$pad,$lat-$pad],
        [$lon+$pad,$lat+$pad],[$lon-$pad,$lat+$pad],[$lon-$pad,$lat-$pad]
    ]]]));
    $r2 = get_url("https://api.core.openaip.net/api/airspaces?geometry={$poly}&limit=300", $hdrs);
    if ($r2['code'] === 200 && $r2['body']) {
        $d2 = json_decode($r2['body'], true);
        $items2 = $d2['items'] ?? $d2['data'] ?? (is_array($d2)?$d2:[]);
        echo json_encode(['items'=>$items2,'strategy'=>'geom','bbox_code'=>$r['code'],'via'=>$r2['via']]);
        exit;
    }
    http_response_code(502);
    echo json_encode(['error'=>"OpenAIP bbox={$r['code']} geom={$r2['code']}",'via'=>$r['via'],'items'=>[]]);
    exit;
}

// ── METAR ─────────────────────────────────────────────────────────────────────
if ($action === 'metar') {
    if (!$icaos) { http_response_code(400); echo json_encode(['error'=>'icaos required']); exit; }
    $url = "https://aviationweather.gov/api/data/metar?ids=".urlencode($icaos)."&format=json&hours=2";
    $r = get_url($url);
    if ($r['code'] === 200 && $r['body']) { echo $r['body']; exit; }
    http_response_code(502);
    echo json_encode(['error'=>"METAR HTTP {$r['code']}","via"=>$r['via']]);
    exit;
}

http_response_code(400);
echo json_encode(['error'=>'action must be: test, notam, airspaces, metar']);
