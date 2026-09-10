<?php
error_log("Auth.php called - " . date('Y-m-d H:i:s'));
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    login();
} elseif ($method === 'POST' && $action === 'register') {
    register();
} elseif ($method === 'POST' && $action === 'change_password') {
    changePassword();
} elseif ($method === 'POST' && $action === 'logout') {
    logout();
} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}

function getClientIP() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

function logLoginAttempt($userId, $username, $fullName, $role, $status, $reason = null) {
    try {
        $ip = getClientIP();
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $stmt = getDB()->prepare("INSERT INTO login_logs (user_id, username, full_name, role, ip_address, user_agent, status, failure_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $username, $fullName, $role, $ip, $ua, $status, $reason]);
    } catch (Exception $e) {
        // silent fail so login flow is never blocked
        error_log("Failed to write login log: " . $e->getMessage());
    }
}

function login() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['username']) || !isset($input['password'])) {
        jsonResponse(['error' => 'Username and password required'], 400);
    }
    
    $usernameOrEmail = sanitize(trim($input['username']));
    $password = $input['password'];
    
    $stmt = getDB()->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$usernameOrEmail, $usernameOrEmail]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password'])) {
        logLoginAttempt($user['id'] ?? null, $usernameOrEmail, $user['full_name'] ?? null, $user['role'] ?? null, 'failed', 'Invalid username or password');
        jsonResponse(['error' => 'Invalid username or password'], 401);
    }
    
    // Check if account is active
    if (isset($user['status']) && $user['status'] === 'inactive') {
        logLoginAttempt($user['id'], $user['username'], $user['full_name'], $user['role'], 'failed', 'Account is deactivated');
        jsonResponse(['error' => 'Your account has been deactivated. Please contact the administrator.'], 403);
    }
    
    // Update last_login timestamp
    try {
        $upd = getDB()->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $upd->execute([$user['id']]);
    } catch (Exception $e) {
        // silent fail
    }
    
    // Log successful login
    logLoginAttempt($user['id'], $user['username'], $user['full_name'], $user['role'], 'success');
    
    // Generate HMAC-SHA256 cryptographically signed token
    $token = generateAuthToken($user);
    
    jsonResponse([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'email' => $user['email'] ?? '',
            'avatar' => $user['avatar'] ?? null,
            'role' => $user['role'],
            'status' => $user['status'] ?? 'active',
            'last_login' => date('Y-m-d H:i:s')
        ]
    ]);
}

function register() {
    // Administrators and Staff can create new user accounts
    $currentUser = requireAdminOrStaff();
    
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
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Please provide a valid email address'], 400);
    }
    
    if (strlen($input['password']) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters long'], 400);
    }
    
    $password = password_hash($input['password'], PASSWORD_DEFAULT);
    $role = isset($input['role']) && in_array($input['role'], ['admin', 'staff', 'farmer']) ? $input['role'] : 'staff';
    $status = isset($input['status']) && in_array($input['status'], ['active', 'inactive']) ? $input['status'] : 'active';
    
    try {
        // Check for duplicate email
        $chkEmail = getDB()->prepare("SELECT id FROM users WHERE email = ?");
        $chkEmail->execute([$email]);
        if ($chkEmail->fetch()) {
            jsonResponse(['error' => "Email '$email' is already in use by another account."], 400);
        }
        
        $stmt = getDB()->prepare("INSERT INTO users (username, password, full_name, email, role, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $password, $fullName, $email, $role, $status]);
        $newId = getDB()->lastInsertId();
        
        jsonResponse([
            'success' => true,
            'message' => 'User account created successfully',
            'user' => [
                'id' => (int)$newId,
                'username' => $username,
                'full_name' => $fullName,
                'email' => $email,
                'avatar' => null,
                'role' => $role,
                'status' => $status
            ]
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000 || strpos($e->getMessage(), 'Duplicate') !== false) {
            jsonResponse(['error' => 'Username already exists. Please choose a different username.'], 400);
        }
        jsonResponse(['error' => 'Failed to create user account: ' . $e->getMessage()], 400);
    }
}

function logout() {
    jsonResponse(['success' => true, 'message' => 'Logged out successfully']);
}

function changePassword() {
    $authUser = requireAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['new_password']) || empty($input['new_password'])) {
        jsonResponse(['error' => 'New password is required'], 400);
    }
    
    if (strlen($input['new_password']) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters long'], 400);
    }
    
    $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : $authUser['id'];
    
    // Non-admin can only change their own password
    if ($authUser['role'] !== 'admin' && $targetUserId !== $authUser['id']) {
        jsonResponse(['error' => 'Forbidden: You can only change your own password'], 403);
    }
    
    $newPassword = password_hash($input['new_password'], PASSWORD_DEFAULT);
    
    try {
        $stmt = getDB()->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$newPassword, $targetUserId]);
        
        jsonResponse(['success' => true, 'message' => 'Password updated successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update password'], 400);
    }
}