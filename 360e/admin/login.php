<?php
require_once __DIR__ . '/../lib.php';
session_start();
if (!empty($_SESSION['e_admin'])) { header('Location: index.php'); exit; }
$cfg = load_config();
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (password_verify($_POST['password'] ?? '', get_admin_hash())) {
        $_SESSION['e_admin'] = true;
        header('Location: index.php'); exit;
    }
    $err = 'Password errata.';
}
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin · 360e</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<div class="login">
    <h1>CAD3D <em style="font-style:normal;color:var(--amber);">360e</em> · Admin</h1>
    <?php if ($err): ?><div class="al al-err"><?= h($err) ?></div><?php endif; ?>
    <form method="post">
        <div class="fg">
            <label class="fl">Password</label>
            <input type="password" name="password" autofocus autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-amber" style="width:100%;justify-content:center;">Accedi</button>
    </form>
</div>
</body>
</html>
