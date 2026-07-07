<?php
require_once __DIR__ . '/_auth.php';
$cfg = load_config();
$data = load_galleries();
$galleries = $data['galleries'];

foreach ($galleries as &$g) {
    $meta = load_gallery_meta($g['slug']);
    $g['image_count'] = count($meta['images']);
}
unset($g);

$msg = $_GET['msg'] ?? '';
$err = $_GET['err'] ?? '';
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Dashboard · <?= h($cfg['site_title']) ?></title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>

<header class="site-header">
    <div class="container" style="padding:0;">
        <div>
            <div class="site-title">Admin · <?= h($cfg['site_title']) ?></div>
        </div>
        <div class="header-actions">
            <a href="../index.php" class="btn btn-sm" target="_blank">Vedi sito</a>
            <a href="logout.php" class="btn btn-sm btn-danger">Logout</a>
        </div>
    </div>
</header>

<main class="container">
    <?php if ($msg): ?><div class="alert alert-success"><?= h($msg) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="alert alert-error"><?= h($err) ?></div><?php endif; ?>

    <div class="action-bar">
        <h1 class="page-title" style="margin:0;">Gallerie</h1>
        <div class="action-bar-spacer"></div>
        <button class="btn btn-primary" onclick="openCreateModal()">+ Nuova galleria</button>
        <a href="password.php" class="btn btn-sm">Cambia password</a>
    </div>

    <?php if (empty($galleries)): ?>
        <div class="empty-state">
            <h2>Nessuna galleria</h2>
            <p>Crea la prima galleria per iniziare.</p>
        </div>
    <?php else: ?>
        <div class="gallery-grid">
            <?php foreach ($galleries as $g): ?>
                <div class="gallery-card" style="cursor:default;">
                    <div class="gallery-card-cover">
                        <?php
                        $meta = load_gallery_meta($g['slug']);
                        if (!empty($meta['images'])) {
                            $t = '../data/' . $g['slug'] . '/_thumbs/' . $meta['images'][0]['file'];
                            if (file_exists(__DIR__ . '/' . $t)) {
                                echo '<img src="' . h($t) . '" alt="">';
                            }
                        }
                        ?>
                    </div>
                    <div class="gallery-card-info">
                        <div class="gallery-card-title"><?= h($g['title']) ?></div>
                        <div class="gallery-card-meta" style="margin-bottom:10px;">
                            <?= (int)$g['image_count'] ?> panorami
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <a href="gallery.php?g=<?= h(urlencode($g['slug'])) ?>" class="btn btn-sm">Gestisci</a>
                            <a href="../gallery.php?g=<?= h(urlencode($g['slug'])) ?>" class="btn btn-sm" target="_blank">Vedi</a>
                            <button class="btn btn-sm" onclick="openRenameModal('<?= h(addslashes($g['slug'])) ?>','<?= h(addslashes($g['title'])) ?>')">Rinomina</button>
                            <button class="btn btn-sm btn-danger" onclick="confirmDeleteGallery('<?= h(addslashes($g['slug'])) ?>','<?= h(addslashes($g['title'])) ?>')">Elimina</button>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>

<!-- Modal Nuova Galleria -->
<div class="modal-backdrop" id="createModal" style="display:none;" onclick="if(event.target===this)closeCreateModal()">
    <div class="modal">
        <h2>Nuova galleria</h2>
        <form method="post" action="api.php">
            <input type="hidden" name="action" value="create_gallery">
            <div class="form-group">
                <label class="form-label">Nome galleria</label>
                <input type="text" name="title" required autofocus placeholder="Es. Impianto fotovoltaico Varese 2024">
            </div>
            <div class="modal-actions">
                <button type="button" class="btn" onclick="closeCreateModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">Crea</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal Rinomina Galleria -->
<div class="modal-backdrop" id="renameModal" style="display:none;" onclick="if(event.target===this)closeRenameModal()">
    <div class="modal">
        <h2>Rinomina galleria</h2>
        <form method="post" action="api.php">
            <input type="hidden" name="action" value="rename_gallery">
            <input type="hidden" name="slug" id="renameSlug">
            <div class="form-group">
                <label class="form-label">Nuovo nome</label>
                <input type="text" name="title" id="renameTitle" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn" onclick="closeRenameModal()">Annulla</button>
                <button type="submit" class="btn btn-primary">Salva</button>
            </div>
        </form>
    </div>
</div>

<!-- Form nascosto per eliminazione -->
<form method="post" action="api.php" id="deleteGalleryForm" style="display:none;">
    <input type="hidden" name="action" value="delete_gallery">
    <input type="hidden" name="slug" id="deleteGallerySlug">
</form>

<script>
function openCreateModal() { document.getElementById('createModal').style.display='flex'; }
function closeCreateModal() { document.getElementById('createModal').style.display='none'; }
function openRenameModal(slug, title) {
    document.getElementById('renameSlug').value = slug;
    document.getElementById('renameTitle').value = title;
    document.getElementById('renameModal').style.display = 'flex';
    document.getElementById('renameTitle').focus();
}
function closeRenameModal() { document.getElementById('renameModal').style.display='none'; }
function confirmDeleteGallery(slug, title) {
    if (!confirm('Eliminare la galleria "' + title + '" e TUTTI i suoi panorami?\nQuesta azione non è reversibile.')) return;
    document.getElementById('deleteGallerySlug').value = slug;
    document.getElementById('deleteGalleryForm').submit();
}
</script>

</body>
</html>
