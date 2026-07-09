<?php
require_once __DIR__ . '/_auth.php';
$cfg = load_config();
$data = load_galleries();
$msg = $_GET['msg'] ?? ''; $err = $_GET['err'] ?? '';
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin · 360e</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="hd"><div class="hd-inner">
    <div class="brand"><span class="brand-title">Admin <em>360e</em></span></div>
    <div style="display:flex;gap:10px;">
        <a href="../index.php" target="_blank" class="btn btn-sm">Vedi sito</a>
        <a href="password.php" class="btn btn-sm">Password</a>
        <a href="logout.php" class="btn btn-sm btn-danger">Esci</a>
    </div>
</div></header>
<main class="wrap">
    <?php if ($msg): ?><div class="al al-ok"><?= h($msg) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="al al-err"><?= h($err) ?></div><?php endif; ?>
    <div class="bar">
        <h1 class="pg" style="margin:0;">Gallerie</h1>
        <div class="sp"></div>
        <button class="btn btn-amber" onclick="document.getElementById('cm').style.display='flex'">+ Nuova galleria</button>
    </div>
    <?php if (!$data['galleries']): ?>
        <div class="empty"><h2>Nessuna galleria</h2><p>Creane una per iniziare a caricare sfere.</p></div>
    <?php else: ?>
    <div class="grid-g">
        <?php foreach ($data['galleries'] as $g):
            $meta = load_meta($g['slug']);
            $cover = null;
            if ($meta['images']) {
                $t = '../data/' . $g['slug'] . '/_thumbs/' . $meta['images'][0]['name'] . '.jpg';
                if (file_exists(__DIR__ . '/' . $t)) $cover = $t;
            }
        ?>
        <div class="gcard" style="cursor:default;">
            <div class="gcard-cover">
                <?php if ($cover): ?><img src="<?= h($cover) ?>" alt=""><?php endif; ?>
                <span class="pill-360"><?= count($meta['images']) ?> sfere</span>
            </div>
            <div class="gcard-info">
                <div class="gcard-title"><?= h($g['title']) ?></div>
                <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;">
                    <a href="gallery.php?g=<?= h(urlencode($g['slug'])) ?>" class="btn btn-sm btn-amber">Gestisci</a>
                    <a href="../gallery.php?g=<?= h(urlencode($g['slug'])) ?>" target="_blank" class="btn btn-sm">Vedi</a>
                    <button class="btn btn-sm" onclick="openRen('<?= h(addslashes($g['slug'])) ?>','<?= h(addslashes($g['title'])) ?>')">Rinomina</button>
                    <button class="btn btn-sm btn-danger" onclick="delG('<?= h(addslashes($g['slug'])) ?>','<?= h(addslashes($g['title'])) ?>')">Elimina</button>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</main>

<div class="mback" id="cm" style="display:none;" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <h2>Nuova galleria</h2>
        <form method="post" action="api.php">
            <input type="hidden" name="action" value="create_gallery">
            <div class="fg"><label class="fl">Nome</label><input type="text" name="title" required placeholder="Es. Agrivoltaico Varese 2026"></div>
            <div class="m-act">
                <button type="button" class="btn" onclick="document.getElementById('cm').style.display='none'">Annulla</button>
                <button type="submit" class="btn btn-amber">Crea</button>
            </div>
        </form>
    </div>
</div>
<div class="mback" id="rm" style="display:none;" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <h2>Rinomina galleria</h2>
        <form method="post" action="api.php">
            <input type="hidden" name="action" value="rename_gallery">
            <input type="hidden" name="slug" id="rslug">
            <div class="fg"><label class="fl">Nuovo nome</label><input type="text" name="title" id="rtitle" required></div>
            <div class="m-act">
                <button type="button" class="btn" onclick="document.getElementById('rm').style.display='none'">Annulla</button>
                <button type="submit" class="btn btn-amber">Salva</button>
            </div>
        </form>
    </div>
</div>
<form method="post" action="api.php" id="df" style="display:none;">
    <input type="hidden" name="action" value="delete_gallery">
    <input type="hidden" name="slug" id="dslug">
</form>
<script>
function openRen(s, t) {
    document.getElementById('rslug').value = s;
    document.getElementById('rtitle').value = t;
    document.getElementById('rm').style.display = 'flex';
}
function delG(s, t) {
    if (!confirm('Eliminare "' + t + '" e tutte le sue sfere? Irreversibile.')) return;
    document.getElementById('dslug').value = s;
    document.getElementById('df').submit();
}
</script>
</body>
</html>
