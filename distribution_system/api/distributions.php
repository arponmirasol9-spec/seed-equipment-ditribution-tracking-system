<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list' || $action === '') {
            getDistributions();
        } elseif ($action === 'single' && isset($_GET['id'])) {
            getDistribution($_GET['id']);
        } elseif ($action === 'search' && isset($_GET['q'])) {
            searchDistributions($_GET['q']);
        } elseif ($action === 'stats') {
            getDistributionStats();
        } elseif ($action === 'by-farmer' && isset($_GET['farmer_id'])) {
            getDistributionsByFarmer($_GET['farmer_id']);
        } elseif ($action === 'by-year') {
            getDistributionsByYear();
        } elseif ($action === 'report') {
            getDistributionReport();
        } elseif ($action === 'check-farmer-today' && isset($_GET['farmer_id'])) {
            checkFarmerToday($_GET['farmer_id'], $_GET['date'] ?? date('Y-m-d'));
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createDistribution();
        } elseif ($action === 'update' && isset($_GET['id'])) {
            updateDistribution($_GET['id']);
        } elseif ($action === 'delete') {
            $id = $_GET['id'] ?? ($_POST['id'] ?? null);
            if ($id) {
                deleteDistribution($id);
            } else {
                jsonResponse(['error' => 'ID required'], 400);
            }
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getDistributions() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    $sort = $_GET['sort'] ?? 'asc';
    $search = $_GET['q'] ?? '';
    $date = $_GET['date'] ?? '';
    $year = $_GET['year'] ?? '';
    
    $order = strtolower($sort) === 'asc' ? 'ASC' : 'DESC';
    
    $where = "";
    if ($search || $date || ($year && $year !== 'all')) {
        $conditions = [];
        if ($search) {
            $searchVal = '%' . sanitize($search) . '%';
            $conditions[] = "(f.name LIKE '$searchVal' OR f.phone LIKE '$searchVal' OR d.notes LIKE '$searchVal')";
        }
        if ($date) {
            $conditions[] = "d.distribution_date = '" . sanitize($date) . "'";
        }
        if ($year && $year !== 'all') {
            $conditions[] = "YEAR(d.distribution_date) = " . (int)$year;
        }
        $where = " WHERE " . implode(" AND ", $conditions);
    }
    
    $stmt = getDB()->query("
        SELECT d.*, 
            f.name as farmer_name, f.last_name, f.first_name, f.middle_name, f.extension,
            f.sex, f.birthdate, f.phone as farmer_phone, f.phone, f.address,
            f.barangay, f.municipality, f.province, f.farm_location, f.rsbsa_number,
            f.crop_type, f.farm_size, f.farm_size_unit,
            IFNULL(NULLIF((SELECT SUM(size) FROM farms WHERE farmer_id = f.id), 0), IFNULL(f.farm_size, 0)) as calculated_farm_size,
            u.full_name as created_by_name
        FROM distributions d
        LEFT JOIN farmers f ON d.farmer_id = f.id
        LEFT JOIN users u ON d.created_by = u.id
        $where
        ORDER BY d.distribution_date $order, d.created_at $order
        LIMIT " . (int)$limit . " OFFSET " . (int)$offset
    );
    $distributions = $stmt->fetchAll();
    
    // Get items for each distribution
    foreach ($distributions as &$dist) {
        $itemsStmt = getDB()->prepare("
            SELECT di.*, 
                si.crop_type as seed_crop_type,
                si.variety as seed_variety,
                ei.name as equip_name,
                ei.category as equip_category
            FROM distribution_items di
            LEFT JOIN seeds_inventory si ON di.item_type = 'seed' AND di.item_id = si.id
            LEFT JOIN equipment_inventory ei ON di.item_type = 'equipment' AND di.item_id = ei.id
            WHERE di.distribution_id = ?
        ");
        $itemsStmt->execute([$dist['id']]);
        $items = $itemsStmt->fetchAll();
        
        foreach ($items as &$item) {
            if (!isset($item['item_type']) || $item['item_type'] === '') {
                // Check item_id in both tables to determine type
                $checkSeed = getDB()->query("SELECT id, crop_type, variety FROM seeds_inventory WHERE id = " . (int)$item['item_id'])->fetch();
                $checkEquip = getDB()->query("SELECT id, name, category FROM equipment_inventory WHERE id = " . (int)$item['item_id'])->fetch();
                
                if ($checkSeed) {
                    $item['item_type'] = 'seed';
                    $item['item_name'] = $checkSeed['crop_type'];
                    $item['item_variety'] = $checkSeed['variety'];
                } elseif ($checkEquip) {
                    $item['item_type'] = 'equipment';
                    $item['item_name'] = $checkEquip['name'] ?: $checkEquip['category'];
                    $item['equip_name'] = $checkEquip['name'];
                    $item['equip_category'] = $checkEquip['category'];
                }
            } elseif ($item['item_type'] === 'seed') {
                $item['item_name'] = $item['seed_crop_type'];
                $item['item_variety'] = $item['seed_variety'];
            } else {
                $item['item_name'] = !empty($item['equip_name']) ? $item['equip_name'] : 
                                     (!empty($item['equip_category']) ? $item['equip_category'] : 'Equipment #' . $item['item_id']);
                $item['item_category'] = $item['equip_category'];
            }
        }
        
        $dist['items'] = $items;
    }
    
    $countStmt = getDB()->query("SELECT COUNT(*) as total FROM distributions");
    $total = $countStmt->fetch()['total'];
    
    jsonResponse([
        'success' => true,
        'data' => $distributions,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

function getDistribution($id) {
    $stmt = getDB()->prepare("
        SELECT d.*, 
            f.name as farmer_name, f.last_name, f.first_name, f.middle_name, f.extension,
            f.sex, f.birthdate, f.phone as farmer_phone, f.phone, f.address,
            f.barangay, f.municipality, f.province, f.farm_location, f.rsbsa_number,
            f.crop_type, f.farm_size, f.farm_size_unit,
            IFNULL(NULLIF((SELECT SUM(size) FROM farms WHERE farmer_id = f.id), 0), IFNULL(f.farm_size, 0)) as calculated_farm_size,
            u.full_name as created_by_name
        FROM distributions d
        LEFT JOIN farmers f ON d.farmer_id = f.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.id = ?
    ");
    $stmt->execute([$id]);
    $distribution = $stmt->fetch();
    
    if (!$distribution) {
        jsonResponse(['error' => 'Distribution not found'], 404);
    }
    
    $itemsStmt = getDB()->prepare("
        SELECT di.*, 
            si.crop_type as seed_crop_type,
            si.variety as seed_variety,
            si.unit as seed_unit,
            ei.name as equip_name,
            ei.category as equip_category
        FROM distribution_items di
        LEFT JOIN seeds_inventory si ON di.item_type = 'seed' AND di.item_id = si.id
        LEFT JOIN equipment_inventory ei ON di.item_type = 'equipment' AND di.item_id = ei.id
        WHERE di.distribution_id = ?
    ");
    $itemsStmt->execute([$id]);
    $items = $itemsStmt->fetchAll();
    
    foreach ($items as &$item) {
        if ($item['item_type'] === 'seed') {
            $item['item_name'] = $item['seed_crop_type'];
            $item['item_variety'] = $item['seed_variety'];
            $item['unit'] = $item['seed_unit'] ?: 'pieces';
        } else {
            $item['item_name'] = $item['equip_name'] ?: $item['equip_category'];
            $item['item_category'] = $item['equip_category'];
        }
    }
    
    $distribution['items'] = $items;
    
    jsonResponse(['success' => true, 'data' => $distribution]);
}

function getDistributionsByFarmer($farmerId) {
    $stmt = getDB()->prepare("
        SELECT d.*, f.name as farmer_name, f.rsbsa_number
        FROM distributions d
        LEFT JOIN farmers f ON d.farmer_id = f.id
        WHERE d.farmer_id = ?
        ORDER BY d.distribution_date DESC
    ");
    $stmt->execute([$farmerId]);
    $distributions = $stmt->fetchAll();
    
    foreach ($distributions as &$dist) {
        $itemsStmt = getDB()->prepare("
            SELECT di.*, 
                si.crop_type as seed_crop_type,
                si.variety as seed_variety,
                ei.name as equip_name,
                ei.category as equip_category
            FROM distribution_items di
            LEFT JOIN seeds_inventory si ON di.item_type = 'seed' AND di.item_id = si.id
            LEFT JOIN equipment_inventory ei ON di.item_type = 'equipment' AND di.item_id = ei.id
            WHERE di.distribution_id = ?
        ");
        $itemsStmt->execute([$dist['id']]);
        $items = $itemsStmt->fetchAll();
        
        foreach ($items as &$item) {
            if ($item['item_type'] === 'seed') {
                $item['item_name'] = $item['seed_crop_type'];
                $item['item_variety'] = $item['seed_variety'];
            } else {
                $item['item_name'] = $item['equip_name'] ?: $item['equip_category'];
                $item['item_category'] = $item['equip_category'];
                $item['equip_category'] = $item['equip_category'];
                $item['category'] = $item['equip_category'];
            }
        }
        
        $dist['items'] = $items;
    }
    
    jsonResponse(['success' => true, 'data' => $distributions]);
}

function searchDistributions($query) {
    $search = '%' . sanitize($query) . '%';
    $stmt = getDB()->prepare("
        SELECT d.*, 
            f.name as farmer_name, f.last_name, f.first_name, f.middle_name, f.extension,
            f.sex, f.birthdate, f.phone as farmer_phone, f.phone, f.address,
            f.barangay, f.municipality, f.province, f.farm_location, f.rsbsa_number,
            f.crop_type, f.farm_size, f.farm_size_unit,
            IFNULL(NULLIF((SELECT SUM(size) FROM farms WHERE farmer_id = f.id), 0), IFNULL(f.farm_size, 0)) as calculated_farm_size,
            u.full_name as created_by_name
        FROM distributions d
        LEFT JOIN farmers f ON d.farmer_id = f.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE f.name LIKE ? OR f.rsbsa_number LIKE ? OR d.season LIKE ? OR d.notes LIKE ?
        ORDER BY d.distribution_date DESC
        LIMIT 50
    ");
    $stmt->execute([$search, $search, $search, $search]);
    $distributions = $stmt->fetchAll();
    
    foreach ($distributions as &$dist) {
        $itemsStmt = getDB()->prepare("
            SELECT di.*, 
                si.crop_type as seed_crop_type,
                si.variety as seed_variety,
                ei.name as equip_name,
                ei.category as equip_category
            FROM distribution_items di
            LEFT JOIN seeds_inventory si ON di.item_type = 'seed' AND di.item_id = si.id
            LEFT JOIN equipment_inventory ei ON di.item_type = 'equipment' AND di.item_id = ei.id
            WHERE di.distribution_id = ?
        ");
        $itemsStmt->execute([$dist['id']]);
        $items = $itemsStmt->fetchAll();
        
        foreach ($items as &$item) {
            if ($item['item_type'] === 'seed') {
                $item['item_name'] = $item['seed_crop_type'];
                $item['item_variety'] = $item['seed_variety'];
            } else {
                $item['item_name'] = $item['equip_name'] ?: $item['equip_category'];
                $item['item_category'] = $item['equip_category'];
                $item['equip_category'] = $item['equip_category'];
                $item['category'] = $item['equip_category'];
            }
        }
        
        $dist['items'] = $items;
    }
    
    jsonResponse([
        'success' => true,
        'data' => $distributions,
        'pagination' => [
            'page' => 1,
            'limit' => 50,
            'total' => count($distributions),
            'pages' => 1
        ]
    ]);
}

function getDistributionStats() {
    $stmt = getDB()->query("
        SELECT 
            COUNT(*) as total_distributions,
            SUM(total_items) as total_items_distributed,
            COUNT(DISTINCT farmer_id) as unique_farmers,
            COUNT(DISTINCT distribution_date) as distribution_days
        FROM distributions
        WHERE YEAR(distribution_date) = YEAR(CURRENT_DATE)
    ");
    $yearly = $stmt->fetch();
    
    $monthlyStmt = getDB()->query("
        SELECT 
            MONTH(distribution_date) as month,
            COUNT(*) as count,
            SUM(total_items) as items
        FROM distributions
        WHERE YEAR(distribution_date) = YEAR(CURRENT_DATE)
        GROUP BY MONTH(distribution_date)
        ORDER BY month
    ");
    $monthly = $monthlyStmt->fetchAll();
    
    $recentStmt = getDB()->query("
        SELECT d.*, f.name as farmer_name, f.rsbsa_number
        FROM distributions d
        LEFT JOIN farmers f ON d.farmer_id = f.id
        ORDER BY d.created_at DESC
        LIMIT 5
    ");
    $recent = $recentStmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data' => [
            'yearly' => $yearly,
            'monthly' => $monthly,
            'recent' => $recent
        ]
    ]);
}

function getDistributionReport() {
    $startDate = $_GET['start_date'] ?? date('Y-01-01');
    $endDate = $_GET['end_date'] ?? date('Y-12-31');
    $groupBy = $_GET['group_by'] ?? 'daily';
    
    $dateFormat = '%Y-%m-%d';
    if ($groupBy === 'monthly') {
        $dateFormat = '%Y-%m';
    } elseif ($groupBy === 'yearly') {
        $dateFormat = '%Y';
    }
    
    $stmt = getDB()->prepare("
        SELECT 
            DATE_FORMAT(distribution_date, ?) as period,
            COUNT(*) as distribution_count,
            SUM(total_items) as total_items,
            COUNT(DISTINCT farmer_id) as farmer_count
        FROM distributions
        WHERE distribution_date BETWEEN ? AND ?
        GROUP BY period
        ORDER BY period
    ");
    $stmt->execute([$dateFormat, $startDate, $endDate]);
    $report = $stmt->fetchAll();
    
    // Get item breakdown
    $itemsStmt = getDB()->prepare("
        SELECT 
            di.item_type,
            si.crop_type as seed_crop_type,
            si.variety as seed_variety,
            ei.name as equip_name,
            ei.category as equip_category,
            SUM(di.quantity) as total_quantity,
            COUNT(DISTINCT di.distribution_id) as distribution_count
        FROM distribution_items di
        LEFT JOIN seeds_inventory si ON di.item_type = 'seed' AND di.item_id = si.id
        LEFT JOIN equipment_inventory ei ON di.item_type = 'equipment' AND di.item_id = ei.id
        LEFT JOIN distributions d ON di.distribution_id = d.id
        WHERE d.distribution_date BETWEEN ? AND ?
        GROUP BY di.item_type, di.item_id
        ORDER BY total_quantity DESC
    ");
    $itemsStmt->execute([$startDate, $endDate]);
    $itemBreakdown = $itemsStmt->fetchAll();
    
    foreach ($itemBreakdown as &$item) {
        if ($item['item_type'] === 'seed') {
            $item['item_name'] = $item['seed_crop_type'];
            $item['item_variety'] = $item['seed_variety'];
        } else {
            $item['item_name'] = $item['equip_name'] ?: $item['equip_category'];
            $item['item_category'] = $item['equip_category'];
        }
    }
    
    jsonResponse([
        'success' => true,
        'data' => [
            'period_report' => $report,
            'item_breakdown' => $itemBreakdown,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]
    ]);
}

function checkFarmerToday($farmerId, $date) {
    requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id, distribution_date FROM distributions WHERE farmer_id = ? AND distribution_date = ? LIMIT 1");
    $stmt->execute([(int)$farmerId, $date]);
    $existing = $stmt->fetch();
    jsonResponse([
        'has_distribution' => $existing !== false,
        'date' => $date,
        'farmer_id' => (int)$farmerId,
    ]);
}

function createDistribution() {
    requireAuth();
    $user = requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['farmer_id']) || !isset($input['items']) || empty($input['items'])) {
        jsonResponse(['error' => 'Farmer ID and items are required'], 400);
    }
    
    $db = getDB();
    
    try {
        $db->beginTransaction();
        
        $distDate = $input['distribution_date'] ?? date('Y-m-d');
        $checkStmt = $db->prepare("SELECT id FROM distributions WHERE farmer_id = ? AND distribution_date = ?");
        $checkStmt->execute([(int)$input['farmer_id'], $distDate]);
        if ($checkStmt->fetch()) {
            throw new Exception("This farmer has already received a distribution today (" . $distDate . "). Only one distribution per farmer per day is allowed.");
        }
        
        $validatedItems = [];
        
        foreach ($input['items'] as $item) {
            if (!isset($item['item_type']) || !isset($item['item_id']) || !isset($item['quantity'])) {
                throw new Exception("Invalid item: each item must have a valid type, id, and quantity");
            }
            
            $qty = (float)$item['quantity'];
            if ($qty <= 0) {
                throw new Exception("Quantity must be at least 1 for item ID " . $item['item_id']);
            }
            
            $table = $item['item_type'] === 'seed' ? 'seeds_inventory' : 'equipment_inventory';
            
            $invStmt = $db->prepare("SELECT quantity, threshold, status FROM " . $table . " WHERE id = ? FOR UPDATE");
            $invStmt->execute([(int)$item['item_id']]);
            $invItem = $invStmt->fetch();
            
            if (!$invItem) {
                throw new Exception("Inventory item not found (ID: " . $item['item_id'] . ")");
            }
            
            $currentStock = (float)$invItem['quantity'];
            
            if ($currentStock <= 0 || $invItem['status'] === 'out_of_stock') {
                throw new Exception("This item is out of stock. Distribution cannot be completed.");
            }
            
            if ($qty > $currentStock) {
                $unit = $item['item_type'] === 'seed' ? 'kg' : 'units';
                throw new Exception("Insufficient stock. Only " . $currentStock . " " . $unit . " are available.");
            }
            
            $newQuantity = $currentStock - $qty;
            if ($newQuantity < 0) {
                $newQuantity = 0;
            }
            $newStatus = ($newQuantity == 0) ? 'out_of_stock' : ($newQuantity <= $invItem['threshold'] ? 'low_stock' : 'available');
            
            $validatedItems[] = [
                'item_type' => $item['item_type'],
                'item_id' => (int)$item['item_id'],
                'quantity' => $qty,
                'table' => $table,
                'new_quantity' => $newQuantity,
                'new_status' => $newStatus,
            ];
        }
        
        $totalItems = 0;
        foreach ($validatedItems as $vi) {
            $totalItems += $vi['quantity'];
        }
        
        $distStmt = $db->prepare("
            INSERT INTO distributions (farmer_id, distribution_date, season, notes, total_items, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $distStmt->execute([
            $input['farmer_id'],
            $input['distribution_date'] ?? date('Y-m-d'),
            $input['season'] ?? '',
            $input['notes'] ?? '',
            $totalItems,
            $user['id']
        ]);
        $distributionId = $db->lastInsertId();
        
        foreach ($validatedItems as $vi) {
            $itemStmt = $db->prepare("
                INSERT INTO distribution_items (distribution_id, item_type, item_id, quantity)
                VALUES (?, ?, ?, ?)
            ");
            $itemStmt->execute([$distributionId, $vi['item_type'], $vi['item_id'], $vi['quantity']]);
            
            $updateStmt = $db->prepare("UPDATE " . $vi['table'] . " SET quantity = ?, status = ? WHERE id = ?");
            $updateStmt->execute([$vi['new_quantity'], $vi['new_status'], $vi['item_id']]);
            
            if ($updateStmt->rowCount() === 0) {
                throw new Exception("Failed to update inventory for " . $vi['item_type'] . " ID " . $vi['item_id'] . ". Distribution cancelled.");
            }
            
            $logStmt = $db->prepare("
                INSERT INTO stock_history (item_type, item_id, quantity_change, change_type, reference_id, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $logStmt->execute([
                $vi['item_type'],
                $vi['item_id'],
                -$vi['quantity'],
                'distribution',
                $distributionId,
                'Distribution to farmer ID: ' . $input['farmer_id']
            ]);
        }
        
        $db->commit();
        
        jsonResponse([
            'success' => true,
            'message' => 'Distribution created successfully',
            'id' => $distributionId,
            'api_version' => 'v3'
        ]);
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        jsonResponse(['error' => $e->getMessage()], 400);
    }
}

function updateDistribution($id) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $fields = ['distribution_date', 'season', 'notes', 'status'];
    $setParts = [];
    $values = [];
    
    foreach ($fields as $field) {
        if (isset($input[$field])) {
            $setParts[] = "$field = ?";
            $values[] = sanitize($input[$field]);
        }
    }
    
    if (empty($setParts)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }
    
    $values[] = $id;
    
    try {
        $stmt = getDB()->prepare("UPDATE distributions SET " . implode(', ', $setParts) . " WHERE id = ?");
        $stmt->execute($values);
        
        jsonResponse(['success' => true, 'message' => 'Distribution updated successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update distribution'], 500);
    }
}

function deleteDistribution($id) {
    requireAuth();
    
    $db = getDB();
    
    try {
        $db->beginTransaction();
        
        // Get distribution items to restore inventory
        $itemsStmt = $db->prepare("SELECT * FROM distribution_items WHERE distribution_id = ?");
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll();
        
        foreach ($items as $item) {
            $table = $item['item_type'] === 'seed' ? 'seeds_inventory' : 'equipment_inventory';
            
            $invStmt = $db->prepare("SELECT quantity, threshold FROM " . $table . " WHERE id = ? FOR UPDATE");
            $invStmt->execute([$item['item_id']]);
            $invItem = $invStmt->fetch();
            
            $newQuantity = (float)$invItem['quantity'] + (float)$item['quantity'];
            if ($newQuantity < 0) {
                $newQuantity = 0;
            }
            $status = ($newQuantity == 0) ? 'out_of_stock' : ($newQuantity <= $invItem['threshold'] ? 'low_stock' : 'available');
            
            $updateStmt = $db->prepare("UPDATE " . $table . " SET quantity = ?, status = ? WHERE id = ?");
            $updateStmt->execute([$newQuantity, $status, $item['item_id']]);
            
            // Log stock restoration
            $logStmt = $db->prepare("
                INSERT INTO stock_history (item_type, item_id, quantity_change, change_type, reference_id, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $logStmt->execute([
                $item['item_type'],
                $item['item_id'],
                $item['quantity'],
                'adjustment',
                $id,
                'Distribution cancelled - stock restored'
            ]);
        }
        
        // Delete distribution (items will be cascade deleted)
        $stmt = $db->prepare("DELETE FROM distributions WHERE id = ?");
        $stmt->execute([$id]);
        
        $db->commit();
        
        jsonResponse(['success' => true, 'message' => 'Distribution deleted successfully']);
    } catch (PDOException $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Failed to delete distribution'], 500);
    }
}

function getDistributionsByYear() {
    $year = isset($_GET['year']) && $_GET['year'] !== 'all' && $_GET['year'] !== '' ? (int)$_GET['year'] : null;
    $search = $_GET['q'] ?? '';
    $seedFilter = $_GET['seed_filter'] ?? $_GET['item'] ?? '';
    
    $where = [];
    $params = [];
    
    if ($year) {
        $where[] = "YEAR(d.distribution_date) = ?";
        $params[] = $year;
    }
    if ($search) {
        $searchTerm = '%' . sanitize($search) . '%';
        $where[] = "(f.name LIKE ? OR f.rsbsa_number LIKE ? OR f.barangay LIKE ? OR d.notes LIKE ?)";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    
    $stmt = getDB()->prepare("
        SELECT d.*, 
               f.name as farmer_name, f.last_name, f.first_name, f.middle_name, f.extension,
               f.sex, f.birthdate, f.phone as farmer_phone, f.phone, f.address,
               f.rsbsa_number, f.barangay, f.municipality, f.province, f.crop_type,
               f.farm_size, f.farm_size_unit,
               IFNULL(NULLIF((SELECT SUM(size) FROM farms WHERE farmer_id = f.id), 0), IFNULL(f.farm_size, 0)) as calculated_farm_size,
               u.full_name as created_by_name
        FROM distributions d
        LEFT JOIN farmers f ON d.farmer_id = f.id
        LEFT JOIN users u ON d.created_by = u.id
        $whereClause
        ORDER BY d.distribution_date DESC, d.id DESC
    ");
    $stmt->execute($params);
    $distributions = $stmt->fetchAll();
    
    $allSeedTypesFound = [];

    foreach ($distributions as $key => &$dist) {
        $calcSize = floatval($dist['calculated_farm_size'] ?? 0);
        $directSize = floatval($dist['farm_size'] ?? 0);
        $dist['farm_size'] = $calcSize > 0 ? $calcSize : $directSize;

        $itemsStmt = getDB()->prepare("
            SELECT di.*, 
                si.crop_type as seed_crop_type,
                si.variety as seed_variety,
                si.unit as seed_unit,
                ei.name as equip_name,
                ei.category as equip_category
            FROM distribution_items di
            LEFT JOIN seeds_inventory si ON di.item_type = 'seed' AND di.item_id = si.id
            LEFT JOIN equipment_inventory ei ON di.item_type = 'equipment' AND di.item_id = ei.id
            WHERE di.distribution_id = ?
        ");
        $itemsStmt->execute([$dist['id']]);
        $items = $itemsStmt->fetchAll();
        
        $seedsList = [];
        $equipList = [];
        $hasMatchingSeed = empty($seedFilter);

        foreach ($items as &$item) {
            if ($item['item_type'] === 'seed' || !empty($item['seed_crop_type'])) {
                $unit = $item['seed_unit'] ?: 'kg';
                $cropType = trim($item['seed_crop_type'] ?? '');
                $variety = trim($item['seed_variety'] ?? '');
                
                $name = $cropType ?: 'Seed';
                if (!empty($variety)) {
                    $name .= ' (' . $variety . ')';
                }

                // If crop type has parenthesized part (e.g. "Vegetable (Sitaw)"), extract clean parts
                $cleanCrop = $cropType;
                $cleanVar = $variety;
                if (!empty($cleanCrop) && strpos($cleanCrop, '(') !== false) {
                    if (preg_match('/^([^\(]+)\s*\((.+)\)$/', $cleanCrop, $matches)) {
                        $cleanCrop = trim($matches[1]);
                        if (empty($cleanVar)) {
                            $cleanVar = trim($matches[2]);
                        }
                    }
                }

                if (!empty($cleanCrop) && !in_array($cleanCrop, $allSeedTypesFound, true)) {
                    $allSeedTypesFound[] = $cleanCrop;
                }
                if (!empty($cleanVar) && !in_array($cleanVar, $allSeedTypesFound, true)) {
                    $allSeedTypesFound[] = $cleanVar;
                }

                $seedsList[] = $name . ' - ' . $item['quantity'] . ' ' . $unit;

                if (!empty($seedFilter)) {
                    if (strcasecmp($seedFilter, 'equipment') === 0 || strcasecmp($seedFilter, 'all equipment') === 0) {
                        // filtering specifically for equipment items
                    } elseif (stripos($name, $seedFilter) !== false || stripos($cropType, $seedFilter) !== false || stripos($variety, $seedFilter) !== false) {
                        $hasMatchingSeed = true;
                    }
                }
            } else {
                $name = $item['equip_name'] ?: ($item['equip_category'] ?: 'Equipment');
                $cleanEquip = trim($name);
                if (!empty($cleanEquip) && !in_array($cleanEquip, $allSeedTypesFound, true)) {
                    $allSeedTypesFound[] = $cleanEquip;
                }
                $equipList[] = $name . ' - ' . $item['quantity'] . ' unit(s)';

                if (!empty($seedFilter)) {
                    if (strcasecmp($seedFilter, 'equipment') === 0 || strcasecmp($seedFilter, 'all equipment') === 0) {
                        $hasMatchingSeed = true;
                    } elseif (stripos($name, $seedFilter) !== false || stripos($item['equip_category'] ?? '', $seedFilter) !== false) {
                        $hasMatchingSeed = true;
                    }
                }
            }
        }

        $dist['items'] = $items;
        $dist['seeds_summary'] = implode(', ', $seedsList);
        $dist['equip_summary'] = implode(', ', $equipList);

        if (!$hasMatchingSeed) {
            unset($distributions[$key]);
        }
    }
    
    $distributions = array_values($distributions);

    // Get list of all distinct years available
    $yearsStmt = getDB()->query("
        SELECT DISTINCT YEAR(distribution_date) as year 
        FROM distributions 
        WHERE distribution_date IS NOT NULL AND distribution_date != '0000-00-00'
        ORDER BY year DESC
    ");
    $availableYears = $yearsStmt->fetchAll(PDO::FETCH_COLUMN);
    $currentYear = (int)date('Y');
    if (!in_array($currentYear, $availableYears)) {
        array_unshift($availableYears, $currentYear);
    }

    sort($allSeedTypesFound);
    
    jsonResponse([
        'success' => true,
        'selected_year' => $year,
        'available_years' => array_values($availableYears),
        'available_seed_types' => array_values($allSeedTypesFound),
        'data' => $distributions
    ]);
}