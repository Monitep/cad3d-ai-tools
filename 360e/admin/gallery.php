<?php
require_once __DIR__ . '/_auth.php';
$cfg = load_config();
$slug = $_GET['g'] ?? '';
$gallery = find_gallery($slug);
if (!$gallery) { header('Location: index.php'); exit; }
$meta = load_meta($slug);
$msg = $_GET['msg'] ?? ''; $err = $_GET['err'] ?? '';
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($gallery['title']) ?> · Admin 360e</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="hd"><div class="hd-inner">
    <div class="brand"><a href="index.php" style="color:inherit;"><span class="brand-title">Admin <em>360e</em></span></a>
        <span class="brand-sub">/ <?= h($gallery['title']) ?></span></div>
    <div style="display:flex;gap:10px;">
        <a href="../gallery.php?g=<?= h(urlencode($slug)) ?>" target="_blank" class="btn btn-sm">Vedi galleria</a>
        <a href="logout.php" class="btn btn-sm btn-danger">Esci</a>
    </div>
</div></header>
<main class="wrap">
    <?php if ($msg): ?><div class="al al-ok"><?= h($msg) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="al al-err"><?= h($err) ?></div><?php endif; ?>

    <h1 class="pg">Carica sfere</h1>
    <p class="pg-sub">Il browser prepara miniatura, base e <strong>tile ad alta risoluzione</strong> per ogni panorama:
    è questo che permette la qualità piena su ogni dispositivo. Per i 120MP conviene caricare da PC.</p>

    <div class="drop" id="drop" onclick="document.getElementById('fi').click()">
        <div class="drop-ico">🌐</div>
        <div class="drop-t">Trascina qui i panorami equirettangolari</div>
        <div class="drop-h">oppure clicca · JPEG/PNG · fino a <?= (int)$cfg['max_upload_mb'] ?>MB per file</div>
    </div>
    <input type="file" id="fi" multiple accept="image/jpeg,image/png" style="display:none;">
    <div class="q" id="q"></div>

    <div class="bar" style="margin-top:36px;">
        <h1 class="pg" style="margin:0;font-size:22px;"><?= count($meta['images']) ?> sfere</h1>
        <div class="sp"></div>
        <?php if ($meta['images']): ?>
        <button class="btn btn-sm" id="upgAll" onclick="upgradeAll()">Genera tile HD per tutte</button>
        <button class="btn btn-sm btn-amber" id="so" style="display:none;" onclick="saveOrder()">Salva ordine</button>
        <?php endif; ?>
    </div>

    <?php if (!$meta['images']): ?>
        <div class="empty" style="padding:40px;"><h2>Nessuna sfera</h2></div>
    <?php else: ?>
    <div class="grid-i" id="gi">
        <?php foreach ($meta['images'] as $img): ?>
        <div class="icard" data-name="<?= h($img['name']) ?>" data-src="<?= h($img['src'] ?? '') ?>" data-tiled="<?= !empty($img['tiled']) ? 1 : 0 ?>" style="cursor:default;">
            <a href="../view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($img['name'])) ?>" target="_blank">
                <div class="icard-thumb"><img src="../data/<?= h($slug) ?>/_thumbs/<?= h($img['name']) ?>.jpg" alt="" loading="lazy"></div>
            </a>
            <div class="icard-info">
                <span class="icard-title"><?= h($img['title']) ?></span>
                <?php if (!empty($img['tiled'])): ?><span class="badge-hq"><?= round($img['w'] * $img['h'] / 1e6) ?>MP</span>
                <?php else: ?><span class="badge-hq" style="color:var(--dim);border-color:var(--line);">8K</span><?php endif; ?>
            </div>
            <?php if (empty($img['tiled'])): ?>
            <div style="padding:0 10px 8px;">
                <button class="btn btn-sm btn-amber upg" style="width:100%;justify-content:center;" onclick="upgradeOne(this.closest('.icard'))">Genera tile HD</button>
            </div>
            <?php endif; ?>
            <div style="padding:0 10px 10px;display:flex;gap:6px;">
                <button class="btn btn-sm" onclick="mv(this,-1)" title="Sposta prima">↑</button>
                <button class="btn btn-sm" onclick="mv(this,1)" title="Sposta dopo">↓</button>
                <button class="btn btn-sm" style="flex:1;" onclick="ren('<?= h(addslashes($img['name'])) ?>','<?= h(addslashes($img['title'])) ?>')">Rinomina</button>
                <button class="btn btn-sm btn-danger" onclick="del('<?= h(addslashes($img['name'])) ?>','<?= h(addslashes($img['title'])) ?>')">✕</button>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</main>

<div class="mback" id="rim" style="display:none;" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <h2>Rinomina sfera</h2>
        <form method="post" action="api.php">
            <input type="hidden" name="action" value="rename_image">
            <input type="hidden" name="slug" value="<?= h($slug) ?>">
            <input type="hidden" name="name" id="rin">
            <div class="fg"><label class="fl">Titolo</label><input type="text" name="title" id="rit" required></div>
            <div class="m-act">
                <button type="button" class="btn" onclick="document.getElementById('rim').style.display='none'">Annulla</button>
                <button type="submit" class="btn btn-amber">Salva</button>
            </div>
        </form>
    </div>
</div>
<form method="post" action="api.php" id="dif" style="display:none;">
    <input type="hidden" name="action" value="delete_image">
    <input type="hidden" name="slug" value="<?= h($slug) ?>">
    <input type="hidden" name="name" id="din">
</form>

<script src="../assets/pipeline.js"></script>
<script>
const SLUG = <?= json_encode($slug) ?>;
const MAX_MB = <?= (int)$cfg['max_upload_mb'] ?>;

// Pipeline condivisa in ../assets/pipeline.js

async function processFile(file, ui) {
    if (file.size > MAX_MB * 1024 * 1024) throw new Error('File oltre ' + MAX_MB + 'MB');
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || ('pano_' + Date.now());
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    await tileAndSend(file, name, title, ui, false);
}

async function tileAndSend(file, name, title, ui, isUpgrade) {
    await processPano({
        slug: SLUG, name: name, title: title, blob: file, ui: ui,
        orig: { mode: 'upload', file: file },
    });
}

function mkUi(fname) {
    const el = document.createElement('div');
    el.className = 'q-item';
    el.innerHTML = '<div class="q-top"><div class="q-name">' + fname + '</div>' +
        '<div class="q-phase">In coda...</div></div><div class="q-bar"><div class="q-fill"></div></div>';
    document.getElementById('q').appendChild(el);
    return {
        el: el,
        phase: t => el.querySelector('.q-phase').textContent = t,
        pct: p => el.querySelector('.q-fill').style.width = p + '%',
    };
}

let running = false;
async function runQueue(files) {
    if (running) return;
    running = true;
    let okCount = 0;
    for (const f of files) {
        const ui = mkUi(f.name);
        try {
            await processFile(f, ui);
            ui.el.classList.add('done');
            okCount++;
        } catch (e) {
            ui.el.classList.add('err');
            ui.phase('Errore: ' + e.message);
            console.error('[360e]', e);
        }
    }
    running = false;
    if (okCount) setTimeout(() => location.reload(), 1400);
}

// ============================================================
// UPGRADE A TILE HD delle sfere migrate dalla vecchia /360:
// scarica l'originale gia' presente sul server, genera i tile
// nel browser e promuove la voce a qualita' piena. Da fare
// preferibilmente da PC (i 120MP richiedono memoria).
// ============================================================
async function upgradeCard(card, ui) {
    const name = card.dataset.name;
    const src = card.dataset.src;
    if (!src) throw new Error('origine mancante');
    ui.phase('Download originale...'); ui.pct(2);
    const res = await fetch('../' + src);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const file = new File([blob], name + '.jpg', { type: 'image/jpeg' });
    await tileAndSend(file, name, null, ui, true);
    card.dataset.tiled = '1';
    const b = card.querySelector('.upg');
    if (b) { b.textContent = 'HD pronta ✓'; b.disabled = true; b.classList.remove('btn-amber'); }
}

async function upgradeOne(card) {
    if (running) return;
    running = true;
    const ui = mkUi('HD: ' + card.dataset.name);
    try {
        await upgradeCard(card, ui);
        ui.el.classList.add('done');
    } catch (e) {
        ui.el.classList.add('err');
        ui.phase('Errore: ' + e.message);
    }
    running = false;
}

async function upgradeAll() {
    if (running) return;
    running = true;
    const cards = Array.from(document.querySelectorAll('#gi .icard')).filter(c => c.dataset.tiled === '0' && c.dataset.src);
    if (!cards.length) { alert('Tutte le sfere sono già in HD.'); running = false; return; }
    let ok = 0;
    for (const card of cards) {
        const ui = mkUi('HD: ' + card.dataset.name);
        try { await upgradeCard(card, ui); ui.el.classList.add('done'); ok++; }
        catch (e) { ui.el.classList.add('err'); ui.phase('Errore: ' + e.message); }
    }
    running = false;
    if (ok) setTimeout(() => location.reload(), 1200);
}

const drop = document.getElementById('drop');
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    runQueue(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
});
document.getElementById('fi').addEventListener('change', e => {
    runQueue(Array.from(e.target.files));
    e.target.value = '';
});

// ---- Riordino / rinomina / elimina ----
function mv(btn, dir) {
    const card = btn.closest('.icard');
    const g = document.getElementById('gi');
    if (dir < 0 && card.previousElementSibling) g.insertBefore(card, card.previousElementSibling);
    else if (dir > 0 && card.nextElementSibling) g.insertBefore(card.nextElementSibling, card);
    else return;
    document.getElementById('so').style.display = '';
}
function saveOrder() {
    const order = Array.from(document.querySelectorAll('#gi .icard')).map(c => c.dataset.name);
    fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', slug: SLUG, order: order }),
    }).then(r => r.json()).then(r => {
        if (r.ok) document.getElementById('so').style.display = 'none';
    });
}
function ren(name, title) {
    document.getElementById('rin').value = name;
    document.getElementById('rit').value = title;
    document.getElementById('rim').style.display = 'flex';
}
function del(name, title) {
    if (!confirm('Eliminare "' + title + '"?')) return;
    document.getElementById('din').value = name;
    document.getElementById('dif').submit();
}
</script>
</body>
</html>
