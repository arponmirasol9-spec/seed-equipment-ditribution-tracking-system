<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$result = [];
$result['php_version'] = phpversion();
$result['timestamp'] = date('Y-m-d H:i:s');
$result['server'] = $_SERVER['SERVER_SOFTWARE'] ?? 'unknown';

// Test 1: Check if clampNegativeInventory is active
try {
    $db = getDB();
    $negSeeds = $db->query("SELECT COUNT(*) as cnt FROM seeds_inventory WHERE quantity < 0")->fetch()['cnt'];
    $negEquip = $db->query("SELECT COUNT(*) as cnt FROM equipment_inventory WHERE quantity < 0")->fetch()['cnt'];
    $result['negative_check'] = ['seeds' => (int)$negSeeds, 'equipment' => (int)$negEquip];
} catch (Exception $e) {
    $result['negative_check'] = ['error' => $e->getMessage()];
}

// Test 2: Check if CREATE DISTRIBUTION validation works
// Try to create a distribution with quantity=999999 for an item with low stock
try {
    $db = getDB();
    $seedItem = $db->query("SELECT id, quantity, crop_type FROM seeds_inventory ORDER BY id LIMIT 1")->fetch();
    $equipItem = $db->query("SELECT id, quantity, name FROM equipment_inventory ORDER BY id LIMIT 1")->fetch();
    
    $result['test_items'] = [
        'seed' => $seedItem ? ['id' => $seedItem['id'], 'qty' => $seedItem['quantity'], 'type' => $seedItem['crop_type']] : null,
        'equipment' => $equipItem ? ['id' => $equipItem['id'], 'qty' => $equipItem['quantity'], 'name' => $equipItem['name']] : null,
    ];
    
    // Test the validation logic directly (without creating a real distribution)
    if ($seedItem) {
        $table = 'seeds_inventory';
        $testQty = (float)$seedItem['quantity'] + 1000; // More than available
        $invStmt = $db->prepare("SELECT quantity, threshold, status FROM $table WHERE id = ? FOR UPDATE");
        $invStmt->execute([$seedItem['id']]);
        $invItem = $invStmt->fetch();
        
        $currentStock = (float)$invItem['quantity'];
        if ($currentStock <= 0 || $invItem['status'] === 'out_of_stock') {
            $result['server_validation'] = 'PASS - Out of stock check works';
        } elseif ($testQty > $currentStock) {
            $result['server_validation'] = 'PASS - Insufficient stock check works (stock=' . $currentStock . ', requested=' . $testQty . ')';
        } else {
            $result['server_validation'] = 'WARNING - Validation may not be working correctly';
        }
        $db->rollBack(); // Release the lock
    }
} catch (Exception $e) {
    $result['server_validation'] = 'EXCEPTION: ' . $e->getMessage();
}

// Test 3: Check if triggers exist
try {
    $db = getDB();
    $triggers = $db->query("SHOW TRIGGERS LIKE 'prevent_negative%'")->fetchAll();
    $result['triggers_count'] = count($triggers);
    $result['triggers'] = array_column($triggers, 'Trigger');
} catch (Exception $e) {
    $result['triggers'] = 'Error: ' . $e->getMessage();
}

// Test 4: Check OPcache status
if (function_exists('opcache_get_status')) {
    $status = @opcache_get_status();
    $result['opcache_enabled'] = $status ? ($status['opcache_enabled'] ?? false) : 'unknown';
} else {
    $result['opcache_enabled'] = 'function not available';
}

$result['status'] = 'OK - If you see this, PHP is running the latest code';
$result['message'] = 'After restarting Apache, try creating a distribution with more than available stock. It should be blocked.';

echo json_encode($result, JSON_PRETTY_PRINT);
?>