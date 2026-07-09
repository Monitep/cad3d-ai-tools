<?php
require_once __DIR__ . '/lib.php';
$cfg = load_config();
$slug = $_GET['g'] ?? '';
$gallery = find_gallery($slug);
if (!$gallery) { header('Location: index.php'); exit; }
$meta = load_meta($slug);
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= h($gallery['title']) ?> · <?= h($cfg['site_title']) ?></title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="hd">
    <div class="hd-inner">
        <div class="brand">
            <a href="index.php"><span class="brand-title">CAD3D <em>360e</em></span></a>
        </div>
        <a href="admin/" class="btn btn-sm">Admin</a>
    </div>
</header>
<main class="wrap">
    <div class="crumbs"><a href="index.php">Gallerie</a> / <?= h($gallery['title']) ?></div>
    <h1 class="pg"><?= h($gallery['title']) ?></h1>
    <p class="pg-sub"><?= count($meta['images']) ?> sfere · tocca per entrare</p>
    <?php if (!$meta['images']): ?>
        <div class="empty"><h2>Galleria vuota</h2></div>
    <?php else: ?>
    <div class="grid-i">
        <?php foreach ($meta['images'] as $img): ?>
        <a class="icard" href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($img['name'])) ?>">
            <div class="icard-thumb">
                <img src="data/<?= h($slug) ?>/_thumbs/<?= h($img['name']) ?>.jpg" alt="<?= h($img['title']) ?>" loading="lazy">
            </div>
            <div class="icard-info">
                <span class="icard-title"><?= h($img['title']) ?></span>
                <?php if (!empty($img['tiled'])): ?><span class="badge-hq"><?= round(($img['w'] * $img['h']) / 1e6) ?>MP</span><?php endif; ?>
            </div>
        </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</main>
</body>
</html>
