<?php
require_once __DIR__ . '/_auth.php';
$cfg = load_config();
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $current = $_POST['current'] ?? '';
    $new = $_POST['new'] ?? '';
    $confirm = $_POST['confirm'] ?? '';

    if (!password_verify($current, get_admin_hash())) {
        $err = 'Password attuale errata.';
    } elseif (strlen($new) < 8) {
        $err = 'La nuova password deve essere almeno 8 caratteri.';
    } elseif ($new !== $confirm) {
        $err = 'Le due nuove password non coincidono.';
    } else {
        // Salvata in data/_admin.php: i deploy futuri non la toccano mai.
        if (set_admin_hash(password_hash($new, PASSWORD_DEFAULT))) {
            $msg = 'Password aggiornata con successo!';
        } else {
            $err = 'Impossibile scrivere in data/. Controlla i permessi della cartella.';
        }
    }
}
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cambia password · Admin</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="site-header">
    <div class="container" style="padding:0;">
        <div class="site-title"><a href="index.php" style="color:inherit;">Admin</a> / Cambia password</div>
        <div class="header-actions">
            <a href="logout.php" class="btn btn-sm btn-danger">Logout</a>
        </div>
    </div>
</header>

<main class="container" style="max-width:480px;">
    <?php if ($msg): ?><div class="alert alert-success"><?= h($msg) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="alert alert-error"><?= h($err) ?></div><?php endif; ?>

    <h1 class="page-title">Cambia password</h1>

    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;">
        <form method="post">
            <div class="form-group">
                <label class="form-label">Password attuale</label>
                <input type="password" name="current" autocomplete="current-password" required>
            </div>
            <div class="form-group">
                <label class="form-label">Nuova password (min. 8 caratteri)</label>
                <input type="password" name="new" autocomplete="new-password" required minlength="8">
            </div>
            <div class="form-group">
                <label class="form-label">Conferma nuova password</label>
                <input type="password" name="confirm" autocomplete="new-password" required minlength="8">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%">Salva</button>
        </form>
    </div>
</main>
</body>
</html>
