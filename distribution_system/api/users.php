<?php
error_log("Users.php called - " . date('Y-m-d H:i:s'));
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        getUsers();
        break;
    case 'single':
        getUser();
        break;
    case 'create':
        if ($method === 'POST') createUser();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'update':
        if ($method === 'POST') updateUser();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'update_profile':
        if ($method === 'POST') updateProfile();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'toggle_status':
        if ($method === 'POST') toggleUserStatus();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'delete':
        if ($method === 'POST' || $method === 'DELETE') deleteUser();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'delete_unused':
        if ($method === 'POST' || $method === 'DELETE') deleteUnusedUsers();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'change_password':
        if ($method === 'POST') changeUserPassword();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'make_admin':
        if ($method === 'POST') makeAdmin();
        else jsonResponse(['error' => 'Method not allowed'], 405);
        break;
    case 'login_logs':
        getLoginLogs();
        break;
    case 'stats':
        getUserStats();
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function getUsers() {
    $authUser = requireAuth();
    $db = getDB();
    
    $role = $_GET['role'] ?? '';
    $status = $_GET['status'] ?? '';
    $search = $_GET['q'] ?? '';
    
    $sql = "SELECT id, username, full_name, email, avatar, role, status, last_login, created_at, updated_at FROM users WHERE 1=1";
    $params = [];
    
    if (!empty($role)) {
        $sql .= " AND role = ?";
        $params[] = $role;
    }
    
    if (!empty($status)) {
        if ($status === 'unused') {
            $sql .= " AND (last_login IS NULL OR last_login = '' OR last_login = '0000-00-00 00:00:00')";
        } else {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
    }
    
    if (!empty($search)) {
        $sql .= " AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $sql .= " ORDER BY id ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();
    
    // Normalize status and last_login if null
    foreach ($users as &$u) {
        if (!isset($u['status']) || empty($u['status'])) {
            $u['status'] = 'active';
        }
        $u['is_unused'] = empty($u['last_login']) || $u['last_login'] === '0000-00-00 00:00:00';
    }
    
    jsonResponse(['success' => true, 'data' => $users, 'total' => count($users)]);
}

function getUser() {
    $authUser = requireAuth();
    $id = (int)($_GET['id'] ?? 0);
    
    if (!$id) {
        jsonResponse(['error' => 'Invalid user ID'], 400);
    }
    
    $stmt = getDB()->prepare("SELECT id, username, full_name, email, avatar, role, status, last_login, created_at, updated_at FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    $user['is_unused'] = empty($user['last_login']);
    jsonResponse(['success' => true, 'data' => $user]);
}

function createUser() {
    $authUser = requireAdminOrStaff();
    $input = json_decode(file_get_contents('php://input'), true);
    
    $required = ['username', 'password', 'full_name', 'email'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['error' => "Field '$field' is required"], 400);
        }
    }
    
    $username = sanitize(trim($input['username']));
    $fullName = sanitize(trim($input['full_name']));
    $email = sanitize(trim($input['email']));
    $avatar = isset($input['avatar']) && !empty($input['avatar']) ? $input['avatar'] : null;
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Please provide a valid email address'], 400);
    }
    
    // Neither user can be created directly as admin upon addition; users are created as staff or farmer, then explicitly promoted via 'Make Admin'
    $role = isset($input['role']) && in_array($input['role'], ['staff', 'farmer']) ? $input['role'] : 'staff';
    $status = isset($input['status']) && in_array($input['status'], ['active', 'inactive']) ? $input['status'] : 'active';
    
    if (strlen($input['password']) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters long'], 400);
    }
    
    $password = password_hash($input['password'], PASSWORD_DEFAULT);
    
    try {
        // Check for duplicate email
        $chkEmail = getDB()->prepare("SELECT id FROM users WHERE email = ?");
        $chkEmail->execute([$email]);
        if ($chkEmail->fetch()) {
            jsonResponse(['error' => "Email '$email' is already registered to an account."], 400);
        }
        
        $stmt = getDB()->prepare("INSERT INTO users (username, password, full_name, email, avatar, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $password, $fullName, $email, $avatar, $role, $status]);
        $newId = getDB()->lastInsertId();
        
        jsonResponse([
            'success' => true,
            'message' => 'User account created successfully',
            'data' => [
                'id' => (int)$newId,
                'username' => $username,
                'full_name' => $fullName,
                'email' => $email,
                'avatar' => $avatar,
                'role' => $role,
                'status' => $status,
                'is_unused' => true,
                'created_at' => date('Y-m-d H:i:s')
            ]
        ], 201);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000 || strpos($e->getMessage(), 'Duplicate') !== false) {
            jsonResponse(['error' => "Username '$username' already exists. Please choose a different username."], 400);
        }
        jsonResponse(['error' => 'Failed to create user: ' . $e->getMessage()], 400);
    }
}

function updateUser() {
    $authUser = requireAdminOrStaff();
    $id = (int)($_GET['id'] ?? 0);
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$id && isset($input['id'])) {
        $id = (int)$input['id'];
    }
    
    if (!$id) {
        jsonResponse(['error' => 'Invalid user ID'], 400);
    }
    
    $stmt = getDB()->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    $fullName = isset($input['full_name']) ? sanitize(trim($input['full_name'])) : $existing['full_name'];
    $role = isset($input['role']) && in_array($input['role'], ['admin', 'staff', 'farmer']) ? $input['role'] : $existing['role'];
    $status = isset($input['status']) && in_array($input['status'], ['active', 'inactive']) ? $input['status'] : ($existing['status'] ?? 'active');
    $email = isset($input['email']) ? sanitize(trim($input['email'])) : ($existing['email'] ?? null);
    $avatar = array_key_exists('avatar', $input) ? $input['avatar'] : ($existing['avatar'] ?? null);
    
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Please provide a valid email address'], 400);
    }
    
    if (!empty($email) && $email !== ($existing['email'] ?? '')) {
        $chkEmail = getDB()->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $chkEmail->execute([$email, $id]);
        if ($chkEmail->fetch()) {
            jsonResponse(['error' => "Email '$email' is already in use by another account."], 400);
        }
    }
    
    // Check if updating username
    $username = isset($input['username']) ? sanitize(trim($input['username'])) : $existing['username'];
    
    // Prevent current user from deactivating their own logged-in account
    if ($authUser['id'] === $id && $status === 'inactive') {
        jsonResponse(['error' => 'You cannot deactivate your own logged-in account'], 400);
    }
    
    try {
        $updateSql = "UPDATE users SET full_name = ?, email = ?, avatar = ?, role = ?, status = ?, username = ? WHERE id = ?";
        $stmt = getDB()->prepare($updateSql);
        $stmt->execute([$fullName, $email, $avatar, $role, $status, $username, $id]);
        
        // Optional password update if provided
        if (!empty($input['password'])) {
            if (strlen($input['password']) < 6) {
                jsonResponse(['error' => 'Password must be at least 6 characters long'], 400);
            }
            $hash = password_hash($input['password'], PASSWORD_DEFAULT);
            $pStmt = getDB()->prepare("UPDATE users SET password = ? WHERE id = ?");
            $pStmt->execute([$hash, $id]);
        }
        
        jsonResponse([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => [
                'id' => $id,
                'username' => $username,
                'full_name' => $fullName,
                'email' => $email,
                'avatar' => $avatar,
                'role' => $role,
                'status' => $status
            ]
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000 || strpos($e->getMessage(), 'Duplicate') !== false) {
            jsonResponse(['error' => "Username '$username' is already taken."], 400);
        }
        jsonResponse(['error' => 'Failed to update user: ' . $e->getMessage()], 400);
    }
}

function updateProfile() {
    $authUser = requireAuth();
    $id = (int)$authUser['id'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    $stmt = getDB()->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    $fullName = isset($input['full_name']) ? sanitize(trim($input['full_name'])) : $existing['full_name'];
    $email = isset($input['email']) ? sanitize(trim($input['email'])) : ($existing['email'] ?? '');
    $avatar = array_key_exists('avatar', $input) ? $input['avatar'] : ($existing['avatar'] ?? null);
    
    if (empty($fullName)) {
        jsonResponse(['error' => 'Full Name is required'], 400);
    }
    
    if (!empty($email)) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['error' => 'Please provide a valid email address'], 400);
        }
        $chkEmail = getDB()->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $chkEmail->execute([$email, $id]);
        if ($chkEmail->fetch()) {
            jsonResponse(['error' => "Email '$email' is already registered to another account."], 400);
        }
    }
    
    try {
        $upd = getDB()->prepare("UPDATE users SET full_name = ?, email = ?, avatar = ? WHERE id = ?");
        $upd->execute([$fullName, $email, $avatar, $id]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $id,
                'username' => $existing['username'],
                'full_name' => $fullName,
                'email' => $email,
                'avatar' => $avatar,
                'role' => $existing['role'],
                'status' => $existing['status'] ?? 'active',
                'last_login' => $existing['last_login'] ?? null
            ]
        ]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update profile: ' . $e->getMessage()], 400);
    }
}

function toggleUserStatus() {
    $authUser = requireAdminOrStaff();
    $id = (int)($_GET['id'] ?? 0);
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$id && isset($input['id'])) {
        $id = (int)$input['id'];
    }
    
    if (!$id) {
        jsonResponse(['error' => 'Invalid user ID'], 400);
    }
    
    if ($authUser['id'] === $id) {
        jsonResponse(['error' => 'You cannot deactivate your own logged-in account'], 400);
    }
    
    $stmt = getDB()->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    $currentStatus = $user['status'] ?? 'active';
    $newStatus = isset($input['status']) ? (in_array($input['status'], ['active', 'inactive']) ? $input['status'] : 'active') : ($currentStatus === 'active' ? 'inactive' : 'active');
    
    try {
        $upd = getDB()->prepare("UPDATE users SET status = ? WHERE id = ?");
        $upd->execute([$newStatus, $id]);
        
        jsonResponse([
            'success' => true,
            'message' => "User account is now " . ucfirst($newStatus),
            'status' => $newStatus
        ]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update user status: ' . $e->getMessage()], 400);
    }
}

function deleteUser() {
    $authUser = requireAdminOrStaff();
    $id = (int)($_GET['id'] ?? 0);
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$id && isset($input['id'])) {
        $id = (int)$input['id'];
    }
    
    if (!$id) {
        jsonResponse(['error' => 'Invalid user ID'], 400);
    }
    
    if ($authUser['id'] === $id) {
        jsonResponse(['error' => 'You cannot delete your own currently logged-in account'], 400);
    }
    
    try {
        // Optional: clean up login logs for this user ID
        getDB()->prepare("DELETE FROM login_logs WHERE user_id = ?")->execute([$id]);
        
        $stmt = getDB()->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['success' => true, 'message' => 'User account deleted successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to delete user: ' . $e->getMessage()], 400);
    }
}

function deleteUnusedUsers() {
    $authUser = requireAdminOrStaff();
    $db = getDB();
    
    try {
        // Find all users who never logged in (last_login is NULL or empty or '0000-00-00 00:00:00') and not the current user
        $stmt = $db->prepare("SELECT id, username FROM users WHERE (last_login IS NULL OR last_login = '' OR last_login = '0000-00-00 00:00:00') AND id != ?");
        $stmt->execute([$authUser['id']]);
        $unusedUsers = $stmt->fetchAll();
        
        if (empty($unusedUsers)) {
            jsonResponse(['success' => true, 'message' => 'No unused accounts found to delete', 'count' => 0]);
        }
        
        $deletedCount = 0;
        $delStmt = $db->prepare("DELETE FROM users WHERE id = ?");
        $logDelStmt = $db->prepare("DELETE FROM login_logs WHERE user_id = ?");
        
        foreach ($unusedUsers as $u) {
            $logDelStmt->execute([$u['id']]);
            $delStmt->execute([$u['id']]);
            $deletedCount++;
        }
        
        jsonResponse([
            'success' => true, 
            'message' => "Successfully deleted $deletedCount unused user account(s)",
            'count' => $deletedCount
        ]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to delete unused accounts: ' . $e->getMessage()], 400);
    }
}

function changeUserPassword() {
    $authUser = requireAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    
    $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : $authUser['id'];
    
    if (empty($input['new_password'])) {
        jsonResponse(['error' => 'New password is required'], 400);
    }
    
    if (strlen($input['new_password']) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters long'], 400);
    }
    
    $isManager = in_array($authUser['role'], ['admin', 'staff']);
    if (!$isManager && $targetUserId !== $authUser['id']) {
        jsonResponse(['error' => 'Forbidden: You can only change your own password'], 403);
    }
    
    $newHash = password_hash($input['new_password'], PASSWORD_DEFAULT);
    
    try {
        $stmt = getDB()->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$newHash, $targetUserId]);
        
        jsonResponse(['success' => true, 'message' => 'Password updated successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update password: ' . $e->getMessage()], 400);
    }
}

function makeAdmin() {
    $authUser = requireAdminOrStaff();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($_GET['id'] ?? $input['id'] ?? 0);
    
    if (!$id) {
        jsonResponse(['error' => 'Invalid user ID'], 400);
    }
    
    $stmt = getDB()->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Determine new role (default to 'admin' if setting admin, or toggle based on input)
    $targetRole = isset($input['role']) && in_array($input['role'], ['admin', 'staff', 'farmer']) ? $input['role'] : ($user['role'] === 'admin' ? 'staff' : 'admin');
    
    // Safety check: Prevent self-demotion from admin
    if ($authUser['id'] === $id && $targetRole !== 'admin') {
        jsonResponse(['error' => 'You cannot remove your own administrator privileges'], 400);
    }
    
    try {
        $upd = getDB()->prepare("UPDATE users SET role = ? WHERE id = ?");
        $upd->execute([$targetRole, $id]);
        
        $roleTitle = $targetRole === 'admin' ? 'Administrator' : ucfirst($targetRole);
        jsonResponse([
            'success' => true,
            'message' => "User @{$user['username']} is now an $roleTitle",
            'data' => [
                'id' => $id,
                'username' => $user['username'],
                'role' => $targetRole
            ]
        ]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update user role: ' . $e->getMessage()], 400);
    }
}

function getLoginLogs() {
    $authUser = requireAuth();
    $db = getDB();
    
    $status = $_GET['status'] ?? '';
    $search = $_GET['q'] ?? '';
    $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 200) : 50;
    $offset = isset($_GET['offset']) ? max((int)$_GET['offset'], 0) : 0;
    
    $sql = "SELECT id, user_id, username, full_name, role, ip_address, user_agent, status, failure_reason, login_time FROM login_logs WHERE 1=1";
    $params = [];
    
    if (!empty($status)) {
        $sql .= " AND status = ?";
        $params[] = $status;
    }
    
    if (!empty($search)) {
        $sql .= " AND (username LIKE ? OR full_name LIKE ? OR ip_address LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $sql .= " ORDER BY login_time DESC, id DESC LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();
    
    // Count total
    $countSql = "SELECT COUNT(*) as cnt FROM login_logs WHERE 1=1";
    $countParams = [];
    if (!empty($status)) {
        $countSql .= " AND status = ?";
        $countParams[] = $status;
    }
    if (!empty($search)) {
        $countSql .= " AND (username LIKE ? OR full_name LIKE ? OR ip_address LIKE ?)";
        $countParams[] = "%$search%";
        $countParams[] = "%$search%";
        $countParams[] = "%$search%";
    }
    $cStmt = $db->prepare($countSql);
    $cStmt->execute($countParams);
    $totalCount = $cStmt->fetch()['cnt'] ?? 0;
    
    jsonResponse([
        'success' => true,
        'data' => $logs,
        'total' => (int)$totalCount,
        'limit' => $limit,
        'offset' => $offset
    ]);
}

function getUserStats() {
    $authUser = requireAuth();
    $db = getDB();
    
    // Total users
    $total = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $active = (int)$db->query("SELECT COUNT(*) FROM users WHERE status = 'active' OR status IS NULL")->fetchColumn();
    $inactive = (int)$db->query("SELECT COUNT(*) FROM users WHERE status = 'inactive'")->fetchColumn();
    $admins = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    $staff = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'staff'")->fetchColumn();
    $unused = (int)$db->query("SELECT COUNT(*) FROM users WHERE last_login IS NULL OR last_login = '' OR last_login = '0000-00-00 00:00:00'")->fetchColumn();
    
    // Logins today
    $todayLogins = (int)$db->query("SELECT COUNT(*) FROM login_logs WHERE DATE(login_time) = CURDATE() AND status = 'success'")->fetchColumn();
    
    // Unique users logged in today
    $uniqueUsersToday = (int)$db->query("SELECT COUNT(DISTINCT username) FROM login_logs WHERE DATE(login_time) = CURDATE() AND status = 'success'")->fetchColumn();
    
    jsonResponse([
        'success' => true,
        'data' => [
            'total_users' => $total,
            'active_users' => $active,
            'inactive_users' => $inactive,
            'admin_count' => $admins,
            'staff_count' => $staff,
            'unused_count' => $unused,
            'today_logins' => $todayLogins,
            'unique_users_today' => $uniqueUsersToday
        ]
    ]);
}
