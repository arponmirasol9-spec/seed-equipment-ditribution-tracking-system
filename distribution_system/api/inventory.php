<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? 'seeds';
$action = $_GET['action'] ?? '';

if ($type === 'seeds' || $type === 'equipment') {
    $table = $type === 'seeds' ? 'seeds_inventory' : 'equipment_inventory';
} else {
    $table = 'all';
}

switch ($method) {
    case 'GET':
        if ($action === 'list' || $action === '') {
            getInventory($table);
        } elseif ($action === 'single' && isset($_GET['id'])) {
            getItem($table, $_GET['id']);
        } elseif ($action === 'low-stock') {
            getLowStock($table);
        } elseif ($action === 'stats') {
            getInventoryStats($table);
        } elseif ($action === 'history') {
            getStockHistory($type);
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createItem($table);
        } elseif ($action === 'update' && isset($_GET['id'])) {
            updateItem($table, $_GET['id']);
        } elseif ($action === 'delete' && isset($_GET['id'])) {
            deleteItem($table, $_GET['id']);
        } elseif ($action === 'adjust') {
            adjustStock($type);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getInventory($table) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    $status = $_GET['status'] ?? '';
    $search = $_GET['search'] ?? '';
    
    if ($table === 'all') {
        $seedsConditions = buildConditions($status, $search, 'seeds_inventory');
        $equipConditions = buildConditions($status, $search, 'equipment_inventory');
        
        $seedsSql = "SELECT *, 'seed' as item_type FROM seeds_inventory" . $seedsConditions['where'];
        $equipSql = "SELECT *, 'equipment' as item_type FROM equipment_inventory" . $equipConditions['where'];
        
        $seedsSql .= " ORDER BY created_at ASC";
        $equipSql .= " ORDER BY created_at ASC";
        
        $seedsStmt = getDB()->query($seedsSql);
        $seeds = $seedsStmt->fetchAll();
        $equipStmt = getDB()->query($equipSql);
        $equipment = $equipStmt->fetchAll();
        
        $items = array_merge($seeds, $equipment);
        $total = count($items);
        $items = array_slice($items, $offset, $limit);
        
        jsonResponse([
            'success' => true,
            'data' => $items,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
        return;
    }
    
    $conditions = buildConditions($status, $search, $table);
    $where = $conditions['where'];
    
    $sql = "SELECT * FROM " . $table . $where . " ORDER BY created_at ASC LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
    $stmt = getDB()->query($sql);
    $items = $stmt->fetchAll();
    
    $countSql = "SELECT COUNT(*) as total FROM " . $table . $where;
    $countStmt = getDB()->query($countSql);
    $total = $countStmt->fetch()['total'];
    
    jsonResponse([
        'success' => true,
        'data' => $items,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

function buildConditions($status, $search, $table) {
    $conditions = [];
    $where = "";
    
    if ($status) {
        $conditions[] = "status = '" . sanitize($status) . "'";
    }
    
    if ($search) {
        $searchVal = sanitize($search);
        if ($table === 'seeds_inventory') {
            $conditions[] = "(crop_type LIKE '%$searchVal%' OR variety LIKE '%$searchVal%')";
        } else {
            $conditions[] = "(name LIKE '%$searchVal%' OR category LIKE '%$searchVal%')";
        }
    }
    
    if (!empty($conditions)) {
        $where = " WHERE " . implode(" AND ", $conditions);
    }
    
    return ['where' => $where, 'conditions' => $conditions];
}

function getItem($table, $id) {
    $stmt = getDB()->prepare("SELECT * FROM " . $table . " WHERE id = ?");
    $stmt->execute([$id]);
    $item = $stmt->fetch();
    
    if (!$item) {
        jsonResponse(['error' => 'Item not found'], 404);
    }
    
    jsonResponse(['success' => true, 'data' => $item]);
}

function getLowStock($table) {
    $stmt = getDB()->query("SELECT * FROM " . $table . " WHERE status IN ('low_stock', 'out_of_stock') ORDER BY quantity ASC");
    
    jsonResponse([
        'success' => true,
        'data' => $stmt->fetchAll()
    ]);
}

function getInventoryStats($table) {
    $stmt = getDB()->query("
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_quantity,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN status = 'low_stock' THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock,
            SUM(CASE WHEN quantity <= threshold THEN 1 ELSE 0 END) as below_threshold
        FROM " . $table
    );
    
    jsonResponse(['success' => true, 'data' => $stmt->fetch()]);
}

function getStockHistory($type) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    
    $stmt = getDB()->prepare("
        SELECT sh.*, 
            COALESCE(si.crop_type, ei.name) as item_name
        FROM stock_history sh
        LEFT JOIN seeds_inventory si ON sh.item_type = 'seed' AND sh.item_id = si.id
        LEFT JOIN equipment_inventory ei ON sh.item_type = 'equipment' AND sh.item_id = ei.id
        WHERE sh.item_type = ?
        ORDER BY sh.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$type, $limit, $offset]);
    
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

function createItem($table) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($table === 'seeds_inventory') {
        $required = ['crop_type'];
        $fields = ['crop_type', 'variety', 'quantity', 'unit', 'threshold'];
    } else {
        $required = ['name'];
        $fields = ['name', 'category', 'quantity', 'condition', 'threshold', 'notes'];
    }
    
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['error' => "Field $field is required"], 400);
        }
    }
    
    try {
        if ($table === 'seeds_inventory') {
            $cropType = sanitize($input['crop_type']);
            $variety = sanitize($input['variety'] ?? '');
            $quantity = floatval($input['quantity'] ?? 0);
            $unit = $input['unit'] ?? 'kg';
            $threshold = floatval($input['threshold'] ?? 10);
            
            // Check if item with same crop_type and variety already exists
            $stmtCheck = getDB()->prepare("SELECT id, quantity FROM seeds_inventory WHERE LOWER(TRIM(crop_type)) = LOWER(TRIM(?)) AND LOWER(TRIM(variety)) = LOWER(TRIM(?))");
            $stmtCheck->execute([$cropType, $variety]);
            $existing = $stmtCheck->fetch();
            
            if ($existing) {
                $id = $existing['id'];
                $newQuantity = floatval($existing['quantity']) + $quantity;
                $status = calculateStatus($newQuantity, $threshold);
                
                $stmtUpdate = getDB()->prepare("UPDATE seeds_inventory SET quantity = ?, unit = ?, threshold = ?, status = ? WHERE id = ?");
                $stmtUpdate->execute([$newQuantity, $unit, $threshold, $status, $id]);
                
                logStockChange('seed', $id, $quantity, 'addition', null, 'Added stock to existing seed item');
                
                jsonResponse(['success' => true, 'message' => 'Stock added to existing item successfully', 'id' => $id]);
                return;
            }
            
            $stmt = getDB()->prepare("INSERT INTO seeds_inventory (crop_type, variety, quantity, unit, threshold, status) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $cropType,
                $variety,
                $quantity,
                $unit,
                $threshold,
                calculateStatus($quantity, $threshold)
            ]);
            $id = getDB()->lastInsertId();
            logStockChange('seed', $id, $quantity, 'addition', null, 'Initial stock');
            jsonResponse(['success' => true, 'message' => 'Item created successfully', 'id' => $id]);
        } else {
            $name = sanitize($input['name']);
            $category = sanitize($input['category'] ?? '');
            $quantity = floatval($input['quantity'] ?? 0);
            $condition = $input['condition'] ?? 'good';
            $threshold = floatval($input['threshold'] ?? 5);
            $notes = sanitize($input['notes'] ?? '');
            
            // Check if equipment with same name already exists
            $stmtCheck = getDB()->prepare("SELECT id, quantity FROM equipment_inventory WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))");
            $stmtCheck->execute([$name]);
            $existing = $stmtCheck->fetch();
            
            if ($existing) {
                $id = $existing['id'];
                $newQuantity = floatval($existing['quantity']) + $quantity;
                $status = calculateStatus($newQuantity, $threshold);
                
                $stmtUpdate = getDB()->prepare("UPDATE equipment_inventory SET quantity = ?, category = ?, `condition` = ?, threshold = ?, notes = ?, status = ? WHERE id = ?");
                $stmtUpdate->execute([$newQuantity, $category, $condition, $threshold, $notes, $status, $id]);
                
                logStockChange('equipment', $id, $quantity, 'addition', null, 'Added stock to existing equipment item');
                
                jsonResponse(['success' => true, 'message' => 'Stock added to existing equipment successfully', 'id' => $id]);
                return;
            }
            
            $stmt = getDB()->prepare("INSERT INTO equipment_inventory (name, category, quantity, `condition`, threshold, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $name,
                $category,
                $quantity,
                $condition,
                $threshold,
                $notes,
                calculateStatus($quantity, $threshold)
            ]);
            $id = getDB()->lastInsertId();
            logStockChange('equipment', $id, $quantity, 'addition', null, 'Initial stock');
            jsonResponse(['success' => true, 'message' => 'Item created successfully', 'id' => $id]);
        }
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to create item: ' . $e->getMessage()], 500);
    }
}

function updateItem($table, $id) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($table === 'seeds_inventory') {
        $fields = ['crop_type', 'variety', 'quantity', 'unit', 'threshold'];
    } else {
        $fields = ['name', 'category', 'quantity', 'condition', 'threshold', 'notes'];
    }
    
    $setParts = [];
    $values = [];
    
    foreach ($fields as $field) {
        if (isset($input[$field])) {
            $setParts[] = "$field = ?";
            $values[] = $field === 'crop_type' || $field === 'variety' || $field === 'name' || $field === 'category' || $field === 'supplier' || $field === 'notes' ? sanitize($input[$field]) : $input[$field];
        }
    }
    
    // Update status based on quantity
    if (isset($input['quantity'])) {
        $threshold = $input['threshold'] ?? 10;
        $setParts[] = "status = ?";
        $values[] = calculateStatus($input['quantity'], $threshold);
    }
    
    if (empty($setParts)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }
    
    $values[] = $id;
    
    try {
        $stmt = getDB()->prepare("UPDATE " . $table . " SET " . implode(', ', $setParts) . " WHERE id = ?");
        $stmt->execute($values);
        
        jsonResponse(['success' => true, 'message' => 'Item updated successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update item'], 500);
    }
}

function deleteItem($table, $id) {
    requireAuth();
    
    try {
        $stmt = getDB()->prepare("DELETE FROM " . $table . " WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['success' => true, 'message' => 'Item deleted successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to delete item'], 500);
    }
}

function adjustStock($type) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['item_id']) || !isset($input['quantity_change']) || !isset($input['change_type'])) {
        jsonResponse(['error' => 'item_id, quantity_change, and change_type are required'], 400);
    }
    
    $table = $type === 'seed' ? 'seeds_inventory' : 'equipment_inventory';
    
    // Get current quantity
    $stmt = getDB()->prepare("SELECT quantity, threshold FROM " . $table . " WHERE id = ?");
    $stmt->execute([$input['item_id']]);
    $item = $stmt->fetch();
    
    if (!$item) {
        jsonResponse(['error' => 'Item not found'], 404);
    }
    
    $newQuantity = $item['quantity'] + $input['quantity_change'];
    if ($newQuantity < 0) {
        jsonResponse(['error' => 'Insufficient stock'], 400);
    }
    
    $status = calculateStatus($newQuantity, $item['threshold']);
    
    try {
        $stmt = getDB()->prepare("UPDATE " . $table . " SET quantity = ?, status = ? WHERE id = ?");
        $stmt->execute([$newQuantity, $status, $input['item_id']]);
        
        logStockChange($type, $input['item_id'], $input['quantity_change'], $input['change_type'], null, $input['notes'] ?? '');
        
        jsonResponse(['success' => true, 'message' => 'Stock adjusted successfully', 'new_quantity' => $newQuantity]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to adjust stock'], 500);
    }
}

function calculateStatus($quantity, $threshold) {
    if ($quantity <= 0) return 'out_of_stock';
    if ($quantity <= $threshold) return 'low_stock';
    return 'available';
}

function logStockChange($itemType, $itemId, $quantityChange, $changeType, $referenceId, $notes) {
    try {
        $stmt = getDB()->prepare("INSERT INTO stock_history (item_type, item_id, quantity_change, change_type, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$itemType, $itemId, $quantityChange, $changeType, $referenceId, sanitize($notes)]);
    } catch (PDOException $e) {
        // Silent fail
    }
}