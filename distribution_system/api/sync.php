<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'pending') {
            getPendingOperations();
        } elseif ($action === 'status') {
            getSyncStatus();
        }
        break;
    case 'POST':
        if ($action === 'sync') {
            syncData();
        } elseif ($action === 'resolve') {
            resolveConflict();
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getPendingOperations() {
    $stmt = getDB()->query("
        SELECT * FROM sync_queue 
        WHERE synced = 0 
        ORDER BY created_at ASC
    ");
    
    jsonResponse([
        'success' => true,
        'data' => $stmt->fetchAll(),
        'count' => $stmt->rowCount()
    ]);
}

function getSyncStatus() {
    $pendingStmt = getDB()->query("SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0");
    $pending = $pendingStmt->fetch()['count'];
    
    $lastSyncStmt = getDB()->query("
        SELECT MAX(created_at) as last_sync 
        FROM sync_queue 
        WHERE synced = 1
    ");
    $lastSync = $lastSyncStmt->fetch()['last_sync'];
    
    jsonResponse([
        'success' => true,
        'data' => [
            'pending_count' => (int)$pending,
            'last_sync' => $lastSync,
            'is_synced' => $pending == 0
        ]
    ]);
}

function syncData() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['operations']) || empty($input['operations'])) {
        jsonResponse(['error' => 'No operations to sync'], 400);
    }
    
    $db = getDB();
    $results = [];
    
    foreach ($input['operations'] as $operation) {
        $result = processOperation($db, $operation);
        $results[] = $result;
        
        // Mark as synced
        if ($result['success']) {
            $stmt = $db->prepare("UPDATE sync_queue SET synced = 1 WHERE id = ?");
            $stmt->execute([$operation['id']]);
        }
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Sync completed',
        'results' => $results
    ]);
}

function processOperation($db, $operation) {
    $table = $operation['table_name'];
    $data = json_decode($operation['data_json'], true);
    
    try {
        switch ($operation['operation']) {
            case 'INSERT':
                return insertRecord($db, $table, $data);
            case 'UPDATE':
                return updateRecord($db, $table, $operation['record_id'], $data);
            case 'DELETE':
                return deleteRecord($db, $table, $operation['record_id']);
            case 'REMINDER':
                // Handle reminder creation
                return ['success' => true, 'message' => 'Reminder processed'];
            default:
                return ['success' => false, 'error' => 'Unknown operation'];
        }
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function insertRecord($db, $table, $data) {
    switch ($table) {
        case 'farmers':
            $stmt = $db->prepare("
                INSERT INTO farmers (name, phone, email, address, farm_location, farm_size, farm_size_unit, crop_type, registration_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['name'] ?? '',
                $data['phone'] ?? '',
                $data['email'] ?? '',
                $data['address'] ?? '',
                $data['farm_location'] ?? '',
                $data['farm_size'] ?? null,
                $data['farm_size_unit'] ?? 'hectares',
                $data['crop_type'] ?? '',
                $data['registration_date'] ?? date('Y-m-d'),
                $data['status'] ?? 'active'
            ]);
            break;
            
        case 'seeds_inventory':
            $stmt = $db->prepare("
                INSERT INTO seeds_inventory (crop_type, variety, quantity, unit, threshold, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['crop_type'] ?? '',
                $data['variety'] ?? '',
                $data['quantity'] ?? 0,
                $data['unit'] ?? 'kg',
                $data['threshold'] ?? 10,
                $data['status'] ?? 'available'
            ]);
            break;
            
        case 'equipment_inventory':
            $stmt = $db->prepare("
                INSERT INTO equipment_inventory (name, category, quantity, condition, threshold, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['name'] ?? '',
                $data['category'] ?? '',
                $data['quantity'] ?? 0,
                $data['condition'] ?? 'good',
                $data['threshold'] ?? 5,
                $data['notes'] ?? '',
                $data['status'] ?? 'available'
            ]);
            break;
            
        case 'distributions':
            $stmt = $db->prepare("
                INSERT INTO distributions (farmer_id, distribution_date, season, notes, total_items, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['farmer_id'] ?? 0,
                $data['distribution_date'] ?? date('Y-m-d'),
                $data['season'] ?? '',
                $data['notes'] ?? '',
                $data['total_items'] ?? 0,
                $data['created_by'] ?? 1
            ]);
            break;
            
        case 'schedules':
            $stmt = $db->prepare("
                INSERT INTO schedules (title, schedule_date, schedule_time, location, assigned_staff, description, item_details, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['title'] ?? '',
                $data['schedule_date'] ?? date('Y-m-d'),
                $data['schedule_time'] ?? null,
                $data['location'] ?? '',
                $data['assigned_staff'] ?? '',
                $data['description'] ?? '',
                $data['item_details'] ?? '',
                $data['status'] ?? 'scheduled'
            ]);
            break;
            
        case 'farms':
            $stmt = $db->prepare("
                INSERT INTO farms (farmer_id, farm_name, location, size, size_unit, crop_type, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['farmer_id'] ?? 0,
                $data['farm_name'] ?? 'Farm',
                $data['location'] ?? '',
                $data['size'] ?? 0,
                $data['size_unit'] ?? 'hectares',
                $data['crop_type'] ?? '',
                $data['status'] ?? 'active'
            ]);
            break;
            
        default:
            return ['success' => false, 'error' => 'Unknown table'];
    }
    
    return ['success' => true, 'message' => 'Record inserted'];
}

function updateRecord($db, $table, $recordId, $data) {
    $setParts = [];
    $values = [];
    
    foreach ($data as $key => $value) {
        $setParts[] = "$key = ?";
        $values[] = $value;
    }
    
    $values[] = $recordId;
    
    $stmt = $db->prepare("UPDATE $table SET " . implode(', ', $setParts) . " WHERE id = ?");
    $stmt->execute($values);
    
    return ['success' => true, 'message' => 'Record updated'];
}

function deleteRecord($db, $table, $recordId) {
    $stmt = $db->prepare("DELETE FROM $table WHERE id = ?");
    $stmt->execute([$recordId]);
    
    return ['success' => true, 'message' => 'Record deleted'];
}

function resolveConflict() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['queue_id']) || !isset($input['resolution'])) {
        jsonResponse(['error' => 'Queue ID and resolution required'], 400);
    }
    
    $resolution = $input['resolution'];
    
    if ($resolution === 'server') {
        // Delete the queued operation
        $stmt = getDB()->prepare("DELETE FROM sync_queue WHERE id = ?");
        $stmt->execute([$input['queue_id']]);
    } elseif ($resolution === 'client') {
        // Re-process the operation
        $stmt = getDB()->prepare("SELECT * FROM sync_queue WHERE id = ?");
        $stmt->execute([$input['queue_id']]);
        $operation = $stmt->fetch();
        
        if ($operation) {
            $db = getDB();
            $result = processOperation($db, $operation);
            
            if ($result['success']) {
                $stmt = $db->prepare("UPDATE sync_queue SET synced = 1 WHERE id = ?");
                $stmt->execute([$input['queue_id']]);
            }
        }
    }
    
    jsonResponse(['success' => true, 'message' => 'Conflict resolved']);
}