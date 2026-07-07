<?php
require_once __DIR__ . '/lib.php';
$cfg = load_config();

$slug = $_GET['g'] ?? '';
$gallery = find_gallery($slug);

if (!$gallery) {
    header('Location: index.php');
    exit;
}

$meta = load_gallery_meta($slug);
$images = $meta['images'];
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= h($gallery['title']) ?> · <?= h($cfg['site_title']) ?></title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>

<header class="site-header">
    <div class="container" style="padding: 0;">
        <div>
            <div class="site-title"><a href="index.php"><?= h($cfg['site_title']) ?></a></div>
        </div>
        <div class="header-actions">
            <a href="admin/" class="btn btn-sm">Admin</a>
        </div>
    </div>
</header>

<main class="container">
    <div class="breadcrumb">
        <a href="index.php">Gallerie</a> / <?= h($gallery['title']) ?>
    </div>
    <h1 class="page-title"><?= h($gallery['title']) ?></h1>

    <?php if (empty($images)): ?>
        <div class="empty-state">
            <h2>Nessun panorama in questa galleria</h2>
        </div>
    <?php else: ?>
        <div class="images-grid">
            <?php foreach ($images as $img): ?>
                <a href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($img['file'])) ?>&v=4" class="image-card">
                    <div class="image-card-thumb">
                        <img src="data/<?= h($slug) ?>/_thumbs/<?= h($img['file']) ?>" alt="<?= h($img['title']) ?>" loading="lazy">
                    </div>
                    <div class="image-card-info">
                        <div class="image-card-title"><?= h($img['title']) ?></div>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>

</body>
</html>
