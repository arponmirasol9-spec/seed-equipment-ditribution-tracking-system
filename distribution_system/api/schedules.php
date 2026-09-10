
<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'list' || $action === '') {
            getSchedules();
        } elseif ($action === 'single' && isset($_GET['id'])) {
            getSchedule($_GET['id']);
        } elseif ($action === 'search' && isset($_GET['q'])) {
            searchSchedules($_GET['q']);
        } elseif ($action === 'upcoming') {
            getUpcomingSchedules();
        } elseif ($action === 'calendar') {
            getCalendarData();
        } elseif ($action === 'stats') {
            getScheduleStats();
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createSchedule();
        } elseif ($action === 'update' && isset($_GET['id'])) {
            updateSchedule($_GET['id']);
        } elseif ($action === 'delete' && isset($_GET['id'])) {
            deleteSchedule($_GET['id']);
        } elseif ($action === 'complete' && isset($_GET['id'])) {
            completeSchedule($_GET['id']);
        } elseif ($action === 'cancel' && isset($_GET['id'])) {
            cancelSchedule($_GET['id']);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getSchedules() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = ($page - 1) * $limit;
    $status = $_GET['status'] ?? '';
    $search = $_GET['search'] ?? '';
    $sort = $_GET['sort'] ?? 'asc';
    
    $order = strtolower($sort) === 'desc' ? 'DESC' : 'ASC';
    
    $where = "1=1";
    $params = [];
    
    if ($status) {
        $statusVal = sanitize($status);
        $where .= " AND status = '$statusVal'";
    }
    
    if ($search) {
        $searchTerm = "%" . sanitize($search) . "%";
        $where .= " AND (title LIKE '$searchTerm' OR location LIKE '$searchTerm' OR assigned_staff LIKE '$searchTerm')";
    }
    
    $stmt = getDB()->query("
        SELECT * FROM schedules 
        WHERE " . $where . "
        ORDER BY schedule_date $order, schedule_time $order
        LIMIT " . (int)$limit . " OFFSET " . (int)$offset
    );
    $schedules = $stmt->fetchAll();
    
    $countStmt = getDB()->query("SELECT COUNT(*) as total FROM schedules WHERE " . $where);
    $total = $countStmt->fetch()['total'];
    
    jsonResponse([
        'success' => true,
        'data' => $schedules,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

function getSchedule($id) {
    $stmt = getDB()->prepare("SELECT * FROM schedules WHERE id = ?");
    $stmt->execute([$id]);
    $schedule = $stmt->fetch();
    
    if (!$schedule) {
        jsonResponse(['error' => 'Schedule not found'], 404);
    }
    
    jsonResponse(['success' => true, 'data' => $schedule]);
}

function searchSchedules($query) {
    $search = '%' . sanitize($query) . '%';
    $sort = $_GET['sort'] ?? 'asc';
    $order = strtolower($sort) === 'desc' ? 'DESC' : 'ASC';
    
    $stmt = getDB()->prepare("
        SELECT * FROM schedules 
        WHERE title LIKE ? OR location LIKE ? OR assigned_staff LIKE ?
        ORDER BY schedule_date $order, schedule_time $order
        LIMIT 50
    ");
    $stmt->execute([$search, $search, $search]);
    $schedules = $stmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data' => $schedules,
        'pagination' => [
            'page' => 1,
            'limit' => 50,
            'total' => count($schedules),
            'pages' => 1
        ]
    ]);
}

function getUpcomingSchedules() {
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
    $date = date('Y-m-d');
    $endDate = date('Y-m-d', strtotime("+$days days"));
    $sort = $_GET['sort'] ?? 'asc';
    $order = strtolower($sort) === 'desc' ? 'DESC' : 'ASC';
    
    $stmt = getDB()->prepare("
        SELECT * FROM schedules 
        WHERE schedule_date BETWEEN ? AND ?
        AND status = 'scheduled'
        ORDER BY schedule_date $order, schedule_time $order
    ");
    $stmt->execute([$date, $endDate]);
    
    jsonResponse([
        'success' => true,
        'data' => $stmt->fetchAll()
    ]);
}

function getCalendarData() {
    $year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');
    $month = isset($_GET['month']) ? (int)$_GET['month'] : date('n');
    $sort = $_GET['sort'] ?? 'asc';
    $order = strtolower($sort) === 'desc' ? 'DESC' : 'ASC';
    
    $startDate = sprintf('%04d-%02d-01', $year, $month);
    $endDate = sprintf('%04d-%02d-31', $year, $month);
    
    $stmt = getDB()->prepare("
        SELECT id, title, schedule_date, schedule_time, location, status
        FROM schedules
        WHERE schedule_date BETWEEN ? AND ?
        ORDER BY schedule_date $order, schedule_time $order
    ");
    $stmt->execute([$startDate, $endDate]);
    
    $schedules = $stmt->fetchAll();
    
    // Group by date
    $calendar = [];
    foreach ($schedules as $schedule) {
        $date = $schedule['schedule_date'];
        if (!isset($calendar[$date])) {
            $calendar[$date] = [];
        }
        $calendar[$date][] = $schedule;
    }
    
    jsonResponse([
        'success' => true,
        'data' => $calendar,
        'year' => $year,
        'month' => $month
    ]);
}

function getScheduleStats() {
    $stmt = getDB()->query("
        SELECT 
            COUNT(*) as total_schedules,
            SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM schedules
    ");
    $stats = $stmt->fetch();
    
    // Upcoming this week
    $weekStmt = getDB()->query("
        SELECT COUNT(*) as count FROM schedules 
        WHERE schedule_date >= CURDATE() 
        AND schedule_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND status = 'scheduled'
    ");
    $upcomingWeek = $weekStmt->fetch()['count'];
    
    // Overdue
    $overdueStmt = getDB()->query("
        SELECT COUNT(*) as count FROM schedules 
        WHERE schedule_date < CURDATE() 
        AND status = 'scheduled'
    ");
    $overdue = $overdueStmt->fetch()['count'];
    
    jsonResponse([
        'success' => true,
        'data' => [
            'total' => $stats,
            'upcoming_week' => $upcomingWeek,
            'overdue' => $overdue
        ]
    ]);
}

function createSchedule() {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['title']) || !isset($input['schedule_date'])) {
        jsonResponse(['error' => 'Title and schedule date are required'], 400);
    }
    
    try {
        $stmt = getDB()->prepare("
            INSERT INTO schedules (title, schedule_date, schedule_time, location, assigned_staff, description, item_details, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            sanitize($input['title']),
            $input['schedule_date'],
            $input['schedule_time'] ?? null,
            sanitize($input['location'] ?? ''),
            sanitize($input['assigned_staff'] ?? ''),
            sanitize($input['description'] ?? ''),
            sanitize($input['item_details'] ?? ''),
            $input['status'] ?? 'scheduled'
        ]);
        
        $id = getDB()->lastInsertId();
        
        // Check if reminder should be sent
        $scheduleDate = new DateTime($input['schedule_date']);
        $reminderDate = new DateTime();
        $reminderDate->modify('+1 day');
        
        if ($scheduleDate > $reminderDate) {
            // Schedule is more than 1 day away - queue reminder
            $reminderStmt = getDB()->prepare("
                INSERT INTO sync_queue (operation, table_name, record_id, data_json)
                VALUES ('REMINDER', 'schedules', ?, ?)
            ");
            $reminderStmt->execute([$id, json_encode(['schedule_id' => $id, 'reminder_type' => 'upcoming'])]);
        }
        
        jsonResponse(['success' => true, 'message' => 'Schedule created successfully', 'id' => $id]);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to create schedule'], 500);
    }
}

function updateSchedule($id) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $fields = ['title', 'schedule_date', 'schedule_time', 'location', 'assigned_staff', 'description', 'item_details', 'status'];
    $setParts = [];
    $values = [];
    
    foreach ($fields as $field) {
        if (isset($input[$field])) {
            $setParts[] = "$field = ?";
            $values[] = in_array($field, ['title', 'location', 'assigned_staff', 'description', 'item_details']) 
                ? sanitize($input[$field]) 
                : $input[$field];
        }
    }
    
    if (empty($setParts)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }
    
    $values[] = $id;
    
    try {
        $stmt = getDB()->prepare("UPDATE schedules SET " . implode(', ', $setParts) . " WHERE id = ?");
        $stmt->execute($values);
        
        jsonResponse(['success' => true, 'message' => 'Schedule updated successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to update schedule'], 500);
    }
}

function deleteSchedule($id) {
    requireAuth();
    
    try {
        $stmt = getDB()->prepare("DELETE FROM schedules WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['success' => true, 'message' => 'Schedule deleted successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to delete schedule'], 500);
    }
}

function completeSchedule($id) {
    requireAuth();
    
    try {
        $stmt = getDB()->prepare("UPDATE schedules SET status = 'completed' WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['success' => true, 'message' => 'Schedule marked as completed']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to complete schedule'], 500);
    }
}

function cancelSchedule($id) {
    requireAuth();
    
    try {
        $stmt = getDB()->prepare("UPDATE schedules SET status = 'cancelled' WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['success' => true, 'message' => 'Schedule cancelled successfully']);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to cancel schedule'], 500);
    }
}