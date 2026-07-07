<?php
require_once __DIR__ . '/../lib.php';
session_start();

if (!empty($_SESSION['admin_logged_in'])) {
    header('Location: index.php');
    exit;
}

$cfg = load_config();
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    if (password_verify($password, get_admin_hash())) {
        $_SESSION['admin_logged_in'] = true;
        header('Location: index.php');
        exit;
    } else {
        $error = 'Password errata.';
    }
}
?><!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Login · <?= h($cfg['site_title']) ?></title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<div class="login-box">
    <h1>🔐 Admin</h1>
    <?php if ($error): ?>
        <div class="alert alert-error"><?= h($error) ?></div>
    <?php endif; ?>
    <form method="post" action="">
        <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" name="password" autofocus autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Accedi</button>
    </form>
</div>
</body>
</html>
