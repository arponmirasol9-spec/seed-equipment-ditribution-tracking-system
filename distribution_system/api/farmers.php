<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list' || $action === '') {
            getFarmers();
        } elseif ($action === 'single' && isset($_GET['id'])) {
            getFarmer($_GET['id']);
        } elseif ($action === 'search') {
            searchFarmers($_GET['q'] ?? '');
        } elseif ($action === 'stats') {
            getFarmerStats();
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createFarmer();
        } elseif ($action === 'update' && isset($_GET['id'])) {
            updateFarmer($_GET['id']);
        } elseif ($action === 'delete' && isset($_GET['id'])) {
            deleteFarmer($_GET['id']);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getFarmers() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    $status = $_GET['status'] ?? '';
    
    $where = "";
    $params = [];
    if ($status) {
        $where = " WHERE status = ?";
        $params[] = $status;
    }
    
    try {
        $stmt = getDB()->prepare("SELECT f.*, 
            IFNULL(NULLIF((SELECT SUM(size) FROM farms WHERE farmer_id = f.id), 0), IFNULL(f.farm_size, 0)) as total_farm_size 
            FROM farmers f" . $where . " ORDER BY f.rsbsa_number ASC LIMIT " . (int)$limit . " OFFSET " . (int)$offset);
        $stmt->execute($params);
        $farmers = $stmt->fetchAll();
        
        $countStmt = getDB()->query("SELECT COUNT(*) as total FROM farmers" . $where);
        $total = $countStmt->fetch()['total'];
    } catch (Exception $e) {
        $farmers = [];
        $total = 0;
    }
    
    jsonResponse([
        'success' => true,
        'data' => $farmers,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => max(1, ceil($total / $limit))
        ]
    ]);
}

function getFarmer($id) {
    $stmt = getDB()->prepare("SELECT f.*, 
        IFNULL(NULLIF((SELECT SUM(size) FROM farms WHERE farmer_id = f.id), 0), IFNULL(f.farm_size, 0)) as total_farm_size 
        FROM farmers f WHERE f.id = ?");
    $stmt->execute([$id]);
    $farmer = $stmt->fetch();
    
    if (!$farmer) {
        jsonResponse(['error' => 'Farmer not found'], 404);
    }
    
    // Get distribution history
    $distStmt = getDB()->prepare("
        SELECT d.*, COUNT(di.id) as item_count 
        FROM distributions d 
        LEFT JOIN distribution_items di ON d.id = di.distribution_id 
        WHERE d.farmer_id = ? 
        GROUP BY d.id 
        ORDER BY d.distribution_date DESC 
        LIMIT 10
    ");
    $distStmt->execute([$id]);
    $distributions = $distStmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data' => $farmer,
        'distributions' => $distributions
    ]);
}

function searchFarmers($query) {
    try {
        $searchTerm = "%" . sanitize($query) . "%";
        $stmt = getDB()->prepare("
            SELECT * FROM farmers 
            WHERE name LIKE ? OR rsbsa_number LIKE ? OR phone LIKE ? OR farm_location LIKE ? OR crop_type LIKE ? OR barangay LIKE ? OR municipality LIKE ? OR province LIKE ?
            ORDER BY name ASC
            LIMIT 50
        ");
        $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
        
        jsonResponse([
            'success' => true,
            'data' => $stmt->fetchAll()
        ]);
    } catch (PDOException $e) {
        error_log("Search farmers error: " . $e->getMessage());
        jsonResponse(['error' => 'Search failed'], 500);
    }
}

function createFarmer() {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $required = ['last_name', 'first_name'];
    
    $required = ['last_name', 'first_name'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['error' => "Field $field is required"], 400);
        }
    }
    
    $parts = array_filter([
        $input['first_name'] ?? '',
        $input['middle_name'] ?? ''
    ]);
    $name = implode(' ', $parts);
    if (!empty($input['last_name'])) {
        $name = $input['last_name'] . ', ' . $name;
    }
    if (!empty($input['extension'])) {
        $name .= ', ' . $input['extension'];
    }
    $name = trim($name);
    
    try {
        $stmt = getDB()->prepare("INSERT INTO farmers (rsbsa_number, name, last_name, first_name, middle_name, extension, sex, birthdate, phone, barangay, municipality, province, farm_size, farm_size_unit, crop_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['rsbsa_number'] ?? '',
            $name,
            sanitize($input['last_name'] ?? ''),
            sanitize($input['first_name'] ?? ''),
            sanitize($input['middle_name'] ?? ''),
            sanitize($input['extension'] ?? ''),
            sanitize($input['sex'] ?? ''),
            sanitize($input['birthdate'] ?? ''),
            sanitize($input['phone'] ?? ''),
            sanitize($input['barangay'] ?? ''),
            sanitize($input['municipality'] ?? ''),
            sanitize($input['province'] ?? ''),
            $input['farm_size'] ?? null,
            $input['farm_size_unit'] ?? 'hectares',
            sanitize($input['crop_type'] ?? ''),
            $input['status'] ?? 'active'
        ]);
        
        $id = getDB()->lastInsertId();
        
        // Log to sync queue for offline
        logSyncOperation('INSERT', 'farmers', $id, $input);
        
        jsonResponse(['success' => true, 'message' => 'Farmer created successfully', 'id' => $id]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to create farmer'], 500);
    }
}

function updateFarmer($id) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['last_name']) || isset($input['first_name'])) {
    $parts = array_filter([
        $input['first_name'] ?? '',
        $input['middle_name'] ?? ''
    ]);
    $name = implode(' ', $parts);
    if (!empty($input['last_name'])) {
        $name = $input['last_name'] . ', ' . $name;
    }
    if (!empty($input['extension'])) {
        $name .= ', ' . $input['extension'];
    }
    $name = trim($name);
        $input['name'] = $name;
    }
    
    try {
        $stmt = getDB()->prepare("UPDATE farmers SET rsbsa_number = ?, name = ?, last_name = ?, first_name = ?, middle_name = ?, extension = ?, sex = ?, birthdate = ?, phone = ?, barangay = ?, municipality = ?, province = ?, farm_size = ?, farm_size_unit = ?, crop_type = ?, status = ? WHERE id = ?");
        $stmt->execute([
            sanitize($input['rsbsa_number'] ?? ''),
            sanitize($input['name'] ?? ''),
            sanitize($input['last_name'] ?? ''),
            sanitize($input['first_name'] ?? ''),
            sanitize($input['middle_name'] ?? ''),
            sanitize($input['extension'] ?? ''),
            sanitize($input['sex'] ?? ''),
            sanitize($input['birthdate'] ?? ''),
            sanitize($input['phone'] ?? ''),
            sanitize($input['barangay'] ?? ''),
            sanitize($input['municipality'] ?? ''),
            sanitize($input['province'] ?? ''),
            $input['farm_size'] ?? null,
            $input['farm_size_unit'] ?? 'hectares',
            sanitize($input['crop_type'] ?? ''),
            $input['status'] ?? 'active',
            $id
        ]);
        
        logSyncOperation('UPDATE', 'farmers', $id, $input);
        
        jsonResponse(['success' => true, 'message' => 'Farmer updated successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update farmer'], 500);
    }
}

function deleteFarmer($id) {
    requireAuth();
    
    try {
        $stmt = getDB()->prepare("DELETE FROM farmers WHERE id = ?");
        $stmt->execute([$id]);
        
        logSyncOperation('DELETE', 'farmers', $id, ['id' => $id]);
        
        jsonResponse(['success' => true, 'message' => 'Farmer deleted successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to delete farmer'], 500);
    }
}

function getFarmerStats() {
    $stmt = getDB()->query("
        SELECT 
            COUNT(*) as total_farmers,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_farmers,
            SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_farmers,
            SUM(CASE WHEN crop_type = 'Maize' THEN 1 ELSE 0 END) as maize_farmers,
            SUM(CASE WHEN crop_type = 'Wheat' THEN 1 ELSE 0 END) as wheat_farmers,
            SUM(CASE WHEN crop_type = 'Rice' THEN 1 ELSE 0 END) as rice_farmers,
            SUM(CASE WHEN crop_type = 'Beans' THEN 1 ELSE 0 END) as beans_farmers,
            SUM(farm_size) as total_farm_size
        FROM farmers
    ");
    
    jsonResponse(['success' => true, 'data' => $stmt->fetch()]);
}

function logSyncOperation($operation, $table, $recordId, $data) {
    try {
        $stmt = getDB()->prepare("INSERT INTO sync_queue (operation, table_name, record_id, data_json) VALUES (?, ?, ?, ?)");
        $stmt->execute([$operation, $table, $recordId, json_encode($data)]);
    } catch (PDOException $e) {
        // Silent fail - offline logging
    }
}