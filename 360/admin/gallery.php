<?php
require_once __DIR__ . '/_auth.php';
$cfg = load_config();

$slug = $_GET['g'] ?? '';
$gallery = find_gallery($slug);

if (!$gallery) {
    header('Location: index.php');
    exit;
}

$meta = load_gallery_meta($slug);
$images = $meta['images'];

$msg = $_GET['msg'] ?? '';
$err = $_GET['err'] ?? '';
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($gallery['title']) ?> · Admin</title>
<link rel="stylesheet" href="../assets/style.css">
<style>
/* Drag & drop per riordinare immagini */
.image-card { user-select: none; }
.image-card.dragging { opacity: 0.4; border-color: #58a6ff; }
.image-card.drag-over { border-color: #f0883e; border-style: dashed; }
.drag-handle {
    cursor: grab;
    color: #8b949e;
    font-size: 18px;
    padding: 0 6px;
    line-height: 1;
}
.drag-handle:active { cursor: grabbing; }
</style>
</head>
<body>

<header class="site-header">
    <div class="container" style="padding:0;">
        <div>
            <div class="site-title"><a href="index.php" style="color:inherit;">Admin</a> / <?= h($gallery['title']) ?></div>
        </div>
        <div class="header-actions">
            <a href="../gallery.php?g=<?= h(urlencode($slug)) ?>" class="btn btn-sm" target="_blank">Vedi galleria</a>
            <a href="logout.php" class="btn btn-sm btn-danger">Logout</a>
        </div>
    </div>
</header>

<main class="container">
    <?php if ($msg): ?><div class="alert alert-success"><?= h($msg) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="alert alert-error"><?= h($err) ?></div><?php endif; ?>

    <!-- Zone Upload -->
    <div style="margin-bottom:32px;">
        <h2 class="section-title">Carica panorami</h2>
        <div class="alert alert-info">
            Le miniature vengono generate dal browser prima dell'upload. Per file 120MP ci vogliono alcuni secondi.
            I formati supportati sono JPEG e PNG.
        </div>

        <div style="margin-bottom:16px;">
            <label class="form-label">Galleria di destinazione</label>
            <div style="padding:10px 14px;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#e6edf3;font-size:14px;">
                <?= h($gallery['title']) ?>
            </div>
        </div>

        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
            <div class="drop-zone-icon">🌐</div>
            <div class="drop-zone-text">Trascina i panorami equirettangolari qui</div>
            <div class="drop-zone-hint">oppure clicca per selezionare · JPEG, PNG · fino a <?= $cfg['max_upload_mb'] ?>MB per file</div>
        </div>
        <input type="file" id="fileInput" multiple accept="image/jpeg,image/png,image/jpg" style="display:none;">

        <div class="upload-queue" id="uploadQueue"></div>
    </div>

    <!-- Lista immagini -->
    <div>
        <div class="action-bar" style="margin-bottom:16px;">
            <h2 class="section-title" style="margin:0;"><?= count($images) ?> panorami</h2>
            <?php if (!empty($images)): ?>
                <div class="action-bar-spacer"></div>
                <span style="font-size:12px;color:#8b949e;">Trascina le card per riordinare</span>
                <button class="btn btn-sm btn-primary" id="saveOrderBtn" style="display:none;" onclick="saveOrder()">Salva ordine</button>
            <?php endif; ?>
        </div>

        <?php if (empty($images)): ?>
            <div class="empty-state" style="padding:40px 20px;">
                <h2>Nessun panorama ancora</h2>
                <p>Carica il primo usando la zona sopra.</p>
            </div>
        <?php else: ?>
            <div class="images-grid" id="imagesGrid">
                <?php foreach ($images as $img): ?>
                    <div class="image-card" draggable="true" data-file="<?= h($img['file']) ?>">
                        <a href="../view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($img['file'])) ?>" target="_blank">
                            <div class="image-card-thumb">
                                <img src="../data/<?= h($slug) ?>/_thumbs/<?= h($img['file']) ?>" alt="" loading="lazy">
                            </div>
                        </a>
                        <div class="image-card-info" style="flex-wrap:wrap;gap:6px;">
                            <span class="drag-handle" title="Trascina per riordinare">⠿</span>
                            <div class="image-card-title"><?= h($img['title']) ?></div>
                        </div>
                        <div style="padding:0 10px 10px;display:flex;gap:6px;">
                            <button class="btn btn-sm" onclick="moveCard(this,-1)" title="Sposta indietro">↑</button>
                            <button class="btn btn-sm" onclick="moveCard(this,1)" title="Sposta avanti">↓</button>
                            <button class="btn btn-sm" style="flex:1;" onclick="openRenameImg('<?= h(addslashes($img['file'])) ?>','<?= h(addslashes($img['title'])) ?>')">Rinomina</button>
                            <button class="btn btn-sm btn-danger" onclick="confirmDeleteImg('<?= h(addslashes($img['file'])) ?>','<?= h(addslashes($img['title'])) ?>')">Elimina</button>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</main>

<!-- Modal Rinomina immagine -->
<div class="modal-backdrop" id="renameImgModal" style="display:none;" onclick="if(event.target===this)closeRenameImg()">
    <div class="modal">
        <h2>Rinomina panorama</h2>
        <form method="post" action="api.php">
            <input type="hidden" name="action" value="rename_image">
            <input type="hidden" name="slug" value="<?= h($slug) ?>">
            <input type="hidden" name="file" id="renameImgFile">
            <div class="form-group">
                <label class="form-label">Titolo</label>
                <input type="text" name="title" id="renameImgTitle" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn" onclick="closeRenameImg()">Annulla</button>
                <button type="submit" class="btn btn-primary">Salva</button>
            </div>
        </form>
    </div>
</div>

<!-- Form nascosto eliminazione immagine -->
<form method="post" action="api.php" id="deleteImgForm" style="display:none;">
    <input type="hidden" name="action" value="delete_image">
    <input type="hidden" name="slug" value="<?= h($slug) ?>">
    <input type="hidden" name="file" id="deleteImgFile">
</form>

<script>
const GALLERY_SLUG = <?= json_encode($slug) ?>;
const MAX_MB = <?= (int)$cfg['max_upload_mb'] ?>;
const THUMB_W = <?= (int)$cfg['thumb_width'] ?>;

// ============================================================
// UPLOAD CON THUMBNAIL GENERATA DAL BROWSER
// ============================================================

async function generateThumb(file) {
    return new Promise((resolve, reject) => {
        const bitmap_promise = createImageBitmap
            ? createImageBitmap(file, { resizeWidth: THUMB_W, resizeHeight: THUMB_W / 2, resizeQuality: 'high' })
            : null;

        if (!bitmap_promise) {
            // Fallback per browser senza createImageBitmap con options
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = THUMB_W;
                canvas.height = THUMB_W / 2;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                canvas.toBlob(resolve, 'image/jpeg', 0.80);
            };
            img.onerror = reject;
            img.src = url;
            return;
        }

        bitmap_promise.then(bitmap => {
            const canvas = document.createElement('canvas');
            canvas.width = THUMB_W;
            canvas.height = THUMB_W / 2;
            canvas.getContext('2d').drawImage(bitmap, 0, 0);
            bitmap.close();
            canvas.toBlob(resolve, 'image/jpeg', 0.80);
        }).catch(reject);
    });
}

async function uploadFile(file, queueItem) {
    const maxBytes = MAX_MB * 1024 * 1024;
    if (file.size > maxBytes) {
        setItemStatus(queueItem, 'error', `Troppo grande (max ${MAX_MB}MB)`);
        return;
    }

    // Genera thumbnail
    setItemStatus(queueItem, 'progress', 'Generazione miniatura...');
    let thumbBlob;
    try {
        thumbBlob = await generateThumb(file);
    } catch (e) {
        setItemStatus(queueItem, 'error', 'Errore generazione miniatura');
        return;
    }

    // Upload
    setItemStatus(queueItem, 'progress', 'Upload...');
    const fd = new FormData();
    fd.append('action', 'upload_image');
    fd.append('slug', GALLERY_SLUG);
    fd.append('image', file, file.name);
    fd.append('thumb', thumbBlob, file.name.replace(/\.[^.]+$/, '.jpg'));

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
            const pct = Math.round(e.loaded / e.total * 100);
            setItemProgress(queueItem, pct);
            setItemStatus(queueItem, 'progress', `Upload ${pct}%`);
        }
    });

    await new Promise((resolve) => {
        xhr.onload = () => {
            try {
                const res = JSON.parse(xhr.responseText);
                if (res.ok) {
                    setItemStatus(queueItem, 'success', 'Caricato!');
                    setItemProgress(queueItem, 100);
                    queueItem.classList.add('success');
                    anySuccess = true;
                } else {
                    setItemStatus(queueItem, 'error', res.error || 'Errore');
                    queueItem.classList.add('error');
                }
            } catch {
                setItemStatus(queueItem, 'error', 'Risposta non valida');
                queueItem.classList.add('error');
            }
            resolve();
        };
        xhr.onerror = () => {
            setItemStatus(queueItem, 'error', 'Errore di rete');
            queueItem.classList.add('error');
            resolve();
        };
        xhr.open('POST', 'api.php');
        xhr.send(fd);
    });
}

function addQueueItem(file) {
    const el = document.createElement('div');
    el.className = 'upload-item';
    el.innerHTML = `
        <div class="upload-item-name">${file.name}</div>
        <div class="upload-item-progress"><div class="upload-item-progress-bar"></div></div>
        <div class="upload-item-status">In attesa...</div>
    `;
    document.getElementById('uploadQueue').appendChild(el);
    return el;
}

function setItemStatus(el, type, text) {
    el.querySelector('.upload-item-status').textContent = text;
}

function setItemProgress(el, pct) {
    el.querySelector('.upload-item-progress-bar').style.width = pct + '%';
}

let anySuccess = false;

async function processFiles(files) {
    for (const file of files) {
        const item = addQueueItem(file);
        await uploadFile(file, item);
    }
    // Reload SOLO quando l'intera coda è finita, altrimenti
    // il refresh ucciderebbe gli upload successivi.
    if (anySuccess) {
        setTimeout(() => window.location.reload(), 1200);
    }
}

// Drop zone
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    processFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
});
document.getElementById('fileInput').addEventListener('change', e => {
    processFiles(Array.from(e.target.files));
    e.target.value = '';
});

// ============================================================
// DRAG & DROP RIORDINO
// ============================================================

let dragSrc = null;

document.querySelectorAll('.image-card').forEach(card => {
    card.addEventListener('dragstart', e => {
        dragSrc = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (dragSrc && dragSrc !== card) {
            const grid = document.getElementById('imagesGrid');
            const cards = Array.from(grid.children);
            const from = cards.indexOf(dragSrc);
            const to = cards.indexOf(card);
            if (from < to) grid.insertBefore(dragSrc, card.nextSibling);
            else grid.insertBefore(dragSrc, card);
            document.getElementById('saveOrderBtn').style.display = '';
        }
    });
});

function moveCard(btn, dir) {
    const card = btn.closest('.image-card');
    const grid = document.getElementById('imagesGrid');
    if (dir < 0 && card.previousElementSibling) {
        grid.insertBefore(card, card.previousElementSibling);
    } else if (dir > 0 && card.nextElementSibling) {
        grid.insertBefore(card.nextElementSibling, card);
    } else {
        return;
    }
    document.getElementById('saveOrderBtn').style.display = '';
}

function saveOrder() {
    const files = Array.from(document.querySelectorAll('.image-card')).map(c => c.dataset.file);
    fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder_images', slug: GALLERY_SLUG, order: files })
    }).then(r => r.json()).then(res => {
        if (res.ok) {
            document.getElementById('saveOrderBtn').style.display = 'none';
            const alert = document.createElement('div');
            alert.className = 'alert alert-success';
            alert.textContent = 'Ordine salvato.';
            document.querySelector('.container').insertBefore(alert, document.querySelector('.container').firstChild);
            setTimeout(() => alert.remove(), 2000);
        }
    });
}

// ============================================================
// MODALI IMMAGINI
// ============================================================

function openRenameImg(file, title) {
    document.getElementById('renameImgFile').value = file;
    document.getElementById('renameImgTitle').value = title;
    document.getElementById('renameImgModal').style.display = 'flex';
    document.getElementById('renameImgTitle').focus();
}
function closeRenameImg() { document.getElementById('renameImgModal').style.display = 'none'; }

function confirmDeleteImg(file, title) {
    if (!confirm('Eliminare il panorama "' + title + '"?')) return;
    document.getElementById('deleteImgFile').value = file;
    document.getElementById('deleteImgForm').submit();
}
</script>

</body>
</html>
