<?php
require_once __DIR__ . '/../lib.php';
session_start();
if (empty($_SESSION['e_admin'])) { header('Location: login.php'); exit; }
