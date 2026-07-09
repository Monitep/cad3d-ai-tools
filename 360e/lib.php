<?php
// 360e - Funzioni condivise
if (!headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}

function load_config() {
    static $cfg = null;
    if ($cfg === null) $cfg = require __DIR__ . '/config.php';
    return $cfg;
}

function data_dir() { return __DIR__ . '/data'; }

function get_admin_hash() {
    $f = data_dir() . '/_admin.php';
    if (file_exists($f)) {
        $h = include $f;
        if (is_string($h) && $h !== '') return $h;
    }
    return load_config()['admin_password_hash'];
}

function set_admin_hash($hash) {
    if (!is_dir(data_dir())) mkdir(data_dir(), 0755, true);
    return file_put_contents(data_dir() . '/_admin.php',
        "<?php\nreturn " . var_export($hash, true) . ";\n") !== false;
}

function slugify($t) {
    $map = ['à'=>'a','á'=>'a','è'=>'e','é'=>'e','ì'=>'i','í'=>'i','ò'=>'o','ó'=>'o','ù'=>'u','ú'=>'u','ç'=>'c','ñ'=>'n',
            'À'=>'a','Á'=>'a','È'=>'e','É'=>'e','Ì'=>'i','Í'=>'i','Ò'=>'o','Ó'=>'o','Ù'=>'u','Ú'=>'u','Ç'=>'c','Ñ'=>'n'];
    $t = strtolower(strtr(trim($t), $map));
    $t = preg_replace('/[^a-z0-9]+/', '-', $t);
    $t = trim($t, '-');
    return $t !== '' ? $t : 'galleria-' . substr(md5(microtime(true)), 0, 6);
}

function load_galleries() {
    $f = data_dir() . '/_galleries.json';
    if (!file_exists($f)) return ['galleries' => []];
    $j = json_decode(file_get_contents($f), true);
    return (is_array($j) && isset($j['galleries'])) ? $j : ['galleries' => []];
}

function save_galleries($d) {
    if (!is_dir(data_dir())) mkdir(data_dir(), 0755, true);
    file_put_contents(data_dir() . '/_galleries.json', json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
}

function find_gallery($slug) {
    foreach (load_galleries()['galleries'] as $g) if ($g['slug'] === $slug) return $g;
    return null;
}

function load_meta($slug) {
    $f = data_dir() . "/$slug/_meta.json";
    if (!file_exists($f)) return ['images' => []];
    $j = json_decode(file_get_contents($f), true);
    return (is_array($j) && isset($j['images'])) ? $j : ['images' => []];
}

function save_meta($slug, $m) {
    $d = data_dir() . "/$slug";
    if (!is_dir($d)) mkdir($d, 0755, true);
    file_put_contents("$d/_meta.json", json_encode($m, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
}

function safe_name($n) {
    $n = pathinfo(basename($n), PATHINFO_FILENAME);
    $n = preg_replace('/[^a-zA-Z0-9._-]/', '_', $n);
    return substr($n, 0, 60) ?: 'pano_' . substr(md5(microtime(true)), 0, 6);
}

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES|ENT_HTML5, 'UTF-8'); }

function jout($d, $st = 200) {
    http_response_code($st);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}

function rrmdir($dir) {
    if (!is_dir($dir)) return;
    foreach (scandir($dir) as $i) {
        if ($i === '.' || $i === '..') continue;
        $p = "$dir/$i";
        is_dir($p) ? rrmdir($p) : unlink($p);
    }
    rmdir($dir);
}
