<?php
require_once __DIR__ . '/_auth.php';

$is_json = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false;
$body = $is_json ? (json_decode(file_get_contents('php://input'), true) ?: []) : [];
$action = $is_json ? ($body['action'] ?? '') : ($_POST['action'] ?? '');

switch ($action) {

case 'create_gallery': {
    $title = trim($_POST['title'] ?? '');
    if ($title === '') back_err('index.php', 'Titolo mancante.');
    $slug = slugify($title);
    $d = load_galleries();
    $base = $slug; $n = 1;
    $taken = array_column($d['galleries'], 'slug');
    while (in_array($slug, $taken)) $slug = $base . '-' . $n++;
    foreach (['', '/_thumbs', '/base', '/tiles'] as $sub) {
        @mkdir(data_dir() . "/$slug$sub", 0755, true);
    }
    $d['galleries'][] = ['slug' => $slug, 'title' => $title];
    save_galleries($d);
    save_meta($slug, ['images' => []]);
    back_ok('index.php', 'Galleria creata.');
}

case 'ensure_gallery': {
    // Crea la galleria con lo slug indicato se non esiste (per la migrazione)
    $slug = preg_replace('/[^a-z0-9-]/', '', strtolower(trim($_POST['slug'] ?? '')));
    $title = trim($_POST['title'] ?? '') ?: $slug;
    if (!$slug) jout(['ok' => false, 'error' => 'Slug non valido'], 400);
    $d = load_galleries();
    if (!in_array($slug, array_column($d['galleries'], 'slug'))) {
        $d['galleries'][] = ['slug' => $slug, 'title' => $title];
        save_galleries($d);
        save_meta($slug, load_meta($slug));
    }
    foreach (['', '/_thumbs', '/base', '/tiles'] as $sub) {
        @mkdir(data_dir() . "/$slug$sub", 0755, true);
    }
    jout(['ok' => true, 'slug' => $slug]);
}

case 'rename_gallery': {
    $slug = trim($_POST['slug'] ?? ''); $title = trim($_POST['title'] ?? '');
    if (!$slug || !$title) back_err('index.php', 'Dati mancanti.');
    $d = load_galleries(); $found = false;
    foreach ($d['galleries'] as &$g) if ($g['slug'] === $slug) { $g['title'] = $title; $found = true; break; }
    unset($g);
    if (!$found) back_err('index.php', 'Non trovata.');
    save_galleries($d);
    back_ok('index.php', 'Rinominata.');
}

case 'delete_gallery': {
    $slug = trim($_POST['slug'] ?? '');
    if (!$slug) back_err('index.php', 'Slug mancante.');
    $d = load_galleries();
    $d['galleries'] = array_values(array_filter($d['galleries'], fn($g) => $g['slug'] !== $slug));
    save_galleries($d);
    rrmdir(data_dir() . "/$slug");
    back_ok('index.php', 'Galleria eliminata.');
}

// --- Upload multi-fase -----------------------------------------
// 1) upload_asset (kind=thumb|base|original): singoli file
// 2) upload_tiles: batch di tile con coordinate
// 3) finalize_image: scrive la voce nel meta
// ----------------------------------------------------------------

case 'upload_asset': {
    $slug = trim($_POST['slug'] ?? '');
    $name = safe_name($_POST['name'] ?? '');
    $kind = $_POST['kind'] ?? '';
    if (!$slug || !find_gallery($slug) || !$name) jout(['ok' => false, 'error' => 'Parametri non validi'], 400);
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        jout(['ok' => false, 'error' => 'Upload fallito (' . ($_FILES['file']['error'] ?? 'n/d') . ')']);
    }
    $fi = new finfo(FILEINFO_MIME_TYPE);
    if (!in_array($fi->file($_FILES['file']['tmp_name']), ['image/jpeg', 'image/png'])) {
        jout(['ok' => false, 'error' => 'Tipo non valido']);
    }
    $gdir = data_dir() . "/$slug";
    switch ($kind) {
        case 'thumb':
            @mkdir("$gdir/_thumbs", 0755, true);
            $dest = "$gdir/_thumbs/$name.jpg"; break;
        case 'base':
            @mkdir("$gdir/base", 0755, true);
            $dest = "$gdir/base/$name.jpg"; break;
        case 'original':
            $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png'])) $ext = 'jpg';
            $dest = "$gdir/$name.$ext"; break;
        default:
            jout(['ok' => false, 'error' => 'Kind non valido']);
    }
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
        jout(['ok' => false, 'error' => 'Scrittura fallita']);
    }
    jout(['ok' => true, 'saved' => basename($dest)]);
}

case 'upload_tiles': {
    $slug = trim($_POST['slug'] ?? '');
    $name = safe_name($_POST['name'] ?? '');
    $coords = json_decode($_POST['coords'] ?? '[]', true);
    if (!$slug || !find_gallery($slug) || !$name || !is_array($coords)) {
        jout(['ok' => false, 'error' => 'Parametri non validi'], 400);
    }
    $tdir = data_dir() . "/$slug/tiles/$name";
    @mkdir($tdir, 0755, true);
    $saved = 0;
    foreach ($coords as $k => $c) {
        $field = "t$k";
        if (!isset($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) continue;
        $col = (int)($c['c'] ?? -1); $row = (int)($c['r'] ?? -1);
        if ($col < 0 || $row < 0 || $col > 63 || $row > 31) continue;
        if (move_uploaded_file($_FILES[$field]['tmp_name'], "$tdir/{$col}_{$row}.jpg")) $saved++;
    }
    jout(['ok' => true, 'saved' => $saved]);
}

case 'finalize_image': {
    $slug = trim($_POST['slug'] ?? '');
    $name = safe_name($_POST['name'] ?? '');
    $title = trim($_POST['title'] ?? '') ?: $name;
    $w = (int)($_POST['w'] ?? 0);
    $h = (int)($_POST['h'] ?? 0);
    $cols = (int)($_POST['cols'] ?? 0);
    $rows = (int)($_POST['rows'] ?? 0);
    $file = $_POST['orig_file'] ?? '';
    $src = trim($_POST['src'] ?? '');
    // Solo riferimenti interni alla vecchia app sono ammessi
    if ($src !== '' && (strpos($src, '../360/data/') !== 0 || strpos($src, '..', 3) !== false)) $src = '';
    if (!$slug || !find_gallery($slug) || !$name || $w < 64 || $cols < 1) {
        jout(['ok' => false, 'error' => 'Parametri non validi'], 400);
    }
    // Verifica che i tile attesi esistano
    $tdir = data_dir() . "/$slug/tiles/$name";
    $expected = $cols * $rows;
    $have = is_dir($tdir) ? count(glob("$tdir/*.jpg")) : 0;
    if ($have < $expected) {
        jout(['ok' => false, 'error' => "Tile incompleti: $have/$expected"]);
    }
    $meta = load_meta($slug);
    // Se esiste una voce legacy (non tiled) con lo stesso nome: UPGRADE
    foreach ($meta['images'] as &$im) {
        if ($im['name'] === $name) {
            if (!empty($im['tiled'])) jout(['ok' => false, 'error' => 'Nome già presente']);
            $im['w'] = $w; $im['h'] = $h; $im['cols'] = $cols; $im['rows'] = $rows;
            $im['tiled'] = true;
            if ($title !== $name) $im['title'] = $im['title'] ?: $title;
            unset($im);
            save_meta($slug, $meta);
            jout(['ok' => true, 'upgraded' => true]);
        }
    }
    unset($im);
    $meta['images'][] = [
        'name' => $name,
        'title' => $title,
        'file' => $file ? safe_name(pathinfo($file, PATHINFO_FILENAME)) . '.' . strtolower(pathinfo($file, PATHINFO_EXTENSION) ?: 'jpg') : '',
        'src' => $src,
        'w' => $w, 'h' => $h, 'cols' => $cols, 'rows' => $rows,
        'tiled' => true,
    ];
    save_meta($slug, $meta);
    jout(['ok' => true]);
}

case 'rename_image': {
    $slug = trim($_POST['slug'] ?? ''); $name = trim($_POST['name'] ?? ''); $title = trim($_POST['title'] ?? '');
    if (!$slug || !$name || !$title) back_err_g($slug, 'Dati mancanti.');
    $meta = load_meta($slug); $f = false;
    foreach ($meta['images'] as &$im) if ($im['name'] === $name) { $im['title'] = $title; $f = true; break; }
    unset($im);
    if (!$f) back_err_g($slug, 'Non trovata.');
    save_meta($slug, $meta);
    back_ok_g($slug, 'Rinominata.');
}

case 'delete_image': {
    $slug = trim($_POST['slug'] ?? ''); $name = trim($_POST['name'] ?? '');
    if (!$slug || !$name) back_err_g($slug, 'Dati mancanti.');
    $meta = load_meta($slug);
    $entry = null;
    foreach ($meta['images'] as $im) if ($im['name'] === $name) { $entry = $im; break; }
    $meta['images'] = array_values(array_filter($meta['images'], fn($i) => $i['name'] !== $name));
    save_meta($slug, $meta);
    $g = data_dir() . "/$slug";
    @unlink("$g/_thumbs/$name.jpg");
    @unlink("$g/base/$name.jpg");
    rrmdir("$g/tiles/$name");
    if ($entry && !empty($entry['file'])) @unlink("$g/{$entry['file']}");
    back_ok_g($slug, 'Sfera eliminata.');
}

case 'reorder': {
    $slug = $body['slug'] ?? ''; $order = $body['order'] ?? [];
    if (!$slug || !is_array($order)) jout(['ok' => false], 400);
    $meta = load_meta($slug);
    $idx = [];
    foreach ($meta['images'] as $im) $idx[$im['name']] = $im;
    $out = [];
    foreach ($order as $n) if (isset($idx[$n])) $out[] = $idx[$n];
    $meta['images'] = $out;
    save_meta($slug, $meta);
    jout(['ok' => true]);
}

case 'ensure_gallery': {
    // Crea (o trova) una galleria con slug esplicito. JSON.
    $slug = slugify($_POST['slug'] ?? '');
    $title = trim($_POST['title'] ?? '') ?: $slug;
    if (!$slug) jout(['ok' => false, 'error' => 'Slug mancante'], 400);
    $d = load_galleries();
    foreach ($d['galleries'] as $g) {
        if ($g['slug'] === $slug) jout(['ok' => true, 'slug' => $slug, 'existed' => true]);
    }
    foreach (['', '/_thumbs', '/base', '/tiles'] as $sub) {
        @mkdir(data_dir() . "/$slug$sub", 0755, true);
    }
    $d['galleries'][] = ['slug' => $slug, 'title' => $title];
    save_galleries($d);
    save_meta($slug, ['images' => []]);
    jout(['ok' => true, 'slug' => $slug, 'existed' => false]);
}

case 'copy_original': {
    // Copia server-side l'originale dalla vecchia app /ai/360
    $slug = trim($_POST['slug'] ?? '');
    $name = safe_name($_POST['name'] ?? '');
    $srcG = basename(trim($_POST['src_gallery'] ?? ''));
    $srcF = basename(trim($_POST['src_file'] ?? ''));
    if (!$slug || !find_gallery($slug) || !$name || !$srcG || !$srcF) {
        jout(['ok' => false, 'error' => 'Parametri non validi'], 400);
    }
    $oldData = realpath(__DIR__ . '/../../360/data');
    if (!$oldData) jout(['ok' => false, 'error' => 'Cartella 360 non trovata']);
    $src = realpath("$oldData/$srcG/$srcF");
    if (!$src || strpos($src, $oldData) !== 0 || !is_file($src)) {
        jout(['ok' => false, 'error' => 'Sorgente non trovata']);
    }
    $ext = strtolower(pathinfo($srcF, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png'])) $ext = 'jpg';
    $dest = data_dir() . "/$slug/$name.$ext";
    if (!@copy($src, $dest)) jout(['ok' => false, 'error' => 'Copia fallita']);
    jout(['ok' => true, 'saved' => "$name.$ext"]);
}

default:
    back_err('index.php', 'Azione sconosciuta.');
}

function back_ok($u, $m) { header("Location: $u?msg=" . urlencode($m)); exit; }
function back_err($u, $e) { header("Location: $u?err=" . urlencode($e)); exit; }
function back_ok_g($s, $m) { header('Location: gallery.php?g=' . urlencode($s) . '&msg=' . urlencode($m)); exit; }
function back_err_g($s, $e) { header('Location: gallery.php?g=' . urlencode($s) . '&err=' . urlencode($e)); exit; }
