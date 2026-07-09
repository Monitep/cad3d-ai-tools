<?php
require_once __DIR__ . '/lib.php';
$cfg = load_config();
$data = load_galleries();
$galleries = $data['galleries'];
foreach ($galleries as &$g) {
    $meta = load_meta($g['slug']);
    $g['n'] = count($meta['images']);
    $g['cover'] = null;
    if ($g['n']) {
        $t = 'data/' . $g['slug'] . '/_thumbs/' . $meta['images'][0]['name'] . '.jpg';
        if (file_exists(__DIR__ . '/' . $t)) $g['cover'] = $t;
    }
}
unset($g);
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= h($cfg['site_title']) ?></title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="hd">
    <div class="hd-inner">
        <div class="brand">
            <a href="index.php"><span class="brand-title">CAD3D <em>360e</em></span></a>
            <span class="brand-sub"><?= h($cfg['site_subtitle']) ?></span>
        </div>
        <a href="admin/" class="btn btn-sm">Admin</a>
    </div>
</header>
<main class="wrap">
    <h1 class="pg">Gallerie</h1>
    <p class="pg-sub">Panorami sferici navigabili · qualità piena su ogni dispositivo</p>
    <?php if (!$galleries): ?>
        <div class="empty"><h2>Nessuna galleria pubblicata</h2><p>Crea la prima dall'area admin.</p></div>
    <?php else: ?>
    <div class="grid-g">
        <?php foreach ($galleries as $g): ?>
        <a class="gcard" href="gallery.php?g=<?= h(urlencode($g['slug'])) ?>">
            <div class="gcard-cover">
                <?php if ($g['cover']): ?><img src="<?= h($g['cover']) ?>" alt="" loading="lazy"><?php endif; ?>
                <span class="pill-360">360°</span>
            </div>
            <div class="gcard-info">
                <div class="gcard-title"><?= h($g['title']) ?></div>
                <div class="gcard-meta"><?= (int)$g['n'] ?> sfer<?= $g['n'] === 1 ? 'a' : 'e' ?></div>
            </div>
        </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</main>
</body>
</html>
