<?php
/**
 * DroneCheck Proxy — cad3d.expert
 * Proxies: NOTAM (aviationweather.gov), Airspaces (OpenAIP), METAR (aviationweather.gov)
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');

// ── CONFIG ────────────────────────────────────────────────────────────────────
define('OAIP_KEY', '1f30b1d752ccf615a93897fd493c488f');
define('TIMEOUT', 15);

// ── INPUT ─────────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$lat    = isset($_GET['lat']) ? round((float)$_GET['lat'], 6) : null;
$lon    = isset($_GET['lon']) ? round((float)$_GET['lon'], 6) : null;
$icaos  = isset($_GET['icaos']) ? preg_replace('/[^A-Z0-9,]/', '', strtoupper($_GET['icaos'])) : '';

if (!in_array($action, ['notam','airspaces','metar'])) {
    http_response_code(400);
    echo json_encode(['error' => 'action must be notam, airspaces or metar']);
    exit;
}

// ── FETCH HELPER ──────────────────────────────────────────────────────────────
function fetch_url(string $url, array $headers = []): array {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => TIMEOUT,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'DroneCheck/2.0 (cad3d.expert)',
            CURLOPT_HTTPHEADER     => $headers,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);
        return ['code' => $code, 'body' => $body ?: '', 'error' => $err];
    }
    // fallback: file_get_contents
    $ctx_headers = implode("\r\n", $headers);
    $ctx = stream_context_create(['http' => [
        'timeout' => TIMEOUT,
        'header'  => "User-Agent: DroneCheck/2.0\r\n" . $ctx_headers,
        'ignore_errors' => true,
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $h) {
            if (preg_match('#HTTP/\S+ (\d+)#', $h, $m)) $code = (int)$m[1];
        }
    }
    return ['code' => $code, 'body' => $body ?: '', 'error' => ''];
}

// ── NOTAM ─────────────────────────────────────────────────────────────────────
if ($action === 'notam') {
    if (!$lat || !$lon) { http_response_code(400); echo json_encode(['error'=>'lat/lon required']); exit; }
    $pad = 0.8;
    $w = number_format($lon - $pad, 3, '.', '');
    $s = number_format($lat - $pad, 3, '.', '');
    $e = number_format($lon + $pad, 3, '.', '');
    $n = number_format($lat + $pad, 3, '.', '');
    $url = "https://aviationweather.gov/api/data/notam?format=json&bbox={$w},{$s},{$e},{$n}&limit=100";
    $res = fetch_url($url);
    if ($res['code'] === 200 && $res['body']) {
        echo $res['body'];
    } else {
        http_response_code(502);
        echo json_encode(['error' => "NOTAM upstream HTTP {$res['code']}", 'curl_error' => $res['error']]);
    }
    exit;
}

// ── AIRSPACES (OpenAIP) ───────────────────────────────────────────────────────
if ($action === 'airspaces') {
    if (!$lat || !$lon) { http_response_code(400); echo json_encode(['error'=>'lat/lon required']); exit; }
    $pad = 0.6;
    $minLon = number_format($lon - $pad, 4, '.', '');
    $minLat = number_format($lat - $pad, 4, '.', '');
    $maxLon = number_format($lon + $pad, 4, '.', '');
    $maxLat = number_format($lat + $pad, 4, '.', '');

    // Try bbox first
    $url = "https://api.core.openaip.net/api/airspaces?bbox={$minLon},{$minLat},{$maxLon},{$maxLat}&limit=300";
    $res = fetch_url($url, ['x-openaip-api-key: ' . OAIP_KEY, 'Accept: application/json']);
    if ($res['code'] === 200 && $res['body']) {
        $data = json_decode($res['body'], true);
        $items = $data['items'] ?? $data['data'] ?? (is_array($data) ? $data : []);
        if (count($items) > 0) {
            echo json_encode(['items' => $items, 'strategy' => 'bbox']);
            exit;
        }
    }

    // Fallback: geometry polygon
    $poly = json_encode(['type'=>'Polygon','coordinates'=>[[
        [$lon-$pad,$lat-$pad],[$lon+$pad,$lat-$pad],
        [$lon+$pad,$lat+$pad],[$lon-$pad,$lat+$pad],[$lon-$pad,$lat-$pad]
    ]]]);
    $url2 = "https://api.core.openaip.net/api/airspaces?geometry=" . urlencode($poly) . "&limit=300";
    $res2 = fetch_url($url2, ['x-openaip-api-key: ' . OAIP_KEY, 'Accept: application/json']);
    if ($res2['code'] === 200 && $res2['body']) {
        $data2 = json_decode($res2['body'], true);
        $items2 = $data2['items'] ?? $data2['data'] ?? (is_array($data2) ? $data2 : []);
        echo json_encode(['items' => $items2, 'strategy' => 'geometry', 'debug_bbox_code' => $res['code']]);
        exit;
    }

    http_response_code(502);
    echo json_encode(['error' => "OpenAIP bbox={$res['code']} geom={$res2['code']}", 'items' => []]);
    exit;
}

// ── METAR ─────────────────────────────────────────────────────────────────────
if ($action === 'metar') {
    if (!$icaos) { http_response_code(400); echo json_encode(['error'=>'icaos required']); exit; }
    $url = "https://aviationweather.gov/api/data/metar?ids=" . urlencode($icaos) . "&format=json&hours=2";
    $res = fetch_url($url);
    if ($res['code'] === 200 && $res['body']) {
        echo $res['body'];
    } else {
        http_response_code(502);
        echo json_encode(['error' => "METAR upstream HTTP {$res['code']}"]);
    }
    exit;
}
