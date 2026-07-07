<?php
require_once __DIR__ . '/lib.php';
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
        const blob = await res.blob();
        return URL.createObjectURL(blob);
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
    return URL.createObjectURL(new Blob(chunks));
}

let viewer;
let autoRotateOn = false;
let rafId = null;

try {
    const blobUrl = await downloadWithProgress(IMG_URL);

    viewer = new Viewer({
        container: document.getElementById('viewer'),
        panorama: blobUrl,
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
