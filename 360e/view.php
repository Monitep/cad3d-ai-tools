<?php
require_once __DIR__ . '/lib.php';
$cfg = load_config();
$slug = $_GET['g'] ?? '';
$name = $_GET['i'] ?? '';
$gallery = find_gallery($slug);
if (!$gallery) { header('Location: index.php'); exit; }
$meta = load_meta($slug);
$image = null; $index = -1;
foreach ($meta['images'] as $i => $im) {
    if ($im['name'] === $name) { $image = $im; $index = $i; break; }
}
if (!$image) { header('Location: gallery.php?g=' . urlencode($slug)); exit; }
$prev = $index > 0 ? $meta['images'][$index - 1] : null;
$next = $index < count($meta['images']) - 1 ? $meta['images'][$index + 1] : null;
$base = "data/$slug/base/{$image['name']}.jpg";
$tiles = "data/$slug/tiles/{$image['name']}";
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
html, body { height: 100%; background: #06080b; overflow: hidden;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff; }
#viewer { position: fixed; inset: 0; }
.uib {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: rgba(8,11,16,0.55);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.13);
    border-radius: 12px; color: #fff;
    font-size: 13px; font-family: inherit;
    text-decoration: none; cursor: pointer;
    padding: 11px 15px;
    touch-action: manipulation;
    transition: background 0.15s ease, border-color 0.15s ease;
}
.uib:hover { background: rgba(8,11,16,0.8); }
.uib:focus-visible { outline: 2px solid #f0a03c; outline-offset: 2px; }
.uib.off { opacity: 0.3; pointer-events: none; }
.uib.on { border-color: #f0a03c; color: #f0a03c; }
.top {
    position: fixed; top: 0; left: 0; right: 0;
    padding: max(12px, env(safe-area-inset-top)) 16px 26px;
    background: linear-gradient(180deg, rgba(0,0,0,0.55), transparent);
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    z-index: 50; pointer-events: none;
}
.top > * { pointer-events: auto; }
.t-info { text-align: right; pointer-events: none; }
.t-title { font-size: 15px; font-weight: 600; text-shadow: 0 1px 5px rgba(0,0,0,0.9);
    max-width: 55vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.t-meta { font-size: 11.5px; color: rgba(255,255,255,0.65); margin-top: 2px; }
.t-meta .hq { color: #f0a03c; font-weight: 600; }
.bot {
    position: fixed; bottom: max(16px, env(safe-area-inset-bottom));
    left: 0; right: 0;
    display: flex; justify-content: center; gap: 8px;
    z-index: 50; padding: 0 12px; flex-wrap: wrap;
}
.side {
    position: fixed; right: 12px; top: 50%; transform: translateY(-50%);
    display: flex; flex-direction: column; gap: 8px; z-index: 50;
}
.side .uib { width: 46px; height: 46px; padding: 0; font-size: 18px; }
.load {
    position: fixed; inset: 0;
    background: radial-gradient(ellipse at 50% 42%, #121a24 0%, #06080b 72%);
    display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 18px;
    z-index: 100; transition: opacity 0.45s ease;
}
.load.out { opacity: 0; pointer-events: none; }
.ringw { position: relative; width: 84px; height: 84px; }
.ringw svg { transform: rotate(-90deg); }
.rbg { fill: none; stroke: rgba(255,255,255,0.09); stroke-width: 5; }
.rfg { fill: none; stroke: #f0a03c; stroke-width: 5; stroke-linecap: round;
    stroke-dasharray: 239; stroke-dashoffset: 239; transition: stroke-dashoffset 0.2s ease; }
.rpc { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.l-t { font-size: 15px; font-weight: 600; color: #e8edf4; }
.l-s { font-size: 12.5px; color: #8b96a5; }
@media (max-width: 620px) {
    .t-title { max-width: 44vw; font-size: 13.5px; }
    .bot .uib { padding: 10px 13px; font-size: 12px; }
    .side { right: 8px; }
    .side .uib { width: 42px; height: 42px; }
}
@media (prefers-reduced-motion: reduce) { .rfg, .load { transition: none; } }
</style>
</head>
<body>

<div class="load" id="load">
    <div class="ringw">
        <svg width="84" height="84" viewBox="0 0 84 84">
            <circle class="rbg" cx="42" cy="42" r="38"/>
            <circle class="rfg" id="rfg" cx="42" cy="42" r="38"/>
        </svg>
        <div class="rpc" id="rpc">0%</div>
    </div>
    <div class="l-t"><?= h($image['title']) ?></div>
    <div class="l-s" id="lst">Preparazione sfera...</div>
</div>

<div id="viewer"></div>

<div class="top">
    <a href="gallery.php?g=<?= h(urlencode($slug)) ?>" class="uib">‹ Galleria</a>
    <div class="t-info">
        <div class="t-title"><?= h($image['title']) ?></div>
        <div class="t-meta"><?= $index + 1 ?> di <?= $total ?><?php if (!empty($image['tiled'])): ?> · <span class="hq"><?= round($image['w'] * $image['h'] / 1e6) ?>MP</span><?php endif; ?></div>
    </div>
</div>

<div class="side">
    <button class="uib" id="zin" title="Zoom avanti">+</button>
    <button class="uib" id="zout" title="Zoom indietro">−</button>
    <button class="uib" id="rot" title="Rotazione automatica">↻</button>
    <button class="uib" id="fs" title="Schermo intero">⛶</button>
</div>

<div class="bot">
    <?php if ($prev): ?><a href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($prev['name'])) ?>" class="uib">‹ Prec</a>
    <?php else: ?><span class="uib off">‹ Prec</span><?php endif; ?>
    <button class="uib" id="gyro" style="display:none;">Giroscopio</button>
    <?php if ($next): ?><a href="view.php?g=<?= h(urlencode($slug)) ?>&i=<?= h(urlencode($next['name'])) ?>" class="uib">Succ ›</a>
    <?php else: ?><span class="uib off">Succ ›</span><?php endif; ?>
</div>

<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "@photo-sphere-viewer/core": "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/core@5.13.4/index.module.js",
    "@photo-sphere-viewer/equirectangular-tiles-adapter": "https://cdn.jsdelivr.net/npm/@photo-sphere-viewer/equirectangular-tiles-adapter@5.13.4/index.module.js"
  }
}
</script>

<script type="module">
import { Viewer } from '@photo-sphere-viewer/core';
import { EquirectangularTilesAdapter } from '@photo-sphere-viewer/equirectangular-tiles-adapter';

// ============================================================
// 360e viewer - rendering a TILE multirisoluzione.
// Base leggera caricata subito, tile ad alta risoluzione
// caricati solo per la porzione di sfera inquadrata: qualita'
// piena (120MP) con pochi MB di memoria GPU, su qualunque
// dispositivo. Stessa tecnica di krpano / 3DVista.
// ============================================================
const TILED = <?= !empty($image['tiled']) ? 'true' : 'false' ?>;
const IMG_W = <?= (int)($image['w'] ?? 0) ?>;
const IMG_COLS = <?= (int)($image['cols'] ?? 0) ?>;
const IMG_ROWS = <?= (int)($image['rows'] ?? 0) ?>;
const BASE_URL = <?= json_encode($base) ?>;
const TILES_DIR = <?= json_encode($tiles) ?>;
const LEGACY_URL = <?= json_encode(!empty($image['src']) ? $image['src'] : "data/$slug/{$image['file']}") ?>;
console.log('[360e] v1', TILED ? 'tiled ' + IMG_W + 'px ' + IMG_COLS + 'x' + IMG_ROWS : 'legacy');

const rfg = document.getElementById('rfg');
const rpc = document.getElementById('rpc');
const lst = document.getElementById('lst');
const CIRC = 239;
function prog(p) {
    rfg.style.strokeDashoffset = CIRC - CIRC * Math.min(100, p) / 100;
    rpc.textContent = Math.round(Math.min(100, p)) + '%';
}

let viewer = null;
// Sensibilita' del trascinamento: 1 = default PSV, troppo timido.
const MOVE_SPEED = ('ontouchstart' in window) ? 2.2 : 1.5;

function hideLoad() {
    prog(100);
    const l = document.getElementById('load');
    if (l) { l.classList.add('out'); setTimeout(() => l.remove(), 500); }
}

async function boot() {
    let cfg;
    if (TILED) {
        lst.textContent = 'Caricamento base...';
        // Anello animato: la base è piccola, arriva in fretta
        let fake = 0;
        const pulse = setInterval(() => {
            fake = Math.min(90, fake + (90 - fake) * 0.10);
            prog(fake);
        }, 150);
        cfg = {
            adapter: EquirectangularTilesAdapter,
            panorama: {
                width: IMG_W,
                cols: IMG_COLS,
                rows: IMG_ROWS,
                baseUrl: BASE_URL,
                tileUrl: (col, row) => TILES_DIR + '/' + col + '_' + row + '.jpg',
            },
        };
        viewer = new Viewer({
            container: document.getElementById('viewer'),
            navbar: false,
            defaultZoomLvl: 30,
            moveSpeed: MOVE_SPEED,
            mousewheel: true,
            touchmoveTwoFingers: false,
            ...cfg,
        });
        viewer.addEventListener('ready', () => { clearInterval(pulse); hideLoad(); }, { once: true });
        viewer.addEventListener('panorama-load-error', () => {
            clearInterval(pulse);
            lst.textContent = 'Errore caricamento';
            lst.style.color = '#ff6b62';
            rpc.textContent = '✕';
        });
    } else {
        // Percorso legacy per sfere senza tile: download con progresso
        // e ridimensionamento GPU-safe a 8192px.
        lst.textContent = 'Download panorama...';
        let src = LEGACY_URL;
        try {
            const res = await fetch(LEGACY_URL);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const totale = parseInt(res.headers.get('Content-Length') || '0', 10);
            let blob;
            if (totale && res.body) {
                const rd = res.body.getReader();
                const chunks = [];
                let got = 0;
                while (true) {
                    const { done, value } = await rd.read();
                    if (done) break;
                    chunks.push(value); got += value.length;
                    prog(got / totale * 80);
                }
                blob = new Blob(chunks);
            } else {
                blob = await res.blob();
            }
            lst.textContent = 'Elaborazione...';
            prog(88);
            const scaled = await downscale(blob, 8192);
            if (scaled) src = scaled;
        } catch (e) { console.log('[360e] legacy fallback URL diretto:', e.message); }
        viewer = new Viewer({
            container: document.getElementById('viewer'),
            panorama: src,
            navbar: false,
            defaultZoomLvl: 30,
            moveSpeed: MOVE_SPEED,
            mousewheel: true,
            touchmoveTwoFingers: false,
        });
        viewer.addEventListener('ready', hideLoad, { once: true });
        viewer.addEventListener('panorama-load-error', () => {
            lst.textContent = 'Errore caricamento';
            lst.style.color = '#ff6b62';
            rpc.textContent = '✕';
        });
    }
    wireControls();
}

async function downscale(blob, maxW) {
    try {
        const probe = await new Promise((ok, ko) => {
            const u = URL.createObjectURL(blob);
            const im = new Image();
            im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight, img: im, u });
            im.onerror = () => { URL.revokeObjectURL(u); ko(new Error('decode')); };
            im.src = u;
        });
        if (probe.w <= maxW) { URL.revokeObjectURL(probe.u); return null; }
        const nw = maxW, nh = Math.round(probe.h * maxW / probe.w);
        const c = document.createElement('canvas');
        c.width = nw; c.height = nh;
        const ctx = c.getContext('2d');
        try {
            const b = await createImageBitmap(blob, { resizeWidth: nw, resizeHeight: nh, resizeQuality: 'high' });
            ctx.drawImage(b, 0, 0); b.close();
        } catch (e) { ctx.drawImage(probe.img, 0, 0, nw, nh); }
        URL.revokeObjectURL(probe.u);
        const out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
        return out ? URL.createObjectURL(out) : null;
    } catch (e) { return null; }
}

// ============================================================
// Controlli
// ============================================================
function wireControls() {
    let rotOn = false, raf = null;

    document.getElementById('zin').addEventListener('click', () => {
        if (viewer) viewer.zoom(Math.min(100, viewer.getZoomLevel() + 12));
    });
    document.getElementById('zout').addEventListener('click', () => {
        if (viewer) viewer.zoom(Math.max(0, viewer.getZoomLevel() - 12));
    });

    const rotBtn = document.getElementById('rot');
    function tick() {
        if (!rotOn || !viewer) return;
        const p = viewer.getPosition();
        viewer.rotate({ yaw: p.yaw + 0.0018, pitch: p.pitch });
        raf = requestAnimationFrame(tick);
    }
    rotBtn.addEventListener('click', () => {
        rotOn = !rotOn;
        rotBtn.classList.toggle('on', rotOn);
        if (rotOn) tick(); else if (raf) cancelAnimationFrame(raf);
    });
    document.getElementById('viewer').addEventListener('pointerdown', () => {
        if (rotOn) { rotOn = false; rotBtn.classList.remove('on'); if (raf) cancelAnimationFrame(raf); }
    });

    document.getElementById('fs').addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    });

    // Giroscopio opt-in
    const gyroBtn = document.getElementById('gyro');
    let gOn = false;
    const mob = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    function startG() {
        if (gOn || !viewer) return;
        gOn = true;
        let la = null, lb = null;
        window.addEventListener('deviceorientation', (e) => {
            if (e.alpha === null || e.beta === null || !gOn) return;
            if (la === null) { la = e.alpha; lb = e.beta; return; }
            let da = e.alpha - la;
            if (da > 180) da -= 360;
            if (da < -180) da += 360;
            const db = e.beta - lb;
            la = e.alpha; lb = e.beta;
            const p = viewer.getPosition();
            viewer.rotate({
                yaw: p.yaw - da * Math.PI / 180,
                pitch: Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, p.pitch + db * Math.PI / 180)),
            });
        });
        gyroBtn.classList.add('on');
    }
    if (mob && window.DeviceOrientationEvent) {
        gyroBtn.style.display = '';
        gyroBtn.addEventListener('click', async () => {
            if (gOn) { gOn = false; gyroBtn.classList.remove('on'); return; }
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                try { if (await DeviceOrientationEvent.requestPermission() === 'granted') startG(); } catch (e) {}
            } else startG();
        });
    }
}

// Tastiera
const PU = <?= $prev ? json_encode('view.php?g=' . rawurlencode($slug) . '&i=' . rawurlencode($prev['name'])) : 'null' ?>;
const NU = <?= $next ? json_encode('view.php?g=' . rawurlencode($slug) . '&i=' . rawurlencode($next['name'])) : 'null' ?>;
const BU = <?= json_encode('gallery.php?g=' . rawurlencode($slug)) ?>;
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && PU) location.href = PU;
    else if (e.key === 'ArrowRight' && NU) location.href = NU;
    else if (e.key === 'Escape' && !document.fullscreenElement) location.href = BU;
});

boot();
</script>
</body>
</html>
