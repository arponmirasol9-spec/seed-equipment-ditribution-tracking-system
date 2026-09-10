<?php
header('Content-Type: application/json');

$steps = [];
$mysql = 'C:/xampp/mysql/bin/mysql.exe';

try {
    $pdo = new PDO("mysql:host=localhost;dbname=distribution_system", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['steps' => [['ok' => false, 'message' => 'DB connection failed: ' . $e->getMessage()]], 'api_version' => 'fix-script-v1']);
    exit;
}

$steps[] = ['ok' => true, 'message' => 'Database connected'];

// Step 1: Fix existing negative quantities
try {
    $r1 = $pdo->exec("UPDATE seeds_inventory SET quantity = 0, status = 'out_of_stock' WHERE quantity < 0");
    $r2 = $pdo->exec("UPDATE equipment_inventory SET quantity = 0, status = 'out_of_stock' WHERE quantity < 0");
    $steps[] = ['ok' => true, 'message' => 'Fixed existing negatives (seeds: ' . $r1 . ', equipment: ' . $r2 . ' rows)'];
} catch (PDOException $e) {
    $steps[] = ['ok' => false, 'message' => 'Failed to fix negatives: ' . $e->getMessage()];
}

// Step 2: Add MySQL triggers via CLI (PDO can't handle BEGIN...END blocks with semicolons)
$triggerSQL = "
DROP TRIGGER IF EXISTS prevent_negative_seeds;
DROP TRIGGER IF EXISTS prevent_negative_equipment;
DROP TRIGGER IF EXISTS prevent_negative_seeds_insert;
DROP TRIGGER IF EXISTS prevent_negative_equipment_insert;

CREATE TRIGGER prevent_negative_seeds
BEFORE UPDATE ON seeds_inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot set quantity below zero';
    END IF;
END;

CREATE TRIGGER prevent_negative_equipment
BEFORE UPDATE ON equipment_inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot set quantity below zero';
    END IF;
END;

CREATE TRIGGER prevent_negative_seeds_insert
BEFORE INSERT ON seeds_inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot insert negative quantity';
    END IF;
END;

CREATE TRIGGER prevent_negative_equipment_insert
BEFORE INSERT ON equipment_inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot insert negative quantity';
    END IF;
END;
";

$tmpFile = tempnam(sys_get_temp_dir(), 'trigger');
file_put_contents($tmpFile, $triggerSQL);

$output = [];
$returnCode = 0;
exec('"' . $mysql . '" -u root distribution_system < "' . $tmpFile . '" 2>&1', $output, $returnCode);
unlink($tmpFile);

if ($returnCode === 0) {
    $steps[] = ['ok' => true, 'message' => 'All 4 database triggers created successfully (INSERT + UPDATE on both tables)'];
} else {
    $steps[] = ['ok' => false, 'message' => 'Trigger creation failed (code ' . $returnCode . '): ' . implode(' ', $output)];
}

// Step 3: Verify triggers work by trying to set negative
try {
    $firstId = $pdo->query("SELECT id FROM seeds_inventory LIMIT 1")->fetch();
    if ($firstId) {
        $pdo->exec("UPDATE seeds_inventory SET quantity = -999 WHERE id = " . $firstId['id']);
        $steps[] = ['ok' => false, 'message' => 'WARNING: Trigger did NOT block negative!'];
    } else {
        $steps[] = ['ok' => true, 'message' => 'Skipped trigger test (no items in database)'];
    }
} catch (PDOException $e) {
    if (strpos($e->getMessage(), '45000') !== false || strpos($e->getMessage(), 'below zero') !== false || strpos($e->getMessage(), 'negative') !== false) {
        $steps[] = ['ok' => true, 'message' => 'VERIFIED: Triggers correctly block negative quantities!'];
    } else {
        $steps[] = ['ok' => false, 'message' => 'Trigger test error: ' . $e->getMessage()];
    }
}

// Step 4: Verify no negatives exist
try {
    $negSeeds = $pdo->query("SELECT COUNT(*) as cnt FROM seeds_inventory WHERE quantity < 0")->fetch()['cnt'];
    $negEquip = $pdo->query("SELECT COUNT(*) as cnt FROM equipment_inventory WHERE quantity < 0")->fetch()['cnt'];
    if ($negSeeds == 0 && $negEquip == 0) {
        $steps[] = ['ok' => true, 'message' => 'VERIFIED: No negative quantities in database'];
    } else {
        $steps[] = ['ok' => false, 'message' => 'Still have negatives: seeds=' . $negSeeds . ', equipment=' . $negEquip];
    }
} catch (PDOException $e) {
    $steps[] = ['ok' => false, 'message' => 'Verification failed: ' . $e->getMessage()];
}

// Step 5: Disable OPcache in php.ini
$phpIniPath = php_ini_loaded_file();
if (!$phpIniPath || !file_exists($phpIniPath)) {
    foreach (['C:/xampp/php/php.ini', 'C:/php/php.ini'] as $p) {
        if (file_exists($p)) { $phpIniPath = $p; break; }
    }
}

if ($phpIniPath && file_exists($phpIniPath)) {
    $content = file_get_contents($phpIniPath);
    $changed = false;

    if (preg_match('/opcache\.enable\s*=\s*1/', $content)) {
        $content = preg_replace('/opcache\.enable\s*=\s*1/', 'opcache.enable=0', $content);
        $changed = true;
    }
    if (preg_match('/opcache\.enable_cli\s*=\s*1/', $content)) {
        $content = preg_replace('/opcache\.enable_cli\s*=\s*1/', 'opcache.enable_cli=0', $content);
        $changed = true;
    }

    if ($changed) {
        if (file_put_contents($phpIniPath, $content)) {
            $steps[] = ['ok' => true, 'message' => 'Disabled OPcache in ' . $phpIniPath . ' (RESTART APACHE NOW!)'];
        } else {
            $steps[] = ['ok' => false, 'message' => 'Permission denied writing to ' . $phpIniPath . '. Open it manually and set opcache.enable=0'];
        }
    } else {
        $steps[] = ['ok' => true, 'message' => 'OPcache already disabled in php.ini'];
    }
} else {
    $steps[] = ['ok' => false, 'message' => 'Could not find php.ini. Set opcache.enable=0 manually.'];
}

echo json_encode([
    'steps' => $steps,
    'api_version' => 'fix-script-v1'
], JSON_PRETTY_PRINT);
?>
