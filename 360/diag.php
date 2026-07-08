<?php
// ============================================================
// DIAGNOSTICA PANORAMI - cad3d.expert/ai/360/diag.php
// Analizza ogni file sul server e dice se il nero (spicchio,
// bande ai poli) e' contenuto nel JPEG stesso.
// Lavora sulle MINIATURE (1024px, copie fedeli degli originali
// generate al momento dell'upload): sicuro anche su hosting
// condiviso, nessun rischio memoria coi 120MP.
// ============================================================
require_once __DIR__ . '/lib.php';
header('Content-Type: text/html; charset=utf-8');

function scan_thumb($path) {
    if (!file_exists($path)) return null;
    $img = @imagecreatefromjpeg($path);
    if (!$img) return null;
    $w = imagesx($img); $h = imagesy($img);
    $T = 14; $FRAC = 0.92;

    $rowFrac = function($y) use ($img, $w, $T) {
        $dark = 0; $tot = 0;
        for ($x = 0; $x < $w; $x += 4) {
            $tot++;
            $rgb = imagecolorat($img, $x, $y);
            if ((($rgb >> 16) & 0xFF) < $T && (($rgb >> 8) & 0xFF) < $T && ($rgb & 0xFF) < $T) $dark++;
        }
        return $tot ? $dark / $tot : 0;
    };

    $topBand = 0;
    for ($y = 0; $y < $h * 0.4; $y += 2) {
        if ($rowFrac($y) >= $FRAC) $topBand = $y + 2; else break;
    }
    $bottomBand = 0;
    for ($y = $h - 1; $y > $h * 0.6; $y -= 2) {
        if ($rowFrac($y) >= $FRAC) $bottomBand = $h - $y + 1; else break;
    }

    $y0 = $topBand + 2; $y1 = $h - $bottomBand - 2;
    $maxRun = 0; $run = 0; $step = 4;
    for ($x = 0; $x < $w; $x += $step) {
        $dark = 0; $tot = 0;
        for ($y = $y0; $y < $y1; $y += 4) {
            $tot++;
            $rgb = imagecolorat($img, $x, $y);
            if ((($rgb >> 16) & 0xFF) < $T && (($rgb >> 8) & 0xFF) < $T && ($rgb & 0xFF) < $T) $dark++;
        }
        if ($tot && $dark / $tot >= $FRAC) { $run++; if ($run > $maxRun) $maxRun = $run; }
        else $run = 0;
    }
    imagedestroy($img);
    $wedgeDeg = (int)round($maxRun * $step / $w * 360);
    return [
        'top' => (int)round($topBand / $h * 100),
        'bottom' => (int)round($bottomBand / $h * 100),
        'wedge' => $wedgeDeg,
        'baked' => ($wedgeDeg >= 4 || $topBand / $h > 0.03 || $bottomBand / $h > 0.03),
    ];
}

function xmp_gpano($path) {
    $fh = @fopen($path, 'rb');
    if (!$fh) return null;
    $head = fread($fh, 524288);
    fclose($fh);
    if (strpos($head, 'GPano:') === false) return 'assente';
    $out = [];
    foreach (['FullPanoWidthPixels','FullPanoHeightPixels','CroppedAreaImageWidthPixels','CroppedAreaImageHeightPixels','CroppedAreaLeftPixels','CroppedAreaTopPixels'] as $k) {
        if (preg_match('/GPano:' . $k . '[="\'>]+([0-9]+)/', $head, $m)) $out[$k] = (int)$m[1];
    }
    return $out ?: 'presente (valori non leggibili)';
}

$data = load_galleries();
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diagnostica panorami</title>
<style>
body { font-family: monospace; background: #0d1117; color: #e6edf3; padding: 16px; font-size: 13px; line-height: 1.6; }
h1 { font-size: 18px; } h2 { font-size: 15px; color: #58a6ff; margin-top: 24px; }
.ok { color: #3fb950; font-weight: bold; }
.bad { color: #f85149; font-weight: bold; }
.dim { color: #8b949e; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px 16px; margin: 10px 0; }
img { max-width: 100%; border-radius: 6px; margin-top: 8px; }
</style>
</head>
<body>
<h1>Diagnostica panorami</h1>
<p class="dim">Analisi delle miniature (copie fedeli 1:1 degli originali generate all'upload).<br>
Se qui il nero risulta NEL FILE, nessun viewer al mondo può mostrarti quei pixel: non esistono.</p>

<?php foreach ($data['galleries'] as $g):
    $meta = load_gallery_meta($g['slug']); ?>
<h2>Galleria: <?= h($g['title']) ?></h2>
<?php foreach ($meta['images'] as $img):
    $orig = data_dir() . '/' . $g['slug'] . '/' . $img['file'];
    $thumb = data_dir() . '/' . $g['slug'] . '/_thumbs/' . pathinfo($img['file'], PATHINFO_FILENAME) . '.jpg';
    $size = @getimagesize($orig);
    $scan = scan_thumb($thumb);
    $xmp = xmp_gpano($orig);
?>
<div class="card">
<strong><?= h($img['title']) ?></strong> <span class="dim">(<?= h($img['file']) ?>)</span><br>
<?php if ($size): ?>
Originale: <?= $size[0] ?>x<?= $size[1] ?> (<?= round($size[0]*$size[1]/1e6,1) ?>MP, aspect <?= round($size[0]/$size[1],3) ?><?= abs($size[0]/$size[1]-2)>0.02 ? ' <span class="bad">NON 2:1</span>' : ' <span class="ok">2:1 ok</span>' ?>)<br>
<?php else: ?>
<span class="bad">Impossibile leggere le dimensioni dell'originale</span><br>
<?php endif; ?>
XMP GPano: <?= is_array($xmp) ? h(json_encode($xmp)) : h((string)$xmp) ?><br>
<?php if ($scan): ?>
Scansione pixel:
spicchio <?= $scan['wedge'] ?>&deg;,
banda zenit <?= $scan['top'] ?>%,
banda nadir <?= $scan['bottom'] ?>%
&rarr; <?= $scan['baked'] ? '<span class="bad">NERO NEL FILE: SÌ</span>' : '<span class="ok">FILE PULITO</span>' ?><br>
<a href="data/<?= h($g['slug']) ?>/_thumbs/<?= h(pathinfo($img['file'], PATHINFO_FILENAME)) ?>.jpg">link miniatura</a> | <a href="data/<?= h($g['slug']) ?>/<?= h($img['file']) ?>">link originale</a><br>
<span class="dim">Miniatura (questo È il contenuto del file, appiattito):</span><br>
<img src="data/<?= h($g['slug']) ?>/_thumbs/<?= h(pathinfo($img['file'], PATHINFO_FILENAME)) ?>.jpg" alt="">
<?php else: ?>
<span class="dim">Miniatura non disponibile, scansione saltata</span>
<?php endif; ?>
</div>
<?php endforeach; endforeach; ?>

<p class="dim">Se tutti i file risultano puliti ma il viewer mostra ancora nero, il problema è nel rendering e va segnalato con uno screenshot di questa pagina.</p>
</body>
</html>
