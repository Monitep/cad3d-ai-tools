<?php
require_once __DIR__ . '/../lib.php';
session_start();

if (empty($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}
