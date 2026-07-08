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
// REPORT DIAGNOSTICO INLINE (temporaneo): testo incluso
// nelle pagine pubbliche per ispezione remota.
// ============================================================
function diag_report_text() {
    $out = "DIAG " . date('c') . "\n";
    try {
        $data = load_galleries();
        foreach ($data['galleries'] as $g) {
            $meta = load_gallery_meta($g['slug']);
            $out .= "GALLERIA " . $g['slug'] . " (" . count($meta['images']) . ")\n";
            foreach ($meta['images'] as $img) {
                $orig = data_dir() . '/' . $g['slug'] . '/' . $img['file'];
                $line = $img['file'] . ' : ';
                $sz = @getimagesize($orig);
                $line .= $sz ? ($sz[0] . 'x' . $sz[1] . ' ' . round($sz[0]*$sz[1]/1e6,1) . 'MP aspect=' . round($sz[0]/$sz[1],4)) : 'NO-SIZE';
                $line .= ' bytes=' . (file_exists($orig) ? filesize($orig) : 0);
                $fh = @fopen($orig, 'rb');
                if ($fh) {
                    $head = fread($fh, 524288);
                    fclose($fh);
                    if (preg_match_all('/GPano:[A-Za-z]+[="\x27>]+[0-9.]+/', $head, $m)) {
                        $line .= ' XMP{' . implode(' ', array_slice($m[0], 0, 8)) . '}';
                    } else {
                        $line .= ' XMP=no';
                    }
                }
                // Scan nero sulla thumb
                $t = data_dir() . '/' . $g['slug'] . '/_thumbs/' . pathinfo($img['file'], PATHINFO_FILENAME) . '.jpg';
                $sc = function_exists('imagecreatefromjpeg') ? @diag_scan_thumb($t) : null;
                if ($sc) {
                    $line .= ' SCAN{top=' . $sc['top'] . '% bottom=' . $sc['bottom'] . '% wedge=' . $sc['wedge'] . 'deg nero-nel-file=' . ($sc['baked'] ? 'SI' : 'no') . '}';
                }
                $out .= $line . "\n";
            }
        }
    } catch (Throwable $e) {
        $out .= 'ERRORE: ' . $e->getMessage() . "\n";
    }
    return $out;
}

function diag_scan_thumb($path) {
    if (!file_exists($path)) return null;
    $img = @imagecreatefromjpeg($path);
    if (!$img) return null;
    $w = imagesx($img); $h = imagesy($img);
    $T = 14; $FRAC = 0.92;
    $rowFrac = function($y) use ($img, $w, $T) {
        $dark = 0; $tot = 0;
        for ($x = 0; $x < $w; $x += 4) {
            $tot++; $rgb = imagecolorat($img, $x, $y);
            if ((($rgb>>16)&0xFF) < $T && (($rgb>>8)&0xFF) < $T && ($rgb&0xFF) < $T) $dark++;
        }
        return $tot ? $dark/$tot : 0;
    };
    $topBand = 0;
    for ($y = 0; $y < $h*0.4; $y += 2) { if ($rowFrac($y) >= $FRAC) $topBand = $y+2; else break; }
    $bottomBand = 0;
    for ($y = $h-1; $y > $h*0.6; $y -= 2) { if ($rowFrac($y) >= $FRAC) $bottomBand = $h-$y+1; else break; }
    $y0 = $topBand+2; $y1 = $h-$bottomBand-2;
    $maxRun = 0; $run = 0;
    for ($x = 0; $x < $w; $x += 4) {
        $dark = 0; $tot = 0;
        for ($y = $y0; $y < $y1; $y += 4) {
            $tot++; $rgb = imagecolorat($img, $x, $y);
            if ((($rgb>>16)&0xFF) < $T && (($rgb>>8)&0xFF) < $T && ($rgb&0xFF) < $T) $dark++;
        }
        if ($tot && $dark/$tot >= $FRAC) { $run++; if ($run > $maxRun) $maxRun = $run; }
        else $run = 0;
    }
    imagedestroy($img);
    return [
        'top' => (int)round($topBand/$h*100),
        'bottom' => (int)round($bottomBand/$h*100),
        'wedge' => (int)round($maxRun*4/$w*360),
        'baked' => ($maxRun*4/$w*360 >= 4 || $topBand/$h > 0.03 || $bottomBand/$h > 0.03),
    ];
}
