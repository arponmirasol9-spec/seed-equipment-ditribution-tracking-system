<?php
if (function_exists('opcache_reset')) { @opcache_reset(); }
if (function_exists('opcache_invalidate')) { @opcache_invalidate(__DIR__ . '/config.php'); @opcache_invalidate(__DIR__ . '/distributions.php'); @opcache_invalidate(__DIR__ . '/inventory.php'); @opcache_invalidate(__DIR__ . '/sync.php'); }

error_reporting(E_ERROR | E_WARNING);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'distribution_system');
define('DB_USER', 'root');
define('DB_PASS', '');

// Security Configuration
define('AUTH_SECRET', 'd9a8f2e1c3b4a567890ef123456789abcdef38472910');

// Set Security & CORS Headers for Cross-Network Access
if (!headers_sent()) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

// Respond early to preflight OPTIONS requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

function getDB() {
    global $pdo;
    return $pdo;
}

function jsonResponse($data, $status = 200) {
    while (ob_get_level()) ob_end_clean();
    http_response_code($status);
    header('Content-Type: application/json');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    echo json_encode($data);
    exit;
}

function sanitize($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = sanitize($value);
        }
        return $data;
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

function generateAuthToken($user) {
    $payload = $user['id'] . ':' . $user['role'] . ':' . time();
    $sig = hash_hmac('sha256', $payload, AUTH_SECRET);
    return base64_encode($payload . ':' . $sig);
}

function verifyToken() {
    $token = '';
    
    // Check various header formats
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    if (empty($token) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    if (empty($token)) {
        $token = $_GET['token'] ?? '';
    }
    
    if (empty($token)) {
        return null;
    }
    
    $token = trim(str_replace('Bearer ', '', $token));
    $decoded = base64_decode($token);
    if (!$decoded) return null;
    
    $parts = explode(':', $decoded);
    
    // Cryptographic Signed token: id:role:timestamp:signature
    if (count($parts) === 4) {
        list($id, $role, $timestamp, $signature) = $parts;
        $expectedSig = hash_hmac('sha256', "$id:$role:$timestamp", AUTH_SECRET);
        if (!hash_equals($expectedSig, $signature)) {
            return null; // Token signature invalid (tampered or forged)
        }
        return ['id' => (int)$id, 'role' => $role];
    }
    
    // Fallback for legacy tokens
    if (count($parts) === 2) {
        return ['id' => (int)$parts[0], 'role' => $parts[1]];
    }
    
    return null;
}

function requireAuth() {
    $user = verifyToken();
    if (!$user) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    return $user;
}

function requireAdmin() {
    $user = requireAuth();
    if ($user['role'] !== 'admin' && $user['role'] !== 'staff') {
        jsonResponse(['error' => 'Admin access required'], 403);
    }
    return $user;
}

function requireAdminOrStaff() {
    $user = requireAuth();
    if ($user['role'] !== 'admin' && $user['role'] !== 'staff') {
        jsonResponse(['error' => 'Admin or Staff access required'], 403);
    }
    return $user;
}

function clampNegativeInventory() {
    try {
        $db = getDB();
        $db->exec("UPDATE seeds_inventory SET quantity = 0, status = 'out_of_stock' WHERE quantity < 0");
        $db->exec("UPDATE equipment_inventory SET quantity = 0, status = 'out_of_stock' WHERE quantity < 0");
        $db->exec("UPDATE seeds_inventory SET status = 'available' WHERE quantity > 0 AND status = 'out_of_stock'");
        $db->exec("UPDATE equipment_inventory SET status = 'available' WHERE quantity > 0 AND status = 'out_of_stock'");
    } catch (Exception $e) {
        // silent
    }
}

function mergeDuplicateInventory() {
    try {
        $db = getDB();
        
        // Merge Duplicate Seeds
        $stmtSeeds = $db->query("
            SELECT LOWER(TRIM(crop_type)) as ct, LOWER(TRIM(variety)) as var, COUNT(*) as cnt 
            FROM seeds_inventory 
            GROUP BY LOWER(TRIM(crop_type)), LOWER(TRIM(variety)) 
            HAVING cnt > 1
        ");
        $duplicateSeedGroups = $stmtSeeds->fetchAll();
        
        foreach ($duplicateSeedGroups as $group) {
            $stmtGroup = $db->prepare("
                SELECT * FROM seeds_inventory 
                WHERE LOWER(TRIM(crop_type)) = ? AND LOWER(TRIM(variety)) = ? 
                ORDER BY quantity DESC, id ASC
            ");
            $stmtGroup->execute([$group['ct'], $group['var']]);
            $items = $stmtGroup->fetchAll();
            
            if (count($items) < 2) continue;
            
            $primary = $items[0];
            $primaryId = $primary['id'];
            $totalQuantity = 0;
            
            foreach ($items as $item) {
                $totalQuantity += floatval($item['quantity']);
            }
            
            for ($i = 1; $i < count($items); $i++) {
                $dupId = $items[$i]['id'];
                
                $updDist = $db->prepare("UPDATE distribution_items SET item_id = ? WHERE item_type = 'seed' AND item_id = ?");
                $updDist->execute([$primaryId, $dupId]);
                
                $updHist = $db->prepare("UPDATE stock_history SET item_id = ? WHERE item_type = 'seed' AND item_id = ?");
                $updHist->execute([$primaryId, $dupId]);
                
                $delStmt = $db->prepare("DELETE FROM seeds_inventory WHERE id = ?");
                $delStmt->execute([$dupId]);
            }
            
            $threshold = floatval($primary['threshold'] ?? 10);
            $status = ($totalQuantity <= 0) ? 'out_of_stock' : (($totalQuantity <= $threshold) ? 'low_stock' : 'available');
            
            $updPrimary = $db->prepare("UPDATE seeds_inventory SET quantity = ?, status = ? WHERE id = ?");
            $updPrimary->execute([$totalQuantity, $status, $primaryId]);
        }
        
        // Merge Duplicate Equipment
        $stmtEquip = $db->query("
            SELECT LOWER(TRIM(name)) as name_lower, COUNT(*) as cnt 
            FROM equipment_inventory 
            GROUP BY LOWER(TRIM(name)) 
            HAVING cnt > 1
        ");
        $duplicateEquipGroups = $stmtEquip->fetchAll();
        
        foreach ($duplicateEquipGroups as $group) {
            $stmtGroup = $db->prepare("
                SELECT * FROM equipment_inventory 
                WHERE LOWER(TRIM(name)) = ? 
                ORDER BY quantity DESC, id ASC
            ");
            $stmtGroup->execute([$group['name_lower']]);
            $items = $stmtGroup->fetchAll();
            
            if (count($items) < 2) continue;
            
            $primary = $items[0];
            $primaryId = $primary['id'];
            $totalQuantity = 0;
            
            foreach ($items as $item) {
                $totalQuantity += floatval($item['quantity']);
            }
            
            for ($i = 1; $i < count($items); $i++) {
                $dupId = $items[$i]['id'];
                
                $updDist = $db->prepare("UPDATE distribution_items SET item_id = ? WHERE item_type = 'equipment' AND item_id = ?");
                $updDist->execute([$primaryId, $dupId]);
                
                $updHist = $db->prepare("UPDATE stock_history SET item_id = ? WHERE item_type = 'equipment' AND item_id = ?");
                $updHist->execute([$primaryId, $dupId]);
                
                $delStmt = $db->prepare("DELETE FROM equipment_inventory WHERE id = ?");
                $delStmt->execute([$dupId]);
            }
            
            $threshold = floatval($primary['threshold'] ?? 5);
            $status = ($totalQuantity <= 0) ? 'out_of_stock' : (($totalQuantity <= $threshold) ? 'low_stock' : 'available');
            
            $updPrimary = $db->prepare("UPDATE equipment_inventory SET quantity = ?, status = ? WHERE id = ?");
            $updPrimary->execute([$totalQuantity, $status, $primaryId]);
        }
    } catch (Exception $e) {
        // silent fail
    }
}

function ensureUserTablesAndColumns() {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $db = getDB();
        // Create login_logs table if not exists
        $db->exec("CREATE TABLE IF NOT EXISTS login_logs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NULL,
            username VARCHAR(50) NOT NULL,
            full_name VARCHAR(100) NULL,
            role VARCHAR(50) NULL,
            ip_address VARCHAR(50) NULL,
            user_agent TEXT NULL,
            status ENUM('success', 'failed') DEFAULT 'success',
            failure_reason VARCHAR(255) NULL,
            login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (user_id),
            INDEX (login_time)
        )");

        // Check if email column exists in users table
        $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'email'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE users ADD COLUMN email VARCHAR(150) NULL AFTER full_name");
        }

        // Check if avatar column exists in users table
        $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'avatar'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL AFTER email");
        }

        // Check if status column exists in users table
        $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'status'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER role");
        }

        // Check if last_login column exists in users table
        $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'last_login'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE users ADD COLUMN last_login DATETIME NULL AFTER status");
        }
    } catch (Exception $e) {
        // silent fail
    }
}

clampNegativeInventory();
mergeDuplicateInventory();
ensureUserTablesAndColumns();