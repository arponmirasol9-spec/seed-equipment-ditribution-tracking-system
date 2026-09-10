<?php
require_once __DIR__ . '/config.php';

$request = $_GET['route'] ?? '';
$parts = explode('/', $request);
$module = $parts[0] ?? '';

switch ($module) {
    case 'auth':
        require_once 'auth.php';
        break;
    case 'farmers':
        require_once 'farmers.php';
        break;
    case 'inventory':
        require_once 'inventory.php';
        break;
    case 'distributions':
        require_once 'distributions.php';
        break;
    case 'schedules':
        require_once 'schedules.php';
        break;
    case 'dashboard':
        require_once 'dashboard.php';
        break;
    case 'sync':
        require_once 'sync.php';
        break;
    default:
        jsonResponse(['error' => 'Invalid API route'], 404);
}