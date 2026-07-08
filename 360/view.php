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
$thumb_url = 'data/' . $slug . '/_thumbs/' . pathinfo($image['file'], PATHINFO_FILENAME) . '.jpg';
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
    <div class="loading-label" id="loadingLabel">Download panorama... (v7)</div>
</div>

<div id="viewer"></div>

<div id="stitchWarn" style="display:none;position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:60;background:rgba(80,50,0,0.88);backdrop-filter:blur(8px);border:1px solid #f0883e;color:#ffd8a8;padding:10px 14px;border-radius:10px;font-size:13px;max-width:min(560px,92vw);align-items:flex-start;gap:10px;">
    <span style="flex:1;"></span>
    <button onclick="this.parentElement.style.display='none'" style="background:none;border:none;color:#ffd8a8;font-size:16px;cursor:pointer;padding:0;line-height:1;">✕</button>
</div>


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
    <button class="ui-btn" id="hdBtn" title="Piena risoluzione 120MP (consigliato su PC)" style="display:none;font-size:12px;font-weight:700;">HD</button>
</div>

<div class="bottom-bar">
    <?php if ($prev): ?>
        <a href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($prev['file'])) ?>&v=7" class="ui-btn">‹ Precedente</a>
    <?php else: ?>
        <span class="ui-btn disabled">‹ Precedente</span>
    <?php endif; ?>
    <button class="ui-btn" id="gyroBtn" style="display:none;">Giroscopio</button>
    <?php if ($next): ?>
        <a href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($next['file'])) ?>&v=7" class="ui-btn">Successivo ›</a>
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

// ============================================================
// v6 - CONFIGURAZIONE IDENTICA ALLA V1 ORIGINALE
// URL passato direttamente a Photo Sphere Viewer, che gestisce
// da solo download, eventuali metadati XMP e mappatura sferica.
// Nessuna elaborazione intermedia. In piu': verdetto automatico
// sul contenuto del file tramite scansione della miniatura.
// ============================================================
const IMG_URL = <?= json_encode($image_url) ?>;
const THUMB_URL = <?= json_encode($thumb_url) ?>;
const APP_VERSION = 'v7';
console.log('[360]', APP_VERSION);

const ringPct = document.getElementById('ringPct');
const ringFg = document.getElementById('ringFg');
const loadingLabel = document.getElementById('loadingLabel');
const CIRC = 251.3;

function setProgress(pct) {
    ringFg.style.strokeDashoffset = CIRC - (CIRC * Math.min(100, pct) / 100);
    ringPct.textContent = Math.round(Math.min(100, pct)) + '%';
}

// ============================================================
// v7 - LA CAUSA VERA (verificata sui file reali del server):
// i pano sono 15520x7760 = 481MB di texture GPU. Sotto il
// limite dimensionale (16384) quindi three.js NON ridimensiona,
// ma oltre la memoria pratica dei telefoni: il driver lascia
// regioni non caricate = strisce/zone nere. Su PC (RTX) tutto
// ok, ed ecco perche' "prima funzionava" su desktop.
// FIX: ridimensionamento client-side a max 8192px prima della
// GPU (134MB), con doppio fallback di decodifica per Android.
// ============================================================
const MAX_TEX = 8192;

async function downloadWithProgress(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const total = parseInt(res.headers.get('Content-Length') || '0', 10);
    if (!total || !res.body) {
        loadingLabel.textContent = 'Download in corso...';
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
        setProgress(received / total * 80);
    }
    return new Blob(chunks);
}

async function decodeScaled(blob) {
    // Percorso 1: createImageBitmap con resize integrato
    try {
        const probe = await new Promise((res, rej) => {
            const u = URL.createObjectURL(blob);
            const im = new Image();
            im.onload = () => { const s = {w: im.naturalWidth, h: im.naturalHeight, img: im, url: u}; res(s); };
            im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode fallito')); };
            im.src = u;
        });
        const { w, h, img, url } = probe;
        console.log('[360] originale', w + 'x' + h);
        if (w <= MAX_TEX) { URL.revokeObjectURL(url); return null; } // piccolo: URL diretto ok
        const nw = MAX_TEX, nh = Math.round(h * MAX_TEX / w);
        let canvas = document.createElement('canvas');
        canvas.width = nw; canvas.height = nh;
        const ctx = canvas.getContext('2d');
        try {
            const bmp = await createImageBitmap(blob, { resizeWidth: nw, resizeHeight: nh, resizeQuality: 'high' });
            ctx.drawImage(bmp, 0, 0);
            bmp.close();
        } catch (e1) {
            // Percorso 2 (fallback Android): decodifica via <img>
            console.log('[360] fallback img decode:', e1.message);
            ctx.drawImage(img, 0, 0, nw, nh);
        }
        URL.revokeObjectURL(url);
        const out = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
        if (!out) throw new Error('toBlob nullo');
        console.log('[360] texture ridotta a', nw + 'x' + nh);
        return URL.createObjectURL(out);
    } catch (e) {
        console.log('[360] downscale impossibile, uso URL diretto:', e.message);
        return null;
    }
}


// ============================================================
// Verdetto file: analizza la miniatura (copia fedele ridotta
// dell'originale). Se trovasse nero cucito nel file lo dichiara.
// Sui file attuali (verificati puliti) non scatta mai.
// ============================================================
function scanBlack(ctx, w, h) {
    const T = 14, FRAC = 0.92;
    const rowFrac = (y) => {
        const d = ctx.getImageData(0, y, w, 1).data;
        let dark = 0, tot = 0;
        for (let i = 0; i < d.length; i += 16) { tot++; if (d[i] < T && d[i+1] < T && d[i+2] < T) dark++; }
        return dark / tot;
    };
    let topBand = 0;
    for (let y = 0; y < h * 0.4; y += 2) { if (rowFrac(y) >= FRAC) topBand = y + 2; else break; }
    let bottomBand = 0;
    for (let y = h - 1; y > h * 0.6; y -= 2) { if (rowFrac(y) >= FRAC) bottomBand = h - y + 1; else break; }
    const y0 = topBand + 2, y1 = h - bottomBand - 2;
    let maxRun = 0, run = 0;
    for (let x = 0; x < w; x += 4) {
        const d = ctx.getImageData(x, y0, 1, Math.max(1, y1 - y0)).data;
        let dark = 0, tot = 0;
        for (let i = 0; i < d.length; i += 16) { tot++; if (d[i] < T && d[i+1] < T && d[i+2] < T) dark++; }
        if (tot && dark / tot >= FRAC) { run++; if (run > maxRun) maxRun = run; } else run = 0;
    }
    const wedgeDeg = Math.round(maxRun * 4 / w * 360);
    return {
        topBandPct: Math.round(topBand / h * 100),
        bottomBandPct: Math.round(bottomBand / h * 100),
        wedgeDeg,
        baked: wedgeDeg >= 4 || topBand / h > 0.03 || bottomBand / h > 0.03,
    };
}

async function verdictFromThumb() {
    try {
        const res = await fetch(THUMB_URL);
        if (!res.ok) return;
        const bmp = await createImageBitmap(await res.blob());
        const c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bmp, 0, 0);
        bmp.close();
        const s = scanBlack(ctx, c.width, c.height);
        console.log('[360] verdetto file:', JSON.stringify(s));
        if (s.baked) {
            const parts = [];
            if (s.wedgeDeg >= 4) parts.push('spicchio di ~' + s.wedgeDeg + '\u00b0');
            if (s.bottomBandPct > 3) parts.push('banda al nadir (' + s.bottomBandPct + '%)');
            if (s.topBandPct > 3) parts.push('banda allo zenit (' + s.topBandPct + '%)');
            const el = document.getElementById('stitchWarn');
            if (el) {
                el.querySelector('span').textContent =
                    'Il nero \u00e8 dentro il file JPEG (' + parts.join(', ') + '): riesporta il panorama con stitching completo.';
                el.style.display = 'flex';
            }
        }
    } catch (e) { console.log('[360] scan thumb saltato:', e.message); }
}

let viewer;
let hdLoaded = false;

async function boot() {
    let panoSrc = IMG_URL;
    try {
        const blob = await downloadWithProgress(IMG_URL);
        loadingLabel.textContent = 'Elaborazione immagine...';
        setProgress(85);
        const scaled = await decodeScaled(blob);
        if (scaled) panoSrc = scaled;
    } catch (e) {
        console.log('[360] download custom fallito, PSV carica da URL:', e.message);
    }
    setProgress(92);
    loadingLabel.textContent = 'Preparazione sfera...';

    viewer = new Viewer({
        container: document.getElementById('viewer'),
        panorama: panoSrc,
        navbar: false,
        defaultZoomLvl: 30,
        mousewheel: true,
        touchmoveTwoFingers: false,
    });

    viewer.addEventListener('ready', () => {
        setProgress(100);
        const ov = document.getElementById('loading');
        if (ov) { ov.classList.add('hidden'); setTimeout(() => ov.remove(), 500); }
        verdictFromThumb();
    }, { once: true });

    viewer.addEventListener('panorama-load-error', () => {
        loadingLabel.textContent = 'Errore caricamento panorama';
        loadingLabel.style.color = '#f85149';
        ringPct.textContent = '\u2715';
    });

    // Bottone HD: piena risoluzione on-demand (consigliato solo su PC)
    const hdBtn = document.getElementById('hdBtn');
    hdBtn.style.display = '';
    hdBtn.addEventListener('click', () => {
        if (hdLoaded) return;
        hdLoaded = true;
        hdBtn.classList.add('active');
        hdBtn.textContent = '...';
        viewer.setPanorama(IMG_URL, { transition: false }).then(() => {
            hdBtn.textContent = 'HD';
            console.log('[360] piena risoluzione caricata');
        }).catch(() => {
            hdBtn.textContent = 'HD';
            hdBtn.classList.remove('active');
            hdLoaded = false;
        });
    });
}

// ============================================================
// Controlli laterali
// ============================================================
let autoRotateOn = false;
let rafId = null;

boot();

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
// Giroscopio opt-in
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
                const r = await DeviceOrientationEvent.requestPermission();
                if (r === 'granted') startGyro();
            } catch (e) { console.error(e); }
        } else {
            startGyro();
        }
    });
}

// ============================================================
// Tastiera
// ============================================================
const PREV_URL = <?= $prev ? json_encode('view.php?g=' . rawurlencode($slug) . '&i=' . rawurlencode($prev['file']) . '&v=7') : 'null' ?>;
const NEXT_URL = <?= $next ? json_encode('view.php?g=' . rawurlencode($slug) . '&i=' . rawurlencode($next['file']) . '&v=7') : 'null' ?>;
const BACK_URL = <?= json_encode('gallery.php?g=' . rawurlencode($slug)) ?>;

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && PREV_URL) window.location.href = PREV_URL;
    else if (e.key === 'ArrowRight' && NEXT_URL) window.location.href = NEXT_URL;
    else if (e.key === 'Escape' && !document.fullscreenElement) window.location.href = BACK_URL;
});
</script>

</body>
</html>
