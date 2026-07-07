<?php
require_once __DIR__ . '/lib.php';
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
$cfg = load_config();

$slug = $_GET['g'] ?? '';
$file = $_GET['i'] ?? '';
$gallery = find_gallery($slug);

if (!$gallery) {
    header('Location: index.php');
    exit;
}

$meta = load_gallery_meta($slug);
$image = null;
$index = -1;
foreach ($meta['images'] as $i => $img) {
    if ($img['file'] === $file) {
        $image = $img;
        $index = $i;
        break;
    }
}

if (!$image) {
    header('Location: gallery.php?g=' . urlencode($slug));
    exit;
}

$prev = $index > 0 ? $meta['images'][$index - 1] : null;
$next = $index < count($meta['images']) - 1 ? $meta['images'][$index + 1] : null;
$image_url = 'data/' . $slug . '/' . $image['file'];
$total = count($meta['images']);
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= h($image['title']) ?> · <?= h($gallery['title']) ?></title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/core@5.13.4/index.css">
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
        height: 100%;
        background: #000;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #fff;
    }
    #viewer { position: fixed; inset: 0; }

    .ui-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: rgba(10,14,20,0.55);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 10px;
        color: #fff;
        font-size: 13px;
        text-decoration: none;
        cursor: pointer;
        padding: 10px 14px;
        touch-action: manipulation;
        transition: background 0.15s ease;
        font-family: inherit;
    }
    .ui-btn:hover { background: rgba(10,14,20,0.8); }
    .ui-btn:focus-visible { outline: 2px solid #58a6ff; outline-offset: 2px; }
    .ui-btn.disabled { opacity: 0.3; pointer-events: none; }
    .ui-btn.active { border-color: #58a6ff; color: #58a6ff; }

    .top-bar {
        position: fixed;
        top: 0; left: 0; right: 0;
        padding: max(12px, env(safe-area-inset-top)) 16px 24px;
        background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        z-index: 50;
        pointer-events: none;
    }
    .top-bar > * { pointer-events: auto; }
    .top-bar .title {
        font-size: 15px;
        font-weight: 500;
        text-shadow: 0 1px 4px rgba(0,0,0,0.9);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: right;
        pointer-events: none;
    }
    .top-bar .counter {
        font-size: 12px;
        color: rgba(255,255,255,0.65);
        margin-top: 2px;
    }

    .bottom-bar {
        position: fixed;
        bottom: max(16px, env(safe-area-inset-bottom));
        left: 0; right: 0;
        display: flex;
        justify-content: center;
        gap: 8px;
        z-index: 50;
        padding: 0 12px;
        flex-wrap: wrap;
    }

    .side-controls {
        position: fixed;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 50;
    }
    .side-controls .ui-btn {
        width: 44px;
        height: 44px;
        padding: 0;
        font-size: 18px;
    }

    /* Loading con anello di progresso */
    .loading-overlay {
        position: fixed;
        inset: 0;
        background: radial-gradient(ellipse at 50% 45%, #101822 0%, #000 75%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 20px;
        z-index: 100;
        transition: opacity 0.4s ease;
    }
    .loading-overlay.hidden { opacity: 0; pointer-events: none; }
    .ring-wrap { position: relative; width: 88px; height: 88px; }
    .ring-wrap svg { transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 5; }
    .ring-fg {
        fill: none;
        stroke: #58a6ff;
        stroke-width: 5;
        stroke-linecap: round;
        stroke-dasharray: 251.3;
        stroke-dashoffset: 251.3;
        transition: stroke-dashoffset 0.2s ease;
    }
    .ring-pct {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }
    .loading-label { font-size: 13px; color: #8b949e; }
    .loading-title { font-size: 15px; color: #e6edf3; font-weight: 500; }

    @media (max-width: 600px) {
        .top-bar .title { max-width: 46vw; font-size: 13px; }
        .bottom-bar .ui-btn { padding: 9px 12px; font-size: 12px; }
        .side-controls { right: 8px; }
        .side-controls .ui-btn { width: 40px; height: 40px; }
    }
    @media (prefers-reduced-motion: reduce) {
        .ring-fg, .loading-overlay { transition: none; }
    }
</style>
</head>
<body>

<div class="loading-overlay" id="loading">
    <div class="ring-wrap">
        <svg width="88" height="88" viewBox="0 0 88 88">
            <circle class="ring-bg" cx="44" cy="44" r="40"/>
            <circle class="ring-fg" id="ringFg" cx="44" cy="44" r="40"/>
        </svg>
        <div class="ring-pct" id="ringPct">0%</div>
    </div>
    <div class="loading-title"><?= h($image['title']) ?></div>
    <div class="loading-label" id="loadingLabel">Download panorama...</div>
</div>

<div id="viewer"></div>

<div class="top-bar">
    <a href="gallery.php?g=<?= h(urlencode($slug)) ?>" class="ui-btn">‹ Galleria</a>
    <div>
        <div class="title"><?= h($image['title']) ?></div>
        <div class="counter" style="text-align:right;"><?= $index + 1 ?> di <?= $total ?></div>
    </div>
</div>

<div class="side-controls">
    <button class="ui-btn" id="zoomIn" title="Zoom avanti">+</button>
    <button class="ui-btn" id="zoomOut" title="Zoom indietro">−</button>
    <button class="ui-btn" id="autoRotate" title="Rotazione automatica">↻</button>
    <button class="ui-btn" id="fullscreen" title="Schermo intero">⛶</button>
</div>

<div class="bottom-bar">
    <?php if ($prev): ?>
        <a href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($prev['file'])) ?>" class="ui-btn">‹ Precedente</a>
    <?php else: ?>
        <span class="ui-btn disabled">‹ Precedente</span>
    <?php endif; ?>
    <button class="ui-btn" id="gyroBtn" style="display:none;">Giroscopio</button>
    <?php if ($next): ?>
        <a href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($next['file'])) ?>" class="ui-btn">Successivo ›</a>
    <?php else: ?>
        <span class="ui-btn disabled">Successivo ›</span>
    <?php endif; ?>
</div>

<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "@photo-sphere-viewer/core": "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/core@5.13.4/index.module.js"
  }
}
</script>

<script type="module">
import { Viewer } from '@photo-sphere-viewer/core';

const IMG_URL = <?= json_encode($image_url) ?>;
const ringFg = document.getElementById('ringFg');
const ringPct = document.getElementById('ringPct');
const loadingLabel = document.getElementById('loadingLabel');
const CIRC = 251.3;

function setProgress(pct) {
    ringFg.style.strokeDashoffset = CIRC - (CIRC * pct / 100);
    ringPct.textContent = Math.round(pct) + '%';
}

// ============================================================
// Download con progresso reale, poi blob URL al viewer.
// Con panorami da 30-40MB la percentuale è informazione vera.
// ============================================================
async function downloadWithProgress(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const total = parseInt(res.headers.get('Content-Length') || '0', 10);

    if (!total || !res.body) {
        // Niente Content-Length: fallback indeterminato
        loadingLabel.textContent = 'Download in corso...';
        ringPct.textContent = '...';
        return await res.blob();
    }

    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setProgress(received / total * 90); // 90%: il resto è il decode
    }
    loadingLabel.textContent = 'Elaborazione immagine...';
    setProgress(95);
    return new Blob(chunks);
}

// ============================================================
// Legge i metadati XMP GPano (li scrivono DJI e molti stitcher).
// Servono per posizionare correttamente sulla sfera i panorami
// parziali (es. drone senza zenit). Senza questi, PSV stira
// l'immagine su tutta la sfera e si vedono spicchi neri.
// ============================================================
async function parseGPano(blob) {
    const head = await blob.slice(0, 262144).text();
    const grab = (name) => {
        const m = head.match(new RegExp('GPano:' + name + "[=\"'>]+([0-9]+)"));
        return m ? parseInt(m[1], 10) : null;
    };
    const fw = grab('FullPanoWidthPixels');
    const fh = grab('FullPanoHeightPixels');
    const cw = grab('CroppedAreaImageWidthPixels');
    const ch = grab('CroppedAreaImageHeightPixels');
    const cx = grab('CroppedAreaLeftPixels');
    const cy = grab('CroppedAreaTopPixels');
    if (fw && fh && cw && ch && cx !== null && cy !== null) {
        return { fullWidth: fw, fullHeight: fh, croppedWidth: cw, croppedHeight: ch, croppedX: cx, croppedY: cy };
    }
    return null;
}

// ============================================================
// Ridimensiona a max 8192px di larghezza prima di darla alla
// GPU: una texture 120MP occupa fino a 500MB di VRAM e rende
// il trascinamento lentissimo anche su telefoni top di gamma.
// ============================================================
const MAX_TEX = 8192;
const APP_VERSION = 'v3.1';
const DEBUG = new URLSearchParams(location.search).has('debug');
const dbgLines = [];
function dbg(line) {
    dbgLines.push(line);
    if (!DEBUG) return;
    let el = document.getElementById('dbgOverlay');
    if (!el) {
        el = document.createElement('pre');
        el.id = 'dbgOverlay';
        el.style.cssText = 'position:fixed;top:70px;left:8px;z-index:999;background:rgba(0,0,0,0.8);color:#3fb950;font-size:11px;padding:8px 10px;border-radius:8px;max-width:85vw;white-space:pre-wrap;pointer-events:none;font-family:monospace;';
        document.body.appendChild(el);
    }
    el.textContent = dbgLines.join('\n');
}
dbg('CAD3D 360 ' + APP_VERSION);

async function getImageSize(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { const s = { w: img.naturalWidth, h: img.naturalHeight }; URL.revokeObjectURL(url); resolve(s); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode dimensioni fallito')); };
        img.src = url;
    });
}

async function preparePanorama(blob) {
    let panoData = await parseGPano(blob);
    dbg('XMP GPano: ' + (panoData ? 'presente ' + JSON.stringify(panoData) : 'assente'));

    loadingLabel.textContent = 'Elaborazione immagine...';
    const { w, h } = await getImageSize(blob);
    dbg('Immagine: ' + w + 'x' + h + ' (' + (w*h/1e6).toFixed(1) + 'MP, aspect ' + (w/h).toFixed(3) + ')');

    try {
        const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
        if (gl) dbg('GPU max texture: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
    } catch(e) {}

    if (!panoData && Math.abs(w / h - 2) > 0.02) {
        const fullH = Math.round(w / 2);
        panoData = {
            fullWidth: w, fullHeight: fullH,
            croppedWidth: w, croppedHeight: h,
            croppedX: 0, croppedY: Math.round((fullH - h) / 2),
        };
        dbg('panoData fallback applicato (aspect non 2:1)');
    }

    let outBlob = blob;
    if (w > MAX_TEX) {
        const scale = MAX_TEX / w;
        const nw = MAX_TEX, nh = Math.round(h * scale);
        dbg('Downscale a ' + nw + 'x' + nh);
        const bmp = await createImageBitmap(blob, { resizeWidth: nw, resizeHeight: nh, resizeQuality: 'high' });
        const canvas = document.createElement('canvas');
        canvas.width = nw; canvas.height = nh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        bmp.close();

        if (DEBUG) analyzeBlack(ctx, nw, nh);

        outBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
        if (panoData) {
            for (const k of Object.keys(panoData)) panoData[k] = Math.round(panoData[k] * scale);
        }
    } else if (DEBUG) {
        const bmp = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        bmp.close();
        analyzeBlack(ctx, w, h);
    }
    dbg('panoData finale: ' + (panoData ? JSON.stringify(panoData) : 'nessuno (sfera piena)'));
    return { url: URL.createObjectURL(outBlob), panoData };
}

// Rileva se il nero è DENTRO il file: campiona ultima riga,
// prima riga e 24 colonne verticali
function analyzeBlack(ctx, w, h) {
    const isBlackRow = (y) => {
        const d = ctx.getImageData(0, y, w, 1).data;
        let dark = 0;
        for (let i = 0; i < d.length; i += 40) {
            if (d[i] < 12 && d[i+1] < 12 && d[i+2] < 12) dark++;
        }
        return dark / (d.length / 40);
    };
    dbg('Nero riga TOP: ' + Math.round(isBlackRow(1) * 100) + '% | BOTTOM: ' + Math.round(isBlackRow(h - 2) * 100) + '%');
    let blackCols = [];
    for (let c = 0; c < 24; c++) {
        const x = Math.floor(w * c / 24);
        const d = ctx.getImageData(x, 0, 1, h).data;
        let dark = 0;
        for (let i = 0; i < d.length; i += 40) {
            if (d[i] < 12 && d[i+1] < 12 && d[i+2] < 12) dark++;
        }
        if (dark / (d.length / 40) > 0.9) blackCols.push(c);
    }
    dbg('Colonne verticali nere (su 24): ' + (blackCols.length ? blackCols.join(',') : 'nessuna'));
}

let viewer;
let autoRotateOn = false;
let rafId = null;

try {
    const rawBlob = await downloadWithProgress(IMG_URL);
    const { url: panoUrl, panoData } = await preparePanorama(rawBlob);

    viewer = new Viewer({
        container: document.getElementById('viewer'),
        panorama: panoUrl,
        panoData: panoData || undefined,
        navbar: false,
        defaultZoomLvl: 30,
        mousewheel: true,
        touchmoveTwoFingers: false,
    });

    viewer.addEventListener('ready', () => {
        setProgress(100);
        const ov = document.getElementById('loading');
        ov.classList.add('hidden');
        setTimeout(() => ov.remove(), 500);
    }, { once: true });

} catch (err) {
    loadingLabel.textContent = 'Errore caricamento: ' + err.message;
    loadingLabel.style.color = '#f85149';
    ringPct.textContent = '✕';
}

// ============================================================
// Controlli laterali
// ============================================================
document.getElementById('zoomIn').addEventListener('click', () => {
    if (viewer) viewer.zoom(Math.min(100, viewer.getZoomLevel() + 12));
});
document.getElementById('zoomOut').addEventListener('click', () => {
    if (viewer) viewer.zoom(Math.max(0, viewer.getZoomLevel() - 12));
});

const arBtn = document.getElementById('autoRotate');
function autoRotateTick() {
    if (!autoRotateOn || !viewer) return;
    const pos = viewer.getPosition();
    viewer.rotate({ yaw: pos.yaw + 0.0018, pitch: pos.pitch });
    rafId = requestAnimationFrame(autoRotateTick);
}
arBtn.addEventListener('click', () => {
    autoRotateOn = !autoRotateOn;
    arBtn.classList.toggle('active', autoRotateOn);
    if (autoRotateOn) autoRotateTick();
    else if (rafId) cancelAnimationFrame(rafId);
});
// Il drag manuale interrompe l'autorotazione
document.getElementById('viewer').addEventListener('pointerdown', () => {
    if (autoRotateOn) {
        autoRotateOn = false;
        arBtn.classList.remove('active');
        if (rafId) cancelAnimationFrame(rafId);
    }
});

document.getElementById('fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
});

// ============================================================
// Giroscopio: opt-in con bottone (iOS lo richiede, su Android
// evita conflitti col drag)
// ============================================================
const gyroBtn = document.getElementById('gyroBtn');
let gyroEnabled = false;

function isMobile() {
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function startGyro() {
    if (gyroEnabled || !viewer) return;
    gyroEnabled = true;
    let lastAlpha = null, lastBeta = null;
    window.addEventListener('deviceorientation', (e) => {
        if (e.alpha === null || e.beta === null || !gyroEnabled) return;
        if (lastAlpha === null) { lastAlpha = e.alpha; lastBeta = e.beta; return; }
        let dAlpha = e.alpha - lastAlpha;
        // Gestione wrap 0/360
        if (dAlpha > 180) dAlpha -= 360;
        if (dAlpha < -180) dAlpha += 360;
        const dBeta = e.beta - lastBeta;
        lastAlpha = e.alpha; lastBeta = e.beta;
        const pos = viewer.getPosition();
        viewer.rotate({
            yaw: pos.yaw - dAlpha * Math.PI / 180,
            pitch: Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, pos.pitch + dBeta * Math.PI / 180)),
        });
    });
    gyroBtn.classList.add('active');
}

function stopGyro() {
    gyroEnabled = false;
    gyroBtn.classList.remove('active');
}

if (isMobile() && window.DeviceOrientationEvent) {
    gyroBtn.style.display = '';
    gyroBtn.addEventListener('click', async () => {
        if (gyroEnabled) { stopGyro(); return; }
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const result = await DeviceOrientationEvent.requestPermission();
                if (result === 'granted') startGyro();
            } catch (e) { console.error(e); }
        } else {
            startGyro();
        }
    });
}

// ============================================================
// Tastiera: frecce prev/next, ESC torna alla galleria
// ============================================================
const PREV_URL = <?= $prev ? json_encode('view.php?g=' . rawurlencode($slug) . '&i=' . rawurlencode($prev['file'])) : 'null' ?>;
const NEXT_URL = <?= $next ? json_encode('view.php?g=' . rawurlencode($slug) . '&i=' . rawurlencode($next['file'])) : 'null' ?>;
const BACK_URL = <?= json_encode('gallery.php?g=' . rawurlencode($slug)) ?>;

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && PREV_URL) window.location.href = PREV_URL;
    else if (e.key === 'ArrowRight' && NEXT_URL) window.location.href = NEXT_URL;
    else if (e.key === 'Escape' && !document.fullscreenElement) window.location.href = BACK_URL;
});
</script>

</body>
</html>
