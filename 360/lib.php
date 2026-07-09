<?php
// ============================================================
// Funzioni helper condivise
// ============================================================

// Mai cache sulle pagine PHP: evita che i browser servano
// versioni vecchie del viewer dopo un aggiornamento.
if (!headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}

function load_config() {
    static $cfg = null;
    if ($cfg === null) {
        $cfg = require __DIR__ . '/config.php';
    }
    return $cfg;
}

function data_dir() {
    return __DIR__ . '/data';
}

function slugify($text) {
    $text = trim($text);
    // Translitterazione base
    $text = preg_replace('/[àáâãäå]/u', 'a', $text);
    $text = preg_replace('/[èéêë]/u', 'e', $text);
    $text = preg_replace('/[ìíîï]/u', 'i', $text);
    $text = preg_replace('/[òóôõö]/u', 'o', $text);
    $text = preg_replace('/[ùúûü]/u', 'u', $text);
    $text = preg_replace('/[ñ]/u', 'n', $text);
    $text = preg_replace('/[ç]/u', 'c', $text);
    // Mantieni solo alfanumerici e trattini
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    $text = trim($text, '-');
    if ($text === '') $text = 'galleria-' . substr(md5(microtime(true)), 0, 6);
    return $text;
}

function load_galleries() {
    $file = data_dir() . '/_galleries.json';
    if (!file_exists($file)) {
        return ['galleries' => []];
    }
    $json = json_decode(file_get_contents($file), true);
    if (!is_array($json) || !isset($json['galleries'])) {
        return ['galleries' => []];
    }
    return $json;
}

function save_galleries($data) {
    $file = data_dir() . '/_galleries.json';
    if (!is_dir(data_dir())) {
        mkdir(data_dir(), 0755, true);
    }
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function find_gallery($slug) {
    $data = load_galleries();
    foreach ($data['galleries'] as $g) {
        if ($g['slug'] === $slug) return $g;
    }
    return null;
}

function load_gallery_meta($slug) {
    $file = data_dir() . '/' . $slug . '/_meta.json';
    if (!file_exists($file)) {
        return ['images' => []];
    }
    $json = json_decode(file_get_contents($file), true);
    if (!is_array($json) || !isset($json['images'])) {
        return ['images' => []];
    }
    return $json;
}

function save_gallery_meta($slug, $meta) {
    $dir = data_dir() . '/' . $slug;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($dir . '/_meta.json', json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function get_admin_hash() {
    // L'hash custom vive in data/_admin.php così i deploy git
    // non resettano mai la password. Fallback: config.php.
    $file = data_dir() . '/_admin.php';
    if (file_exists($file)) {
        $h = include $file;
        if (is_string($h) && $h !== '') return $h;
    }
    $cfg = load_config();
    return $cfg['admin_password_hash'];
}

function set_admin_hash($hash) {
    if (!is_dir(data_dir())) mkdir(data_dir(), 0755, true);
    $content = "<?php\n// Hash password admin. Generato dal pannello. Non committare.\nreturn " . var_export($hash, true) . ";\n";
    return file_put_contents(data_dir() . '/_admin.php', $content) !== false;
}

function safe_filename($name) {
    // Rimuove caratteri pericolosi e path traversal
    $name = basename($name);
    $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
    return $name;
}

function h($s) {
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function rrmdir($dir) {
    if (!is_dir($dir)) return;
    $items = scandir($dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . '/' . $item;
        if (is_dir($path)) rrmdir($path);
        else unlink($path);
    }
    rmdir($dir);
}


// ============================================================
// MIGRAZIONE UNA-TANTUM VERSO 360e: registra le gallerie di
// questa app nella nuova /ai/360e/ (riferimento agli originali
// senza duplicarli, copia solo le miniature). Si autodisattiva
// con un lock. Ogni errore viene ignorato senza rompere la pagina.
// ============================================================
function migrate_to_360e() {
    $lock = data_dir() . '/_mig360e.lock';
    if (file_exists($lock)) return;
    @file_put_contents($lock, date('c'));
    try {
        $edir = dirname(__DIR__) . '/360e';
        if (!is_dir($edir)) return;
        $edata = $edir . '/data';
        if (!is_dir($edata)) @mkdir($edata, 0755, true);

        $eg_file = $edata . '/_galleries.json';
        $eg = file_exists($eg_file) ? (json_decode(file_get_contents($eg_file), true) ?: ['galleries' => []]) : ['galleries' => []];
        $existing = array_column($eg['galleries'], 'slug');

        $tot_g = 0; $tot_i = 0;
        foreach (load_galleries()['galleries'] as $g) {
            if (in_array($g['slug'], $existing)) continue;
            $slug = $g['slug'];
            foreach (['', '/_thumbs', '/base', '/tiles'] as $sub) {
                @mkdir("$edata/$slug$sub", 0755, true);
            }
            $meta = load_gallery_meta($slug);
            $eimages = [];
            foreach ($meta['images'] as $img) {
                $base = pathinfo($img['file'], PATHINFO_FILENAME);
                $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $base);
                $src_thumb = data_dir() . "/$slug/_thumbs/$base.jpg";
                if (file_exists($src_thumb)) {
                    @copy($src_thumb, "$edata/$slug/_thumbs/$name.jpg");
                }
                $eimages[] = [
                    'name' => $name,
                    'title' => $img['title'],
                    'file' => '',
                    'src' => "../360/data/$slug/{$img['file']}",
                    'w' => 0, 'h' => 0, 'cols' => 0, 'rows' => 0,
                    'tiled' => false,
                ];
                $tot_i++;
            }
            file_put_contents("$edata/$slug/_meta.json",
                json_encode(['images' => $eimages], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $eg['galleries'][] = ['slug' => $slug, 'title' => $g['title']];
            $tot_g++;
        }
        file_put_contents($eg_file, json_encode($eg, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $GLOBALS['mig360e_result'] = "MIG360E:{$tot_g}g/{$tot_i}i";
    } catch (Throwable $e) {
        $GLOBALS['mig360e_result'] = 'MIG360E:ERR ' . $e->getMessage();
    }
}
migrate_to_360e();
