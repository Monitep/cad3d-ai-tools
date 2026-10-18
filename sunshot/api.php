<?php
/*
 * SunShot: ponte verso weatherstack (apilayer).
 * La chiave resta sul server e non arriva mai al browser.
 * Uso: api.php?q=Varese  oppure  api.php?q=45.8206,8.8251
 */
declare(strict_types=1);

// La chiave NON sta nel repository: si carica a mano via FTP in
// /ai/weatherstack-key.php (accanto a ideogram4-key.php).
const KEY_FILE = __DIR__ . '/../weatherstack-key.php';
const CACHE_TTL = 1800; // secondi in cui una risposta viene riutilizzata (risparmia quota)
const RATE_MAX  = 30;   // richieste massime per IP in un'ora

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if (in_array($origin, ['https://www.cad3d.expert', 'https://cad3d.expert'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

function out(array $a, int $code = 200): void {
    http_response_code($code);
    echo json_encode($a, JSON_UNESCAPED_UNICODE);
    exit;
}

$keyTxt = is_file(KEY_FILE) ? (string)@file_get_contents(KEY_FILE) : '';
if (!preg_match('/[\'"]([A-Za-z0-9]{16,64})[\'"]/', $keyTxt, $km)) {
    out(['ok' => false, 'error' => 'Meteo non ancora attivo: manca il file weatherstack-key.php nella cartella ai del sito.'], 500);
}
define('WEATHERSTACK_KEY', $km[1]);

$q = trim((string)($_GET['q'] ?? ''));
if (strlen($q) < 2 || strlen($q) > 200 || !preg_match('/^[\p{L}\p{N}\s,.\'’\-]+$/u', $q)) {
    out(['ok' => false, 'error' => 'Località non valida: usa lettere, numeri, spazi e virgole.'], 400);
}

// Cartella di lavoro per cache e limite richieste (protetta da accesso web)
$dir = __DIR__ . '/cache';
$canStore = is_dir($dir) || @mkdir($dir, 0755, true);
if ($canStore && !file_exists($dir . '/.htaccess')) {
    @file_put_contents($dir . '/.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
}

// Cache: stessa località negli ultimi 30 minuti = nessuna nuova chiamata
$cacheFile = $canStore ? $dir . '/c_' . sha1(function_exists('mb_strtolower') ? mb_strtolower($q, 'UTF-8') : strtolower($q)) . '.json' : '';
if ($cacheFile && is_file($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
    $cached = json_decode((string)file_get_contents($cacheFile), true);
    if (is_array($cached)) { $cached['cached'] = true; out($cached); }
}

// Limite di richieste per IP (protegge la quota da abusi)
if ($canStore) {
    $ip = (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'x');
    $rlFile = $dir . '/r_' . sha1($ip) . '.json';
    $hits = is_file($rlFile) ? (json_decode((string)file_get_contents($rlFile), true) ?: []) : [];
    $now = time();
    $hits = array_values(array_filter($hits, static fn($t) => is_int($t) && $t > $now - 3600));
    if (count($hits) >= RATE_MAX) {
        out(['ok' => false, 'error' => 'Troppe richieste meteo in un’ora da questa connessione. Riprova più tardi.'], 429);
    }
    $hits[] = $now;
    @file_put_contents($rlFile, json_encode($hits), LOCK_EX);
}

function ws_get(string $scheme, string $q): ?array {
    $url = $scheme . '://api.weatherstack.com/current?' . http_build_query([
        'access_key' => WEATHERSTACK_KEY, 'query' => $q, 'units' => 'm',
    ]);
    $body = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 9,
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['timeout' => 9]]);
        $body = @file_get_contents($url, false, $ctx);
    }
    if (!is_string($body) || $body === '') return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

// Prima HTTPS; se il piano gratuito non lo consente (errore 105) si ripiega su HTTP.
// La chiamata avviene tra server, quindi il browser resta comunque su HTTPS.
$data = ws_get('https', $q);
if ($data === null || (int)($data['error']['code'] ?? 0) === 105) {
    $data = ws_get('http', $q);
}
if ($data === null) {
    out(['ok' => false, 'error' => 'Il servizio meteo non risponde. Riprova tra poco.'], 502);
}
if (isset($data['error']) || (isset($data['success']) && $data['success'] === false)) {
    $code = (int)($data['error']['code'] ?? 0);
    $msgs = [
        101 => 'Chiave weatherstack non valida: controlla il file weatherstack-key.php.',
        102 => 'Account weatherstack non attivo.',
        104 => 'Quota mensile di weatherstack esaurita.',
        601 => 'Località mancante.',
        615 => 'Località non trovata: prova con un nome diverso o con le coordinate.',
    ];
    out(['ok' => false, 'error' => $msgs[$code] ?? ('Errore dal servizio meteo (codice ' . $code . ').')], 502);
}

$l = $data['location'] ?? [];
$c = $data['current'] ?? [];
$pick = static function (array $src, array $keys): array {
    $r = [];
    foreach ($keys as $k) { if (array_key_exists($k, $src)) $r[$k] = $src[$k]; }
    return $r;
};
$res = [
    'ok' => true,
    'location' => $pick($l, ['name', 'region', 'country', 'lat', 'lon', 'timezone_id', 'localtime']),
    'current'  => $pick($c, ['temperature', 'weather_descriptions', 'wind_speed', 'wind_degree', 'wind_dir',
                              'precip', 'humidity', 'cloudcover', 'feelslike', 'uv_index', 'visibility', 'is_day']),
];
if ($cacheFile) @file_put_contents($cacheFile, json_encode($res, JSON_UNESCAPED_UNICODE), LOCK_EX);
$res['cached'] = false;
out($res);
