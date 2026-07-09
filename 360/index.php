<?php
require_once __DIR__ . '/lib.php';
if (isset($_GET['diag'])) {
    require __DIR__ . '/diag.php';
    exit;
}
$cfg = load_config();
$data = load_galleries();
$galleries = $data['galleries'];

// Per ogni galleria, prendi la prima immagine come cover e conta le immagini
foreach ($galleries as &$g) {
    $meta = load_gallery_meta($g['slug']);
    $g['image_count'] = count($meta['images']);
    $g['cover'] = null;
    if (!empty($meta['images'])) {
        $first = $meta['images'][0];
        $thumb_path = 'data/' . $g['slug'] . '/_thumbs/' . $first['file'];
        if (file_exists(__DIR__ . '/' . $thumb_path)) {
            $g['cover'] = $thumb_path;
        }
    }
}
unset($g);
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= isset($GLOBALS['mig360e_result']) ? h($GLOBALS['mig360e_result']) . ' · ' : '' ?><?= h($cfg['site_title']) ?></title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>

<header class="site-header">
    <div class="container" style="padding: 0;">
        <div>
            <div class="site-title"><a href="index.php"><?= h($cfg['site_title']) ?></a></div>
            <?php if (!empty($cfg['site_subtitle'])): ?>
                <div class="site-subtitle"><?= h($cfg['site_subtitle']) ?></div>
            <?php endif; ?>
        </div>
        <div class="header-actions">
            <a href="admin/" class="btn btn-sm">Admin</a>
        </div>
    </div>
</header>

<main class="container">
    <h1 class="page-title">Gallerie</h1>

    <?php if (empty($galleries)): ?>
        <div class="empty-state">
            <h2>Nessuna galleria ancora pubblicata</h2>
            <p>Accedi all'area admin per creare la prima galleria e caricare i panorami.</p>
        </div>
    <?php else: ?>
        <div class="gallery-grid">
            <?php foreach ($galleries as $g): ?>
                <a href="gallery.php?g=<?= h(urlencode($g['slug'])) ?>&v=8" class="gallery-card">
                    <div class="gallery-card-cover<?= $g['cover'] ? ' has-image' : '' ?>">
                        <?php if ($g['cover']): ?>
                            <img src="<?= h($g['cover']) ?>" alt="" loading="lazy">
                        <?php endif; ?>
                    </div>
                    <div class="gallery-card-info">
                        <div class="gallery-card-title"><?= h($g['title']) ?></div>
                        <div class="gallery-card-meta">
                            <?= (int)$g['image_count'] ?> panoram<?= $g['image_count'] === 1 ? 'a' : 'i' ?>
                        </div>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
    <p style="margin-top:40px;"><a href="diag.php" style="color:#8b949e;font-size:12px;">diagnostica</a></p>
</main>

</body>
</html>
