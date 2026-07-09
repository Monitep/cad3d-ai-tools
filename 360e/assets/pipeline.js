// ============================================================
// 360e - Pipeline condivisa: da un Blob equirettangolare
// genera thumb, base e griglia di tile, e li invia alle API.
// Usata dall'upload admin e dalla migrazione da 360.
// ============================================================

function tileGrid(w) {
    const normW = Math.max(2048, Math.round(w / 64) * 64);
    let best = 16, bestD = Infinity;
    for (const c of [16, 32, 64]) {
        const t = normW / c;
        const d = Math.abs(t - 512);
        if (Number.isInteger(t) && d < bestD) { best = c; bestD = d; }
    }
    return { normW: normW, normH: normW / 2, cols: best, rows: best / 2, tile: normW / best };
}

function decodeFull(blob) {
    return new Promise((ok, ko) => {
        const u = URL.createObjectURL(blob);
        const im = new Image();
        im.onload = () => ok({ img: im, w: im.naturalWidth, h: im.naturalHeight, url: u });
        im.onerror = () => { URL.revokeObjectURL(u); ko(new Error('Immagine non decodificabile')); };
        im.src = u;
    });
}

function canvasBlob(c, q) {
    return new Promise((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new Error('toBlob nullo')), 'image/jpeg', q));
}

function apiPostOnce(fields, files, onProgress) {
    const fd = new FormData();
    for (const k in fields) fd.append(k, fields[k]);
    for (const k in files) fd.append(k, files[k], k + '.jpg');
    return new Promise((ok, ko) => {
        const x = new XMLHttpRequest();
        x.timeout = 120000;
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
        x.ontimeout = () => ko(new Error('timeout'));
        x.open('POST', 'api.php');
        x.send(fd);
    });
}

// Retry automatico: su rete mobile i singoli POST possono inciampare.
// 3 tentativi con attesa crescente prima di dichiarare l'errore.
async function apiPost(fields, files, onProgress) {
    let last;
    for (let i = 0; i < 3; i++) {
        try {
            return await apiPostOnce(fields, files, onProgress);
        } catch (e) {
            last = e;
            // Gli errori del server (validazione) non si ritentano
            if (!/errore di rete|timeout/.test(e.message)) throw e;
            await new Promise(r => setTimeout(r, 1000 * (i + 1) * (i + 1)));
        }
    }
    throw last;
}

// opts: { slug, name, title, blob, ui,
//         orig: {mode:'upload'|'copy'|'skip', file?, srcGallery?, srcFile?} }
async function processPano(opts) {
    const { slug, name, title, blob, ui } = opts;
    const orig = opts.orig || { mode: 'skip' };

    ui.phase('Decodifica...'); ui.pct(3);
    const d = await decodeFull(blob);
    const grid = tileGrid(d.w);
    console.log('[360e] ' + name + ': ' + d.w + 'x' + d.h + ' -> ' + grid.cols + 'x' + grid.rows + ' tile ' + grid.tile + 'px');

    // Niente canvas a piena risoluzione: ogni derivato viene disegnato
    // direttamente dall'immagine decodificata. Meta' della memoria di
    // picco: cosi' la generazione regge anche su smartphone.
    ui.phase('Miniatura e base...'); ui.pct(8);
    const th = document.createElement('canvas'); th.width = 1024; th.height = 512;
    th.getContext('2d').drawImage(d.img, 0, 0, 1024, 512);
    const bs = document.createElement('canvas'); bs.width = 2048; bs.height = 1024;
    bs.getContext('2d').drawImage(d.img, 0, 0, 2048, 1024);
    await apiPost({ action: 'upload_asset', slug: slug, name: name, kind: 'thumb' }, { file: await canvasBlob(th, 0.82) });
    await apiPost({ action: 'upload_asset', slug: slug, name: name, kind: 'base' }, { file: await canvasBlob(bs, 0.85) });

    const totTiles = grid.cols * grid.rows;
    const tc = document.createElement('canvas');
    tc.width = grid.tile; tc.height = grid.tile;
    const tctx = tc.getContext('2d');
    // Rettangolo sorgente in pixel ORIGINALI per ogni tile
    const sw = d.w / grid.cols, sh = d.h / grid.rows;
    let sent = 0, batch = [], coords = [];
    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            tctx.clearRect(0, 0, grid.tile, grid.tile);
            tctx.drawImage(d.img, c * sw, r * sh, sw, sh, 0, 0, grid.tile, grid.tile);
            batch.push(await canvasBlob(tc, 0.82));
            coords.push({ c: c, r: r });
            if (batch.length === 10 || (r === grid.rows - 1 && c === grid.cols - 1)) {
                const files = {};
                batch.forEach((b, i) => files['t' + i] = b);
                await apiPost({ action: 'upload_tiles', slug: slug, name: name, coords: JSON.stringify(coords) }, files);
                sent += batch.length;
                batch = []; coords = [];
                ui.phase('Tile ' + sent + '/' + totTiles);
                ui.pct(12 + sent / totTiles * 74);
            }
        }
    }

    let origName = '';
    let origSrc = '';
    if (orig.mode === 'upload' && orig.file) {
        ui.phase('Invio originale...'); ui.pct(88);
        try {
            await apiPost({ action: 'upload_asset', slug: slug, name: name, kind: 'original' }, { file: orig.file },
                f => ui.pct(88 + f * 8));
            origName = name + '.jpg';
        } catch (e) { console.log('[360e] originale non caricato:', e.message); }
    } else if (orig.mode === 'copy') {
        // Nessuna copia: l'originale resta in /360 e viene referenziato.
        origSrc = '../360/data/' + orig.srcGallery + '/' + orig.srcFile;
    }

    URL.revokeObjectURL(d.url);
    ui.phase('Finalizzazione...'); ui.pct(97);
    await apiPost({
        action: 'finalize_image', slug: slug, name: name, title: title,
        w: grid.normW, h: grid.normH, cols: grid.cols, rows: grid.rows, orig_file: origName,
        src: origSrc,
    }, {});
    ui.pct(100);
    ui.phase('Completata ✓');
}
