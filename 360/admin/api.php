<?php
require_once __DIR__ . '/_auth.php';

// Determina se è una richiesta JSON (reorder)
$is_json = (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false);
if ($is_json) {
    $body = json_decode(file_get_contents('php://input'), true);
    $action = $body['action'] ?? '';
} else {
    $action = $_POST['action'] ?? '';
}

switch ($action) {

    // ============================================================
    case 'create_gallery':
        $title = trim($_POST['title'] ?? '');
        if ($title === '') redirect_err('index.php', 'Titolo mancante.');

        $slug = slugify($title);
        $data = load_galleries();

        // Slug univoco
        $base = $slug;
        $n = 1;
        $existing_slugs = array_column($data['galleries'], 'slug');
        while (in_array($slug, $existing_slugs)) {
            $slug = $base . '-' . $n++;
        }

        $dir = data_dir() . '/' . $slug;
        if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
            redirect_err('index.php', 'Impossibile creare la cartella.');
        }
        mkdir($dir . '/_thumbs', 0755, true);

        $data['galleries'][] = ['slug' => $slug, 'title' => $title];
        save_galleries($data);
        save_gallery_meta($slug, ['images' => []]);

        redirect_ok('index.php', 'Galleria "' . $title . '" creata.');
        break;

    // ============================================================
    case 'rename_gallery':
        $slug = trim($_POST['slug'] ?? '');
        $title = trim($_POST['title'] ?? '');
        if (!$slug || !$title) redirect_err('index.php', 'Dati mancanti.');

        $data = load_galleries();
        $found = false;
        foreach ($data['galleries'] as &$g) {
            if ($g['slug'] === $slug) {
                $g['title'] = $title;
                $found = true;
                break;
            }
        }
        unset($g);
        if (!$found) redirect_err('index.php', 'Galleria non trovata.');
        save_galleries($data);
        redirect_ok('index.php', 'Galleria rinominata.');
        break;

    // ============================================================
    case 'delete_gallery':
        $slug = trim($_POST['slug'] ?? '');
        if (!$slug) redirect_err('index.php', 'Slug mancante.');

        $data = load_galleries();
        $data['galleries'] = array_values(array_filter($data['galleries'], fn($g) => $g['slug'] !== $slug));
        save_galleries($data);

        $dir = data_dir() . '/' . $slug;
        rrmdir($dir);
        redirect_ok('index.php', 'Galleria eliminata.');
        break;

    // ============================================================
    case 'upload_image':
        $slug = trim($_POST['slug'] ?? '');
        if (!$slug || !find_gallery($slug)) json_response(['ok' => false, 'error' => 'Galleria non valida.'], 400);

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            $err_map = [1 => 'File troppo grande (ini)', 2 => 'File troppo grande (form)', 3 => 'Upload incompleto', 4 => 'Nessun file', 6 => 'Cartella temporanea mancante', 7 => 'Errore scrittura disco'];
            $code = $_FILES['image']['error'] ?? 99;
            json_response(['ok' => false, 'error' => $err_map[$code] ?? 'Errore upload ' . $code]);
        }

        // Validazione tipo MIME
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($_FILES['image']['tmp_name']);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/jpg'])) {
            json_response(['ok' => false, 'error' => 'Tipo file non supportato: ' . $mime]);
        }

        // Filename sicuro
        $orig_name = safe_filename($_FILES['image']['name']);
        $ext = strtolower(pathinfo($orig_name, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png'])) $ext = 'jpg';
        $base = pathinfo($orig_name, PATHINFO_FILENAME);
        $base = preg_replace('/[^a-zA-Z0-9._-]/', '_', $base);
        if (strlen($base) > 60) $base = substr($base, 0, 60);

        $dir = data_dir() . '/' . $slug;
        $thumbs_dir = $dir . '/_thumbs';
        if (!is_dir($thumbs_dir)) mkdir($thumbs_dir, 0755, true);

        // Evita sovrascrittura
        $filename = $base . '.' . $ext;
        $n = 1;
        while (file_exists($dir . '/' . $filename)) {
            $filename = $base . '_' . $n++ . '.' . $ext;
        }
        // La thumb ha sempre estensione .jpg
        $thumb_filename = pathinfo($filename, PATHINFO_FILENAME) . '.jpg';

        // Salva immagine originale
        if (!move_uploaded_file($_FILES['image']['tmp_name'], $dir . '/' . $filename)) {
            json_response(['ok' => false, 'error' => 'Impossibile salvare il file.']);
        }

        // Salva thumbnail (inviata dal browser come blob)
        if (isset($_FILES['thumb']) && $_FILES['thumb']['error'] === UPLOAD_ERR_OK) {
            move_uploaded_file($_FILES['thumb']['tmp_name'], $thumbs_dir . '/' . $thumb_filename);
        } else {
            // Fallback: copia l'immagine originale come thumb (GD, solo per file piccoli)
            generate_thumb_server($dir . '/' . $filename, $thumbs_dir . '/' . $thumb_filename, $mime);
        }

        // Aggiorna meta
        $title = pathinfo($orig_name, PATHINFO_FILENAME);
        $title = str_replace(['_', '-'], ' ', $title);
        $title = ucwords($title);

        $meta = load_gallery_meta($slug);
        $meta['images'][] = ['file' => $filename, 'title' => $title];
        save_gallery_meta($slug, $meta);

        json_response(['ok' => true, 'file' => $filename]);
        break;

    // ============================================================
    case 'rename_image':
        $slug = trim($_POST['slug'] ?? '');
        $file = trim($_POST['file'] ?? '');
        $title = trim($_POST['title'] ?? '');
        if (!$slug || !$file || !$title) redirect_err_gallery($slug, 'Dati mancanti.');

        $meta = load_gallery_meta($slug);
        $found = false;
        foreach ($meta['images'] as &$img) {
            if ($img['file'] === $file) {
                $img['title'] = $title;
                $found = true;
                break;
            }
        }
        unset($img);
        if (!$found) redirect_err_gallery($slug, 'Immagine non trovata.');
        save_gallery_meta($slug, $meta);
        redirect_ok_gallery($slug, 'Panorama rinominato.');
        break;

    // ============================================================
    case 'delete_image':
        $slug = trim($_POST['slug'] ?? '');
        $file = trim($_POST['file'] ?? '');
        if (!$slug || !$file) redirect_err_gallery($slug, 'Dati mancanti.');

        // Rimuovi file fisici
        $img_path = data_dir() . '/' . $slug . '/' . $file;
        $thumb_path = data_dir() . '/' . $slug . '/_thumbs/' . pathinfo($file, PATHINFO_FILENAME) . '.jpg';
        if (file_exists($img_path)) unlink($img_path);
        if (file_exists($thumb_path)) unlink($thumb_path);

        // Aggiorna meta
        $meta = load_gallery_meta($slug);
        $meta['images'] = array_values(array_filter($meta['images'], fn($i) => $i['file'] !== $file));
        save_gallery_meta($slug, $meta);
        redirect_ok_gallery($slug, 'Panorama eliminato.');
        break;

    // ============================================================
    case 'reorder_images':
        $slug = $body['slug'] ?? '';
        $order = $body['order'] ?? [];
        if (!$slug || !is_array($order)) json_response(['ok' => false, 'error' => 'Dati non validi.'], 400);

        $meta = load_gallery_meta($slug);
        $indexed = [];
        foreach ($meta['images'] as $img) {
            $indexed[$img['file']] = $img;
        }
        $new_images = [];
        foreach ($order as $file) {
            if (isset($indexed[$file])) $new_images[] = $indexed[$file];
        }
        $meta['images'] = $new_images;
        save_gallery_meta($slug, $meta);
        json_response(['ok' => true]);
        break;

    default:
        redirect_err('index.php', 'Azione sconosciuta.');
}

// ============================================================
// HELPER
// ============================================================

function redirect_ok($url, $msg) {
    header('Location: ' . $url . '?msg=' . urlencode($msg));
    exit;
}

function redirect_err($url, $err) {
    header('Location: ' . $url . '?err=' . urlencode($err));
    exit;
}

function redirect_ok_gallery($slug, $msg) {
    header('Location: gallery.php?g=' . urlencode($slug) . '&msg=' . urlencode($msg));
    exit;
}

function redirect_err_gallery($slug, $err) {
    header('Location: gallery.php?g=' . urlencode($slug) . '&err=' . urlencode($err));
    exit;
}

function generate_thumb_server($src_path, $dest_path, $mime) {
    // Fallback server-side: solo per file non-giganti.
    // Se GD non ce la fa (memoria), si salta silenziosamente.
    $max_try = 40 * 1024 * 1024; // max 40MB per tentare il resize server-side
    if (filesize($src_path) > $max_try) return;

    try {
        if ($mime === 'image/png') {
            $src = @imagecreatefrompng($src_path);
        } else {
            $src = @imagecreatefromjpeg($src_path);
        }
        if (!$src) return;
        $w = imagesx($src);
        $h = imagesy($src);
        $tw = 1024;
        $th = (int)($h * $tw / $w);
        $thumb = imagecreatetruecolor($tw, $th);
        imagecopyresampled($thumb, $src, 0, 0, 0, 0, $tw, $th, $w, $h);
        imagejpeg($thumb, $dest_path, 80);
        imagedestroy($src);
        imagedestroy($thumb);
    } catch (Throwable $e) {
        // Silenzio: l'utente vedrà la thumb mancante, ma il file è salvato.
    }
}
