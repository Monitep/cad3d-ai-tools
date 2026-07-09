<?php
require_once __DIR__ . '/_auth.php';
$cfg = load_config();

// Legge le gallerie della vecchia app /ai/360 direttamente dal filesystem
$old_data = realpath(__DIR__ . '/../../360/data');
$old = [];
if ($old_data && file_exists("$old_data/_galleries.json")) {
    $gj = json_decode(file_get_contents("$old_data/_galleries.json"), true);
    foreach (($gj['galleries'] ?? []) as $g) {
        $mj = json_decode(@file_get_contents("$old_data/{$g['slug']}/_meta.json"), true);
        $imgs = [];
        foreach (($mj['images'] ?? []) as $im) {
            if (is_file("$old_data/{$g['slug']}/{$im['file']}")) {
                $imgs[] = ['file' => $im['file'], 'title' => $im['title'] ?? $im['file']];
            }
        }
        if ($imgs) $old[] = ['slug' => $g['slug'], 'title' => $g['title'], 'images' => $imgs];
    }
}

// Nomi già presenti in 360e per ogni slug di destinazione (per riprendere una migrazione interrotta)
$existing = [];
foreach ($old as $g) {
    $m = load_meta($g['slug']);
    $existing[$g['slug']] = array_column(array_filter($m['images'], fn($i) => !empty($i['tiled'])), 'name');
}
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Importa da 360 · Admin 360e</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="hd"><div class="hd-inner">
    <div class="brand"><a href="index.php" style="color:inherit;"><span class="brand-title">Admin <em>360e</em></span></a>
        <span class="brand-sub">/ Importa da 360</span></div>
    <a href="index.php" class="btn btn-sm">← Dashboard</a>
</div></header>
<main class="wrap">
    <h1 class="pg">Importa le gallerie di /ai/360</h1>
    <p class="pg-sub">Gli originali sono già sul server: il browser li scarica, genera base e tile,
    e l'originale viene copiato lato server. <strong>Esegui da PC</strong>: per ogni sfera da 120MP
    servono circa 1-2 minuti. Se interrompi, riparti: le sfere già importate vengono saltate.</p>

    <?php if (!$old): ?>
        <div class="al al-info">Nessuna galleria trovata in /ai/360/data. Se la vecchia app è in un percorso diverso, dimmelo.</div>
    <?php else: ?>
        <?php $tot = array_sum(array_map(fn($g) => count($g['images']), $old)); ?>
        <div class="bar">
            <div><strong><?= count($old) ?></strong> gallerie · <strong><?= $tot ?></strong> sfere trovate</div>
            <div class="sp"></div>
            <button class="btn btn-amber" id="go">Importa tutto</button>
        </div>
        <?php foreach ($old as $g): ?>
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;margin-bottom:14px;">
            <div style="font-family:var(--font-display);font-weight:600;font-size:16px;">
                <?= h($g['title']) ?>
                <span style="color:var(--dim);font-weight:400;font-size:13px;">· <?= count($g['images']) ?> sfere · slug <?= h($g['slug']) ?></span>
            </div>
            <div class="q" id="q-<?= h($g['slug']) ?>" style="margin-top:12px;"></div>
        </div>
        <?php endforeach; ?>
    <?php endif; ?>
</main>

<script src="../assets/pipeline.js"></script>
<script>
const OLD = <?= json_encode($old, JSON_UNESCAPED_UNICODE) ?>;
const EXISTING = <?= json_encode($existing, JSON_UNESCAPED_UNICODE) ?>;

function mkUi(container, label) {
    const el = document.createElement('div');
    el.className = 'q-item';
    el.innerHTML = '<div class="q-top"><div class="q-name">' + label + '</div>' +
        '<div class="q-phase">In coda...</div></div><div class="q-bar"><div class="q-fill"></div></div>';
    container.appendChild(el);
    return {
        el: el,
        phase: t => el.querySelector('.q-phase').textContent = t,
        pct: p => el.querySelector('.q-fill').style.width = p + '%',
    };
}

let running = false;
document.getElementById('go')?.addEventListener('click', async () => {
    if (running) return;
    running = true;
    const btn = document.getElementById('go');
    btn.textContent = 'Importazione in corso...';
    btn.disabled = true;

    let done = 0, skipped = 0, failed = 0;
    for (const g of OLD) {
        const cont = document.getElementById('q-' + g.slug);
        // Galleria di destinazione (stesso slug)
        try {
            await apiPost({ action: 'ensure_gallery', slug: g.slug, title: g.title }, {});
        } catch (e) {
            mkUi(cont, 'GALLERIA').phase('Errore: ' + e.message);
            continue;
        }
        for (const im of g.images) {
            const name = im.file.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
            const ui = mkUi(cont, im.title + ' (' + im.file + ')');
            if ((EXISTING[g.slug] || []).includes(name)) {
                ui.pct(100); ui.phase('Già in HD, saltata');
                ui.el.classList.add('done');
                skipped++;
                continue;
            }
            try {
                ui.phase('Download dal server...');
                const url = '../../360/data/' + encodeURIComponent(g.slug) + '/' + encodeURIComponent(im.file);
                const res = await fetch(url);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const total = parseInt(res.headers.get('Content-Length') || '0', 10);
                let blob;
                if (total && res.body) {
                    const rd = res.body.getReader();
                    const chunks = [];
                    let got = 0;
                    while (true) {
                        const { done: d, value } = await rd.read();
                        if (d) break;
                        chunks.push(value); got += value.length;
                        ui.pct(got / total * 2.5);
                        ui.phase('Download ' + Math.round(got / total * 100) + '%');
                    }
                    blob = new Blob(chunks);
                } else {
                    blob = await res.blob();
                }
                await processPano({
                    slug: g.slug, name: name, title: im.title, blob: blob, ui: ui,
                    orig: { mode: 'copy', srcGallery: g.slug, srcFile: im.file },
                });
                ui.el.classList.add('done');
                done++;
            } catch (e) {
                ui.el.classList.add('err');
                ui.phase('Errore: ' + e.message);
                console.error('[360e migrate]', im.file, e);
                failed++;
            }
        }
    }
    btn.textContent = 'Fatto: ' + done + ' importate, ' + skipped + ' saltate' + (failed ? ', ' + failed + ' errori' : '');
});
</script>
</body>
</html>
