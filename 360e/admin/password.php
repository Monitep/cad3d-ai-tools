<?php
require_once __DIR__ . '/_auth.php';
$msg = ''; $err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $cur = $_POST['current'] ?? ''; $new = $_POST['new'] ?? ''; $conf = $_POST['confirm'] ?? '';
    if (!password_verify($cur, get_admin_hash())) $err = 'Password attuale errata.';
    elseif (strlen($new) < 8) $err = 'Minimo 8 caratteri.';
    elseif ($new !== $conf) $err = 'Le password non coincidono.';
    elseif (set_admin_hash(password_hash($new, PASSWORD_DEFAULT))) $msg = 'Password aggiornata.';
    else $err = 'Impossibile scrivere in data/.';
}
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Password · 360e Admin</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="hd"><div class="hd-inner">
    <div class="brand"><a href="index.php"><span class="brand-title">Admin <em>360e</em></span></a></div>
    <a href="logout.php" class="btn btn-sm btn-danger">Esci</a>
</div></header>
<main class="wrap" style="max-width:460px;">
    <?php if ($msg): ?><div class="al al-ok"><?= h($msg) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="al al-err"><?= h($err) ?></div><?php endif; ?>
    <h1 class="pg">Cambia password</h1>
    <form method="post" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:24px;">
        <div class="fg"><label class="fl">Password attuale</label><input type="password" name="current" required autocomplete="current-password"></div>
        <div class="fg"><label class="fl">Nuova password (min. 8)</label><input type="password" name="new" required minlength="8" autocomplete="new-password"></div>
        <div class="fg"><label class="fl">Conferma nuova</label><input type="password" name="confirm" required minlength="8" autocomplete="new-password"></div>
        <button type="submit" class="btn btn-amber" style="width:100%;justify-content:center;">Salva</button>
    </form>
</main>
</body>
</html>
