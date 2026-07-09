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
        <button class="btn btn-sm btn-amber" id="so" style="display:none;" onclick="saveOrder()">Salva ordine</button>
        <?php endif; ?>
    </div>

    <?php if (!$meta['images']): ?>
        <div class="empty" style="padding:40px;"><h2>Nessuna sfera</h2></div>
    <?php else: ?>
    <div class="grid-i" id="gi">
        <?php foreach ($meta['images'] as $img): ?>
        <div class="icard" data-name="<?= h($img['name']) ?>" style="cursor:default;">
            <a href="../view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($img['name'])) ?>" target="_blank">
                <div class="icard-thumb"><img src="../data/<?= h($slug) ?>/_thumbs/<?= h($img['name']) ?>.jpg" alt="" loading="lazy"></div>
            </a>
            <div class="icard-info">
                <span class="icard-title"><?= h($img['title']) ?></span>
                <?php if (!empty($img['tiled'])): ?><span class="badge-hq"><?= round($img['w'] * $img['h'] / 1e6) ?>MP</span><?php endif; ?>
            </div>
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

<script>
const SLUG = <?= json_encode($slug) ?>;
const MAX_MB = <?= (int)$cfg['max_upload_mb'] ?>;

// ============================================================
// PIPELINE DI UPLOAD 360e
// Per ogni panorama il browser genera:
//   thumb 1024px · base 2048px · griglia di tile alla
//   risoluzione PIENA (la larghezza viene normalizzata al
//   multiplo di 64 più vicino per una griglia esatta).
// I tile permettono al viewer di mostrare i 120MP interi
// caricando in GPU solo la porzione inquadrata.
// ============================================================

function tileGrid(w) {
    // Larghezza normalizzata (multiplo di 64) e colonne ottimali
    const normW = Math.max(2048, Math.round(w / 64) * 64);
    let best = 16, bestD = Infinity;
    for (const c of [16, 32, 64]) {
        const t = normW / c;
        const d = Math.abs(t - 512);
        if (Number.isInteger(t) && d < bestD) { best = c; bestD = d; }
    }
    return { normW: normW, normH: normW / 2, cols: best, rows: best / 2, tile: normW / best };
}

async function decodeFull(file) {
    return new Promise((ok, ko) => {
        const u = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => ok({ img: im, w: im.naturalWidth, h: im.naturalHeight, url: u });
        im.onerror = () => { URL.revokeObjectURL(u); ko(new Error('Immagine non decodificabile')); };
        im.src = u;
    });
}

function canvasBlob(c, q) {
    return new Promise((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new Error('toBlob nullo')), 'image/jpeg', q));
}

async function post(fields, files, onProgress) {
    const fd = new FormData();
    for (const k in fields) fd.append(k, fields[k]);
    for (const k in files) fd.append(k, files[k], k + '.jpg');
    return new Promise((ok, ko) => {
        const x = new XMLHttpRequest();
        if (onProgress) x.upload.addEventListener('progress', e => {
            if (e.lengthComputable) onProgress(e.loaded / e.total);
        });
        x.onload = () => {
            try {
                const r = JSON.parse(x.responseText);
                r.ok ? ok(r) : ko(new Error(r.error || 'errore server'));
            } catch (e) { ko(new Error('risposta non valida: ' + x.responseText.slice(0, 120))); }
        };
        x.onerror = () => ko(new Error('errore di rete'));
        x.open('POST', 'api.php');
        x.send(fd);
    });
}

async function processFile(file, ui) {
    if (file.size > MAX_MB * 1024 * 1024) throw new Error('File oltre ' + MAX_MB + 'MB');
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || ('pano_' + Date.now());
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');

    // 1) Decodifica
    ui.phase('Decodifica...'); ui.pct(3);
    const d = await decodeFull(file);
    const grid = tileGrid(d.w);
    console.log('[360e] ' + name + ': ' + d.w + 'x' + d.h + ' -> griglia ' + grid.cols + 'x' + grid.rows + ' tile ' + grid.tile + 'px');

    // 2) Canvas alla risoluzione normalizzata
    ui.phase('Preparazione ' + Math.round(grid.normW * grid.normH / 1e6) + 'MP...'); ui.pct(6);
    const full = document.createElement('canvas');
    full.width = grid.normW; full.height = grid.normH;
    const fctx = full.getContext('2d');
    fctx.drawImage(d.img, 0, 0, grid.normW, grid.normH);
    URL.revokeObjectURL(d.url);

    // 3) Miniatura + base
    ui.phase('Miniatura e base...'); ui.pct(9);
    const th = document.createElement('canvas'); th.width = 1024; th.height = 512;
    th.getContext('2d').drawImage(full, 0, 0, 1024, 512);
    const thumbBlob = await canvasBlob(th, 0.82);
    const bs = document.createElement('canvas'); bs.width = 2048; bs.height = 1024;
    bs.getContext('2d').drawImage(full, 0, 0, 2048, 1024);
    const baseBlob = await canvasBlob(bs, 0.85);
    await post({ action: 'upload_asset', slug: SLUG, name: name, kind: 'thumb' }, { file: thumbBlob });
    await post({ action: 'upload_asset', slug: SLUG, name: name, kind: 'base' }, { file: baseBlob });

    // 4) Tile: genera e invia a lotti di 12
    const totTiles = grid.cols * grid.rows;
    const tcan = document.createElement('canvas');
    tcan.width = grid.tile; tcan.height = grid.tile;
    const tctx = tcan.getContext('2d');
    let sent = 0;
    let batch = [], coords = [];
    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            tctx.clearRect(0, 0, grid.tile, grid.tile);
            tctx.drawImage(full, c * grid.tile, r * grid.tile, grid.tile, grid.tile, 0, 0, grid.tile, grid.tile);
            batch.push(await canvasBlob(tcan, 0.82));
            coords.push({ c: c, r: r });
            if (batch.length === 12 || (r === grid.rows - 1 && c === grid.cols - 1)) {
                const files = {};
                batch.forEach((b, i) => files['t' + i] = b);
                await post({ action: 'upload_tiles', slug: SLUG, name: name, coords: JSON.stringify(coords) }, files);
                sent += batch.length;
                batch = []; coords = [];
                ui.phase('Tile ' + sent + '/' + totTiles);
                ui.pct(12 + sent / totTiles * 72);
            }
        }
    }

    // 5) Originale (facoltativo: se fallisce per limiti server, si prosegue)
    let origName = '';
    ui.phase('Invio originale...'); ui.pct(86);
    try {
        await post({ action: 'upload_asset', slug: SLUG, name: name, kind: 'original' }, { file: file },
            f => ui.pct(86 + f * 10));
        origName = name + '.jpg';
    } catch (e) {
        console.log('[360e] originale non caricato (' + e.message + '), i tile bastano al viewer');
    }

    // 6) Finalizza
    ui.phase('Finalizzazione...'); ui.pct(97);
    await post({
        action: 'finalize_image', slug: SLUG, name: name, title: title,
        w: grid.normW, h: grid.normH, cols: grid.cols, rows: grid.rows, orig_file: origName,
    }, {});
    ui.pct(100);
    ui.phase('Completata ✓');
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
