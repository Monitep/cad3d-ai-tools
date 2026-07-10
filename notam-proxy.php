<?php
/**
 * DroneCheck Italia — proxy server-side v3.0
 * Zone OpenAIP, NOTAM FAA AIM, METAR Aviation Weather Center.
 *
 * Importante: questo endpoint fornisce dati informativi e diagnostica.
 * Non sostituisce D-Flight, ENAV/AIS, autorizzazioni o briefing ufficiali.
 */
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const APP_VERSION = '3.0.0';
const OPENAIP_KEY = '1f30b1d752ccf615a93897fd493c488f';
const UA = 'DroneCheck-Italia/3.0 (+https://cad3d.expert/ai/drone-check.html)';

$action = strtolower(trim((string)($_GET['action'] ?? '')));
$lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT);
$lon = filter_input(INPUT_GET, 'lon', FILTER_VALIDATE_FLOAT);
$icaosRaw = strtoupper((string)($_GET['icaos'] ?? ''));
$icaos = array_values(array_unique(array_filter(
    preg_split('/[^A-Z0-9]+/', $icaosRaw) ?: [],
    static fn(string $v): bool => (bool)preg_match('/^[A-Z0-9]{4}$/', $v)
)));
$icaos = array_slice($icaos, 0, 8);

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function valid_coord(mixed $lat, mixed $lon): bool {
    return is_float($lat) && is_float($lon) && $lat >= -90 && $lat <= 90 && $lon >= -180 && $lon <= 180;
}

function now_iso(): string {
    return gmdate('c');
}

function clean_detail(string $text): string {
    $text = str_replace(OPENAIP_KEY, '[redacted]', $text);
    $text = preg_replace('/\s+/', ' ', $text) ?? $text;
    return mb_substr(trim($text), 0, 350);
}

/** @return array{code:int,body:string,via:string,error:string,contentType:string,durationMs:int} */
function http_request(string $url, string $method = 'GET', array $headers = [], ?array $form = null, int $timeout = 18): array {
    if (!function_exists('curl_init')) {
        return ['code'=>0, 'body'=>'', 'via'=>'none', 'error'=>'cURL non disponibile', 'contentType'=>'', 'durationMs'=>0];
    }

    $ch = curl_init($url);
    $allHeaders = array_merge([
        'Accept: application/json,text/plain,*/*',
        'Accept-Language: it-IT,it;q=0.9,en;q=0.7',
    ], $headers);

    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 7,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => UA,
        CURLOPT_HTTPHEADER => $allHeaders,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ];

    if ($method === 'POST') {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = http_build_query($form ?? '', '', '&');
    }

    curl_setopt_array($ch, $options);
    $started = microtime(true);
    $body = curl_exec($ch);
    $duration = (int)round((microtime(true) - $started) * 1000);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = (string)(curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: '');
    $error = curl_error($ch);
    curl_close($ch);

    return [
        'code' => $code,
        'body' => is_string($body) ? $body : '',
        'via' => 'curl',
        'error' => clean_detail($error),
        'contentType' => $contentType,
        'durationMs' => $duration,
    ];
}

function cache_file(string $key): string {
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'dronecheck_' . hash('sha256', $key) . '.json';
}

function cache_read(string $key, int $maxAge): ?array {
    $file = cache_file($key);
    if (!is_file($file) || (time() - (int)filemtime($file)) > $maxAge) return null;
    $raw = @file_get_contents($file);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data)) return null;
    $data['_cache'] = 'fresh';
    return $data;
}

function cache_read_stale(string $key, int $maxAge): ?array {
    $file = cache_file($key);
    if (!is_file($file) || (time() - (int)filemtime($file)) > $maxAge) return null;
    $raw = @file_get_contents($file);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data)) return null;
    $data['_cache'] = 'stale';
    $data['_stale'] = true;
    return $data;
}

function cache_write(string $key, array $data): void {
    $file = cache_file($key);
    @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function decode_json(string $body): ?array {
    if ($body === '') return null;
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

function parse_items(?array $data): array {
    if (!$data) return [];
    if (isset($data['items']) && is_array($data['items'])) return $data['items'];
    if (isset($data['data']) && is_array($data['data'])) return $data['data'];
    return array_is_list($data) ? $data : [];
}

function fetch_airspaces(float $lat, float $lon, int $distKm = 65): array {
    $latQ = number_format($lat, 5, '.', '');
    $lonQ = number_format($lon, 5, '.', '');
    $distKm = max(1, min(120, $distKm));
    $cacheKey = "airspaces:$latQ:$lonQ:$distKm";
    if ($cached = cache_read($cacheKey, 300)) return $cached;

    $base = 'https://api.core.openaip.net/api/airspaces';
    $query = http_build_query(['pos'=>"$latQ,$lonQ", 'dist'=>$distKm, 'limit'=>500], '', '&', PHP_QUERY_RFC3986);
    $headers = ['x-openaip-api-key: ' . OPENAIP_KEY];
    $r = http_request("$base?$query", 'GET', $headers);
    $strategy = 'pos-header';

    // Compatibilità con installazioni OpenAIP che accettano la chiave anche in query string.
    if (in_array($r['code'], [401, 403], true)) {
        $query2 = $query . '&apiKey=' . rawurlencode(OPENAIP_KEY);
        $r = http_request("$base?$query2", 'GET');
        $strategy = 'pos-query';
    }

    $decoded = decode_json($r['body']);
    $items = parse_items($decoded);
    if ($r['code'] === 200 && $decoded !== null) {
        $result = [
            'ok' => true,
            'available' => true,
            'source' => 'OpenAIP',
            'strategy' => $strategy,
            'items' => $items,
            'count' => count($items),
            'radiusKm' => $distKm,
            'fetchedAt' => now_iso(),
            'upstream' => ['status'=>$r['code'], 'durationMs'=>$r['durationMs']],
        ];
        cache_write($cacheKey, $result);
        return $result;
    }

    if ($stale = cache_read_stale($cacheKey, 86400)) {
        $stale['warning'] = 'OpenAIP non raggiungibile: mostrati ultimi dati disponibili.';
        return $stale;
    }

    return [
        'ok' => false,
        'available' => false,
        'source' => 'OpenAIP',
        'items' => [],
        'count' => 0,
        'fetchedAt' => now_iso(),
        'error' => 'Zone aeronautiche temporaneamente non disponibili',
        'diagnostic' => [
            'status' => $r['code'],
            'durationMs' => $r['durationMs'],
            'contentType' => $r['contentType'],
            'detail' => clean_detail($r['error'] ?: mb_substr($r['body'], 0, 250)),
        ],
    ];
}

function split_coord(float $value, bool $latitude): array {
    $abs = abs($value);
    $degrees = (int)floor($abs);
    $minutesFloat = ($abs - $degrees) * 60;
    $minutes = (int)floor($minutesFloat);
    $seconds = round(($minutesFloat - $minutes) * 60, 2);
    if ($seconds >= 60) { $seconds = 0; $minutes++; }
    if ($minutes >= 60) { $minutes = 0; $degrees++; }

    if ($latitude) {
        return [
            'latDegrees'=>$degrees, 'latMinutes'=>$minutes, 'latSeconds'=>$seconds,
            'latitudeDirection'=>$value >= 0 ? 'N' : 'S',
        ];
    }
    return [
        'longDegrees'=>$degrees, 'longMinutes'=>$minutes, 'longSeconds'=>$seconds,
        'longitudeDirection'=>$value >= 0 ? 'E' : 'W',
    ];
}

function faa_post(array $form): array {
    return http_request(
        'https://notams.aim.faa.gov/notamSearch/search',
        'POST',
        [
            'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
            'Origin: https://notams.aim.faa.gov',
            'Referer: https://notams.aim.faa.gov/notamSearch/',
            'X-Requested-With: XMLHttpRequest',
        ],
        $form,
        25
    );
}

function extract_notam_text(array $item): string {
    foreach (['icaoMessage','traditionalMessage','message','text','notamText'] as $key) {
        if (!empty($item[$key]) && is_string($item[$key])) return trim(strip_tags($item[$key]));
    }
    return '';
}

function parse_notam_field(string $text, string $field): ?string {
    if (preg_match('/(?:^|\s)' . preg_quote($field, '/') . '\)\s*([^\r\n]+)/i', $text, $m)) return trim($m[1]);
    return null;
}

function normalize_notam(array $item): array {
    $text = extract_notam_text($item);
    $id = '';
    foreach (['notamNumber','notamID','notamId','id','number'] as $key) {
        if (isset($item[$key]) && (is_string($item[$key]) || is_numeric($item[$key]))) { $id = trim((string)$item[$key]); break; }
    }
    if ($id === '' && preg_match('/\b([A-Z]\d{4}\/\d{2})\b/', $text, $m)) $id = $m[1];
    if ($id === '') $id = substr(hash('sha1', $text . json_encode($item)), 0, 10);

    $location = '';
    foreach (['icaoLocation','location','designator','accountId'] as $key) {
        if (!empty($item[$key])) { $location = trim((string)$item[$key]); break; }
    }
    if ($location === '') $location = (string)(parse_notam_field($text, 'A') ?? '');

    $start = null;
    $end = null;
    foreach (['startDate','startTime','effectiveStart','effectiveStartDate'] as $key) if (!empty($item[$key])) { $start = (string)$item[$key]; break; }
    foreach (['endDate','endTime','effectiveEnd','effectiveEndDate'] as $key) if (!empty($item[$key])) { $end = (string)$item[$key]; break; }
    $start ??= parse_notam_field($text, 'B');
    $end ??= parse_notam_field($text, 'C');

    return [
        'id' => $id,
        'location' => $location,
        'startTime' => $start,
        'endTime' => $end,
        'text' => $text,
        'issueDate' => $item['issueDate'] ?? null,
        'source' => 'FAA AIM',
    ];
}

function dedupe_notams(array $items): array {
    $seen = [];
    $out = [];
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $n = normalize_notam($item);
        $key = $n['id'] . '|' . hash('sha1', $n['text']);
        if (isset($seen[$key])) continue;
        $seen[$key] = true;
        $out[] = $n;
    }
    return $out;
}

function fetch_notams_geo(float $lat, float $lon, array $icaos = [], int $radiusNm = 45): array {
    $latQ = number_format($lat, 3, '.', '');
    $lonQ = number_format($lon, 3, '.', '');
    $radiusNm = max(5, min(100, $radiusNm));
    $cacheKey = 'notam:' . $latQ . ':' . $lonQ . ':' . implode(',', $icaos) . ':' . $radiusNm;
    if ($cached = cache_read($cacheKey, 240)) return $cached;

    $form = array_merge([
        'searchType' => 3,
        'notamsOnly' => 'false',
        'radius' => $radiusNm,
        'radiusSearchOnDesignator' => 'false',
        'offset' => 0,
    ], split_coord($lat, true), split_coord($lon, false));

    $all = [];
    $r = faa_post($form);
    $data = decode_json($r['body']);
    $geoOk = $r['code'] === 200 && is_array($data) && isset($data['notamList']) && is_array($data['notamList']);
    if ($geoOk) $all = $data['notamList'];

    $fallbackDiagnostics = [];
    if (!$geoOk || count($all) === 0) {
        foreach (array_slice($icaos, 0, 6) as $icao) {
            $rf = faa_post([
                'searchType'=>0,
                'designatorsForLocation'=>$icao,
                'offset'=>0,
                'notamsOnly'=>'false',
                'radius'=>10,
            ]);
            $df = decode_json($rf['body']);
            $fallbackDiagnostics[] = ['icao'=>$icao, 'status'=>$rf['code'], 'durationMs'=>$rf['durationMs']];
            if ($rf['code'] === 200 && is_array($df) && isset($df['notamList']) && is_array($df['notamList'])) {
                $all = array_merge($all, $df['notamList']);
            }
        }
    }

    if ($geoOk || count($all) > 0) {
        $items = dedupe_notams($all);
        $result = [
            'ok' => true,
            'available' => true,
            'source' => 'FAA AIM NOTAM Search',
            'strategy' => $geoOk ? 'gps-radius' : 'nearby-airports',
            'items' => $items,
            'count' => count($items),
            'radiusNm' => $radiusNm,
            'fetchedAt' => now_iso(),
            'upstream' => ['status'=>$r['code'], 'durationMs'=>$r['durationMs']],
            'fallback' => $fallbackDiagnostics,
            'officialUrl' => 'https://notams.aim.faa.gov/notamSearch/',
        ];
        cache_write($cacheKey, $result);
        return $result;
    }

    if ($stale = cache_read_stale($cacheKey, 21600)) {
        $stale['warning'] = 'Servizio NOTAM non raggiungibile: mostrati dati precedenti. Verifica sul portale ufficiale.';
        return $stale;
    }

    return [
        'ok' => false,
        'available' => false,
        'source' => 'FAA AIM NOTAM Search',
        'items' => [],
        'count' => 0,
        'fetchedAt' => now_iso(),
        'error' => 'NOTAM live non disponibili: è obbligatoria la verifica manuale sul portale ufficiale.',
        'officialUrl' => 'https://notams.aim.faa.gov/notamSearch/',
        'diagnostic' => [
            'status'=>$r['code'], 'durationMs'=>$r['durationMs'],
            'contentType'=>$r['contentType'],
            'detail'=>clean_detail($r['error'] ?: mb_substr($r['body'], 0, 250)),
            'fallback'=>$fallbackDiagnostics,
        ],
    ];
}

function fetch_metar(array $icaos): array {
    $icaos = array_slice(array_values(array_unique($icaos)), 0, 8);
    $cacheKey = 'metar:' . implode(',', $icaos);
    if ($cached = cache_read($cacheKey, 120)) return $cached;

    if (!$icaos) {
        return ['ok'=>false, 'available'=>false, 'items'=>[], 'error'=>'Nessun aeroporto ICAO specificato', 'fetchedAt'=>now_iso()];
    }

    $url = 'https://aviationweather.gov/api/data/metar?' . http_build_query([
        'ids'=>implode(',', $icaos), 'format'=>'json', 'hours'=>3,
    ], '', '&', PHP_QUERY_RFC3986);
    $r = http_request($url, 'GET');
    if ($r['code'] === 204) {
        return ['ok'=>true, 'available'=>true, 'source'=>'Aviation Weather Center', 'items'=>[], 'count'=>0, 'fetchedAt'=>now_iso(), 'upstream'=>['status'=>204, 'durationMs'=>$r['durationMs']]];
    }
    $data = decode_json($r['body']);
    $items = parse_items($data);
    if ($r['code'] === 200 && $data !== null) {
        $result = [
            'ok'=>true, 'available'=>true, 'source'=>'NOAA Aviation Weather Center',
            'items'=>$items, 'count'=>count($items), 'fetchedAt'=>now_iso(),
            'upstream'=>['status'=>$r['code'], 'durationMs'=>$r['durationMs']],
        ];
        cache_write($cacheKey, $result);
        return $result;
    }

    if ($stale = cache_read_stale($cacheKey, 7200)) {
        $stale['warning'] = 'Meteo non aggiornato: mostrato ultimo METAR disponibile.';
        return $stale;
    }

    return [
        'ok'=>false, 'available'=>false, 'source'=>'NOAA Aviation Weather Center', 'items'=>[],
        'fetchedAt'=>now_iso(), 'error'=>'METAR temporaneamente non disponibile',
        'diagnostic'=>['status'=>$r['code'], 'durationMs'=>$r['durationMs'], 'detail'=>clean_detail($r['error'] ?: mb_substr($r['body'], 0, 250))],
    ];
}

if ($action === 'test') {
    respond([
        'ok'=>true,
        'app'=>'DroneCheck Italia proxy',
        'version'=>APP_VERSION,
        'php'=>PHP_VERSION,
        'curl'=>function_exists('curl_init'),
        'openssl'=>extension_loaded('openssl'),
        'tempWritable'=>is_writable(sys_get_temp_dir()),
        'server'=>$_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'time'=>now_iso(),
    ]);
}

if ($action === 'airspaces') {
    if (!valid_coord($lat, $lon)) respond(['ok'=>false, 'error'=>'Coordinate lat/lon non valide'], 400);
    respond(fetch_airspaces((float)$lat, (float)$lon));
}

if ($action === 'notam') {
    if (!valid_coord($lat, $lon)) respond(['ok'=>false, 'error'=>'Coordinate lat/lon non valide'], 400);
    respond(fetch_notams_geo((float)$lat, (float)$lon, $icaos));
}

if ($action === 'metar') {
    if (!$icaos) respond(['ok'=>false, 'error'=>'Parametro icaos richiesto'], 400);
    respond(fetch_metar($icaos));
}

if ($action === 'selftest' || $action === 'health') {
    $testLat = valid_coord($lat, $lon) ? (float)$lat : 45.84;
    $testLon = valid_coord($lat, $lon) ? (float)$lon : 8.80;
    $testIcaos = $icaos ?: ['LIMC','LSZA','LIME','LIML'];
    $started = microtime(true);
    $air = fetch_airspaces($testLat, $testLon, 65);
    $met = fetch_metar($testIcaos);
    $not = fetch_notams_geo($testLat, $testLon, $testIcaos, 45);
    respond([
        'proxy'=>['ok'=>true, 'version'=>APP_VERSION, 'time'=>now_iso()],
        'position'=>['lat'=>$testLat, 'lon'=>$testLon],
        'airspaces'=>['ok'=>$air['ok'] ?? false, 'available'=>$air['available'] ?? false, 'count'=>$air['count'] ?? 0, 'strategy'=>$air['strategy'] ?? null, 'diagnostic'=>$air['diagnostic'] ?? null],
        'metar'=>['ok'=>$met['ok'] ?? false, 'available'=>$met['available'] ?? false, 'count'=>$met['count'] ?? 0, 'diagnostic'=>$met['diagnostic'] ?? null],
        'notam'=>['ok'=>$not['ok'] ?? false, 'available'=>$not['available'] ?? false, 'count'=>$not['count'] ?? 0, 'strategy'=>$not['strategy'] ?? null, 'diagnostic'=>$not['diagnostic'] ?? null],
        'durationMs'=>(int)round((microtime(true)-$started)*1000),
    ]);
}

respond(['ok'=>false, 'error'=>'Azione valida: test, selftest, airspaces, notam, metar'], 400);
