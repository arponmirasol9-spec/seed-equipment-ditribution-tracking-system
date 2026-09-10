<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list' || $action === '') {
            getFarms();
        } elseif ($action === 'single' && isset($_GET['id'])) {
            getFarm($_GET['id']);
        } elseif ($action === 'by-farmer' && isset($_GET['farmer_id'])) {
            getFarmsByFarmer($_GET['farmer_id']);
        } elseif ($action === 'search' && isset($_GET['q'])) {
            searchFarms($_GET['q']);
        } elseif ($action === 'sync-from-farmers') {
            syncFarmsFromFarmers();
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createFarm();
        } elseif ($action === 'update' && isset($_GET['id'])) {
            updateFarm($_GET['id']);
        } elseif ($action === 'delete' && isset($_GET['id'])) {
            deleteFarm($_GET['id']);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getFarms() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    
    $stmt = getDB()->query("SELECT f.id, f.farmer_id, f.farm_name, f.location, f.size, f.size_unit, f.crop_type as farm_crop_type, f.status, f.created_at, f.updated_at, fr.name as farmer_name, fr.rsbsa_number, fr.barangay, COALESCE(f.crop_type, fr.crop_type) as crop_type 
        FROM farms f 
        LEFT JOIN farmers fr ON f.farmer_id = fr.id 
        ORDER BY f.created_at ASC LIMIT " . (int)$limit . " OFFSET " . (int)$offset);
    $farms = $stmt->fetchAll();
    
    $countStmt = getDB()->query("SELECT COUNT(*) as total FROM farms");
    $total = $countStmt->fetch()['total'];
    
    jsonResponse([
        'success' => true,
        'data' => $farms,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

function getFarm($id) {
    $stmt = getDB()->prepare("SELECT * FROM farms WHERE id = ?");
    $stmt->execute([$id]);
    $farm = $stmt->fetch();
    
    if (!$farm) {
        jsonResponse(['error' => 'Farm not found'], 404);
    }
    
    jsonResponse(['success' => true, 'data' => $farm]);
}

function getFarmsByFarmer($farmerId) {
    $stmt = getDB()->prepare("SELECT * FROM farms WHERE farmer_id = ? ORDER BY created_at ASC");
    $stmt->execute([$farmerId]);
    $farms = $stmt->fetchAll();
    
    jsonResponse(['success' => true, 'data' => $farms]);
}

function createFarm() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['farmer_id'])) {
        jsonResponse(['error' => "Field farmer_id is required"], 400);
    }
    
    $location = $input['location'] ?? '';
    if (empty($location)) {
        $farmerStmt = getDB()->prepare("SELECT barangay FROM farmers WHERE id = ?");
        $farmerStmt->execute([$input['farmer_id']]);
        $farmer = $farmerStmt->fetch();
        $location = $farmer['barangay'] ?? '';
    }
    
    try {
        $stmt = getDB()->prepare("INSERT INTO farms (farmer_id, farm_name, location, size, size_unit, crop_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['farmer_id'],
            sanitize($input['farm_name'] ?? ''),
            $location,
            $input['size'] ?? null,
            $input['size_unit'] ?? 'hectares',
            sanitize($input['crop_type'] ?? ''),
            $input['status'] ?? 'active'
        ]);
        
        $id = getDB()->lastInsertId();
        
        if (!empty($input['size'])) {
            $farmerStmt = getDB()->prepare("SELECT farm_size FROM farmers WHERE id = ?");
            $farmerStmt->execute([$input['farmer_id']]);
            $farmer = $farmerStmt->fetch();
            $newFarmSize = ($farmer['farm_size'] ?? 0) + $input['size'];
            
            $updateFarmerStmt = getDB()->prepare("UPDATE farmers SET farm_size = ? WHERE id = ?");
            $updateFarmerStmt->execute([$newFarmSize, $input['farmer_id']]);
        }
        
        jsonResponse(['success' => true, 'message' => 'Farm created successfully', 'id' => $id]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to create farm'], 500);
    }
}

function updateFarm($id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $fields = ['farm_name', 'location', 'size', 'size_unit', 'crop_type', 'status'];
    $setParts = [];
    $values = [];
    
    foreach ($fields as $field) {
        if (isset($input[$field])) {
            $setParts[] = "$field = ?";
            $values[] = is_string($input[$field]) ? sanitize($input[$field]) : $input[$field];
        }
    }
    
    if (empty($setParts)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }
    
    $values[] = $id;
    
    try {
        $stmt = getDB()->prepare("UPDATE farms SET " . implode(', ', $setParts) . " WHERE id = ?");
        $stmt->execute($values);
        
        jsonResponse(['success' => true, 'message' => 'Farm updated successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update farm'], 500);
    }
}

function deleteFarm($id) {
    requireAuth();
    
    try {
        $farmStmt = getDB()->prepare("SELECT farmer_id, size FROM farms WHERE id = ?");
        $farmStmt->execute([$id]);
        $farm = $farmStmt->fetch();
        
        if ($farm && $farm['size'] > 0) {
            $farmerStmt = getDB()->prepare("SELECT farm_size FROM farmers WHERE id = ?");
            $farmerStmt->execute([$farm['farmer_id']]);
            $farmer = $farmerStmt->fetch();
            $newFarmSize = max(0, ($farmer['farm_size'] ?? 0) - $farm['size']);
            
            $updateFarmerStmt = getDB()->prepare("UPDATE farmers SET farm_size = ? WHERE id = ?");
            $updateFarmerStmt->execute([$newFarmSize, $farm['farmer_id']]);
        }
        
        $stmt = getDB()->prepare("DELETE FROM farms WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['success' => true, 'message' => 'Farm deleted successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to delete farm'], 500);
    }
}

function searchFarms($query) {
    $search = '%' . sanitize($query) . '%';
    $stmt = getDB()->prepare("SELECT f.*, fr.name as farmer_name, fr.rsbsa_number, fr.barangay, fr.municipality 
        FROM farms f 
        LEFT JOIN farmers fr ON f.farmer_id = fr.id 
        WHERE f.location LIKE ? OR f.farm_name LIKE ? OR fr.name LIKE ? OR fr.rsbsa_number LIKE ?
        ORDER BY f.created_at DESC LIMIT 50");
    $stmt->execute([$search, $search, $search, $search]);
    $farms = $stmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data' => $farms,
        'pagination' => [
            'page' => 1,
            'limit' => 50,
            'total' => count($farms),
            'pages' => 1
        ]
    ]);
}

function syncFarmsFromFarmers() {
    $stmt = getDB()->query("SELECT id, name, barangay, farm_size, farm_size_unit, crop_type FROM farmers WHERE farm_size > 0");
    $farmers = $stmt->fetchAll();
    
    $created = 0;
    $updated = 0;
    
    foreach ($farmers as $farmer) {
        $checkStmt = getDB()->prepare("SELECT id FROM farms WHERE farmer_id = ?");
        $checkStmt->execute([$farmer['id']]);
        $existingFarm = $checkStmt->fetch();
        
        if ($existingFarm) {
            $updateStmt = getDB()->prepare("UPDATE farms SET location = ?, size = ?, size_unit = ?, crop_type = ? WHERE farmer_id = ?");
            $updateStmt->execute([
                $farmer['barangay'],
                $farmer['farm_size'],
                $farmer['farm_size_unit'] ?: 'hectares',
                $farmer['crop_type'],
                $farmer['id']
            ]);
            $updated++;
        } else {
            $insertStmt = getDB()->prepare("INSERT INTO farms (farmer_id, farm_name, location, size, size_unit, crop_type, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
            $insertStmt->execute([
                $farmer['id'],
                $farmer['name'],
                $farmer['barangay'],
                $farmer['farm_size'],
                $farmer['farm_size_unit'] ?: 'hectares',
                $farmer['crop_type']
            ]);
            $created++;
        }
    }
    
    jsonResponse([
        'success' => true,
        'message' => "Synced: $created created, $updated updated",
        'created' => $created,
        'updated' => $updated
    ]);
}
