<?php
/*
 * Timelapse Grabber - server-side proxy
 * CAD3D.Expert
 *
 * Modalita:
 *   ?url=PAGINA        -> estrae gli URL video dalla pagina (JSON)
 *   ?dl=1&url=VIDEO    -> scarica il video forzando il download (stream)
 */

// ---- CORS / headers base ----
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$UA = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

// ---- utilita ----
function bad($msg, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_SLASHES);
    exit;
}

function host_of($u) {
    $h = parse_url($u, PHP_URL_HOST);
    return $h ? strtolower($h) : '';
}

// Blocca IP privati / locali (SSRF di base)
function is_public_host($host) {
    if ($host === '' ) return false;
    $bad = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (in_array($host, $bad, true)) return false;
    $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }
    }
    return true;
}

$url = isset($_GET['url']) ? trim($_GET['url']) : '';
$dl  = isset($_GET['dl']) && $_GET['dl'] == '1';

if ($url === '' || !preg_match('#^https?://#i', $url)) {
    bad('URL mancante o non valido.');
}
if (!is_public_host(host_of($url))) {
    bad('Host non consentito.', 403);
}

/* =========================================================
 *  MODALITA DOWNLOAD: stream del video con attachment
 * ========================================================= */
if ($dl) {
    $host = host_of($url);
    // Consenti solo domini skylinewebcams per il proxy download
    if (!preg_match('/skylinewebcams\.com$/', $host)) {
        bad('Download consentito solo da skylinewebcams.com. Usa "Apri diretto".', 403);
    }

    $fname = isset($_GET['name']) ? preg_replace('/[^A-Za-z0-9._-]/', '_', $_GET['name']) : '';
    if ($fname === '') {
        $path = parse_url($url, PHP_URL_PATH);
        $fname = $path ? basename($path) : 'timelapse.mp4';
    }
    if (!preg_match('/\.(mp4|webm|m3u8|ts)$/i', $fname)) $fname .= '.mp4';

    set_time_limit(0);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_USERAGENT      => $UA,
        CURLOPT_HTTPHEADER     => ['Referer: https://www.skylinewebcams.com/'],
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT        => 90,
        CURLOPT_HEADER         => false,
        CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) {
            echo $chunk;
            flush();
            return strlen($chunk);
        },
        CURLOPT_HEADERFUNCTION => function ($ch, $line) {
            if (stripos($line, 'Content-Type:') === 0) {
                header(trim($line));
            }
            return strlen($line);
        },
    ]);

    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $fname . '"');

    $ok = curl_exec($ch);
    curl_close($ch);
    exit;
}

/* =========================================================
 *  MODALITA ESTRAZIONE: scarica la pagina e cerca i video
 * ========================================================= */

// Fetch della pagina
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_USERAGENT      => $UA,
    CURLOPT_HTTPHEADER     => [
        'Accept-Language: it-IT,it;q=0.9,en;q=0.8',
        'Accept: text/html,application/xhtml+xml',
    ],
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_COOKIEJAR      => '',
    CURLOPT_COOKIEFILE     => '',
]);
$html = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($html === false || $html === '') {
    bad('Impossibile scaricare la pagina: ' . ($err ?: ('HTTP ' . $code)), 502);
}

$found = [];
$add = function ($u, $type) use (&$found, $url) {
    if (!$u) return;
    $u = html_entity_decode(trim($u), ENT_QUOTES);
    // normalizza protocollo relativo e path relativi
    if (strpos($u, '//') === 0) $u = 'https:' . $u;
    if (strpos($u, '/') === 0)  $u = 'https://' . host_of($url) . $u;
    if (!preg_match('#^https?://#i', $u)) return;
    foreach ($found as $f) { if ($f['url'] === $u) return; }
    $ext = 'video';
    if (preg_match('/\.(mp4|m3u8|webm|ts)/i', $u, $m)) $ext = strtoupper($m[1]);
    $found[] = ['url' => $u, 'type' => $type, 'ext' => $ext];
};

// 1) URL .mp4 diretti ovunque nell'HTML
if (preg_match_all('#https?://[^\s"\'<>\\\\]+\.mp4[^\s"\'<>\\\\]*#i', $html, $m)) {
    foreach ($m[0] as $u) $add($u, 'MP4 diretto');
}

// 2) URL .m3u8 (HLS)
if (preg_match_all('#https?://[^\s"\'<>\\\\]+\.m3u8[^\s"\'<>\\\\]*#i', $html, $m)) {
    foreach ($m[0] as $u) $add($u, 'HLS (m3u8)');
}

// 2b) URL protocol-relative //host/....mp4|m3u8|webm
if (preg_match_all('#["\'](//[^\s"\'<>\\\\]+\.(?:mp4|m3u8|webm)[^\s"\'<>\\\\]*)["\']#i', $html, $m)) {
    foreach ($m[1] as $u) $add($u, 'URL relativo');
}

// 3) pattern SkylineWebcams live: source:'livee.m3u8?a=...'
if (preg_match_all('#(?:url|source|file)\s*:\s*["\'](livee?\.m3u8[^"\']*)["\']#i', $html, $m)) {
    foreach ($m[1] as $p) {
        $p = str_replace('livee.', 'live.', $p);
        $add('https://hd-auth.skylinewebcams.com/' . $p, 'SkylineWebcams HLS');
    }
}

// 4) chiavi tipiche in JSON/JS: videoUrl, contentUrl, file, src, hls (chiave anche non quotata)
if (preg_match_all('#["\']?(?:videoUrl|contentUrl|embedUrl|file|src|hls|source|mp4|video)["\']?\s*[:=]\s*["\']([^"\']+\.(?:mp4|m3u8|webm)[^"\']*)["\']#i', $html, $m)) {
    foreach ($m[1] as $u) $add($u, 'Config player');
}

// 5) LD+JSON (contentUrl / embedUrl / video.contentUrl)
if (preg_match_all('#<script[^>]+application/ld\+json[^>]*>(.*?)</script>#is', $html, $m)) {
    foreach ($m[1] as $block) {
        $j = json_decode(trim($block), true);
        if (is_array($j)) {
            $stack = [$j];
            while ($stack) {
                $node = array_pop($stack);
                if (!is_array($node)) continue;
                foreach (['contentUrl', 'embedUrl'] as $k) {
                    if (!empty($node[$k]) && is_string($node[$k])) $add($node[$k], 'LD+JSON');
                }
                foreach ($node as $v) if (is_array($v)) $stack[] = $v;
            }
        }
    }
}

// 6) og:video meta
if (preg_match('#<meta[^>]+property=["\']og:video(?::url)?["\'][^>]+content=["\']([^"\']+)["\']#i', $html, $m)) {
    $add($m[1], 'OG:Video');
}

// Ordina: MP4 prima (piu facile da scaricare)
usort($found, function ($a, $b) {
    $pa = ($a['ext'] === 'MP4') ? 0 : 1;
    $pb = ($b['ext'] === 'MP4') ? 0 : 1;
    return $pa - $pb;
});

// Nome file suggerito dallo slug pagina
$slug = 'timelapse';
if (preg_match('#/webcam/(?:[^/]+/)*([^/]+)/timelapse\.html#i', $url, $m)) {
    $slug = $m[1];
} elseif (preg_match('#/([^/]+)\.html#i', $url, $m)) {
    $slug = $m[1];
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok'     => true,
    'count'  => count($found),
    'slug'   => $slug,
    'videos' => $found,
], JSON_UNESCAPED_SLASHES);
