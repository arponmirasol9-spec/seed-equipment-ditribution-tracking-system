<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && ($action === 'list' || $action === '')) {
    $stmt = getDB()->query("SELECT * FROM seeds_inventory ORDER BY crop_type ASC");
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}
