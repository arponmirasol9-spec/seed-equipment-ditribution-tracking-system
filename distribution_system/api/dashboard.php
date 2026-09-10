<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'stats' || $action === '') {
        getDashboardStats();
    } elseif ($action === 'activity') {
        getRecentActivity();
    } elseif ($action === 'alerts') {
        getAlerts();
    } elseif ($action === 'charts') {
        getChartsData();
    }
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

function getDashboardStats() {
    // Farmer stats
    $farmerStmt = getDB()->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
        FROM farmers
    ");
    $farmers = $farmerStmt->fetch();
    
    // Farm stats
    $farmStmt = getDB()->query("
        SELECT COUNT(*) as total
        FROM farms
    ");
    $farms = $farmStmt->fetch();
    
    // Inventory stats - Seeds
    $seedsStmt = getDB()->query("
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_quantity,
            SUM(CASE WHEN status = 'low_stock' THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
        FROM seeds_inventory
    ");
    $seeds = $seedsStmt->fetch();
    
    // Inventory stats - Equipment
    $equipStmt = getDB()->query("
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_quantity,
            SUM(CASE WHEN status = 'low_stock' THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN status = 'out_of_stock' THEN 1 ELSE 0 END) as out_of_stock
        FROM equipment_inventory
    ");
    $equipment = $equipStmt->fetch();
    
    // Distribution stats
    $distStmt = getDB()->query("
        SELECT 
            COUNT(*) as total,
            SUM(total_items) as total_items,
            COUNT(DISTINCT farmer_id) as farmers_served
        FROM distributions
        WHERE MONTH(distribution_date) = MONTH(CURRENT_DATE())
        AND YEAR(distribution_date) = YEAR(CURRENT_DATE())
    ");
    $distributions = $distStmt->fetch();
    
    // Schedule stats
    $schedStmt = getDB()->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'scheduled' AND schedule_date >= CURDATE() THEN 1 ELSE 0 END) as upcoming,
            SUM(CASE WHEN schedule_date < CURDATE() AND status = 'scheduled' THEN 1 ELSE 0 END) as overdue
        FROM schedules
    ");
    $schedules = $schedStmt->fetch();
    
    jsonResponse([
        'success' => true,
        'data' => [
            'farmers' => [
                'total' => (int)($farmers['total'] ?? 0),
                'active' => (int)($farmers['active'] ?? 0)
            ],
            'farms' => [
                'total' => (int)($farms['total'] ?? 0)
            ],
            'seeds' => [
                'total_items' => (int)($seeds['total_items'] ?? 0),
                'total_quantity' => $seeds['total_quantity'] !== null ? (float)$seeds['total_quantity'] : null,
                'low_stock' => (int)($seeds['low_stock'] ?? 0),
                'out_of_stock' => (int)($seeds['out_of_stock'] ?? 0)
            ],
            'equipment' => [
                'total_items' => (int)($equipment['total_items'] ?? 0),
                'total_quantity' => $equipment['total_quantity'] !== null ? (float)$equipment['total_quantity'] : null,
                'low_stock' => (int)($equipment['low_stock'] ?? 0),
                'out_of_stock' => (int)($equipment['out_of_stock'] ?? 0)
            ],
            'distributions' => [
                'total' => (int)($distributions['total'] ?? 0),
                'total_items' => $distributions['total_items'] !== null ? (float)$distributions['total_items'] : null,
                'farmers_served' => (int)($distributions['farmers_served'] ?? 0)
            ],
            'schedules' => [
                'total' => (int)($schedules['total'] ?? 0),
                'upcoming' => (int)($schedules['upcoming'] ?? 0),
                'overdue' => (int)($schedules['overdue'] ?? 0)
            ]
        ]
    ]);
}

function getRecentActivity() {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    
    // Recent distributions
    $distStmt = getDB()->prepare("
        SELECT d.id, 'distribution' as type, d.distribution_date as date, 
            CONCAT(COALESCE(f.rsbsa_number, ''), ' - ', f.name, ' - ', d.total_items, ' items') as description,
            'seed' as icon
        FROM distributions d
        LEFT JOIN farmers f ON d.farmer_id = f.id
        ORDER BY d.created_at DESC
        LIMIT ?
    ");
    $distStmt->execute([$limit]);
    $distributions = $distStmt->fetchAll();
    
    // Recent schedules
    $schedStmt = getDB()->prepare("
        SELECT id, 'schedule' as type, schedule_date as date, 
            CONCAT(title, ' - ', location) as description,
            'calendar' as icon
        FROM schedules
        ORDER BY created_at DESC
        LIMIT ?
    ");
    $schedStmt->execute([$limit]);
    $schedules = $schedStmt->fetchAll();
    
    // Merge and sort
    $activities = array_merge($distributions, $schedules);
    usort($activities, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });
    
    jsonResponse([
        'success' => true,
        'data' => array_slice($activities, 0, $limit)
    ]);
}

function getAlerts() {
    $alerts = [];
    
    // Low stock seeds
    $seedsStmt = getDB()->query("
        SELECT id, crop_type, variety, quantity, threshold 
        FROM seeds_inventory 
        WHERE quantity <= threshold
    ");
    $lowSeeds = $seedsStmt->fetchAll();
    foreach ($lowSeeds as $seed) {
        $type = ($seed['quantity'] == 0) ? 'danger' : 'warning';
        $title = ($seed['quantity'] == 0) ? 'Out of Stock' : 'Low Seed Stock';
        $alerts[] = [
            'type' => $type,
            'title' => $title,
            'message' => $seed['crop_type'] . ' (' . $seed['variety'] . '): ' . $seed['quantity'] . ' remaining',
            'link' => 'inventory.php?type=seeds&status=low_stock'
        ];
    }
    
    // Low stock equipment
    $equipStmt = getDB()->query("
        SELECT id, name, quantity, threshold 
        FROM equipment_inventory 
        WHERE quantity <= threshold
    ");
    $lowEquip = $equipStmt->fetchAll();
    foreach ($lowEquip as $equip) {
        $type = ($equip['quantity'] == 0) ? 'danger' : 'warning';
        $title = ($equip['quantity'] == 0) ? 'Out of Stock' : 'Low Equipment Stock';
        $alerts[] = [
            'type' => $type,
            'title' => $title,
            'message' => $equip['name'] . ': ' . $equip['quantity'] . ' remaining',
            'link' => 'inventory.php?type=equipment&status=low_stock'
        ];
    }
    
    // Overdue schedules
    $overdueStmt = getDB()->query("
        SELECT id, title, schedule_date 
        FROM schedules 
        WHERE schedule_date < CURDATE() AND status = 'scheduled'
    ");
    $overdue = $overdueStmt->fetchAll();
    foreach ($overdue as $sched) {
        $alerts[] = [
            'type' => 'danger',
            'title' => 'Overdue Schedule',
            'message' => $sched['title'] . ' was due on ' . $sched['schedule_date'],
            'link' => 'schedules.php'
        ];
    }
    
    // Upcoming schedules (within 3 days) - Distribution Reminders
    $upcomingStmt = getDB()->query("
        SELECT id, title, schedule_date 
        FROM schedules 
        WHERE schedule_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        AND status = 'scheduled'
    ");
    $upcoming = $upcomingStmt->fetchAll();
    foreach ($upcoming as $sched) {
        $daysDiff = (strtotime($sched['schedule_date']) - strtotime(date('Y-m-d'))) / 86400;
        if ($daysDiff == 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'Distribution Today',
                'message' => $sched['title'] . ' is scheduled for today',
                'link' => 'schedules.php'
            ];
        } else {
            $alerts[] = [
                'type' => 'info',
                'title' => 'Upcoming Distribution',
                'message' => $sched['title'] . ' is scheduled on ' . $sched['schedule_date'],
                'link' => 'schedules.php'
            ];
        }
    }
    
    jsonResponse([
        'success' => true,
        'data' => $alerts
    ]);
}

function getChartsData() {
    // Monthly distributions
    $monthlyStmt = getDB()->query("
        SELECT 
            MONTH(distribution_date) as month,
            COUNT(*) as count,
            SUM(total_items) as items
        FROM distributions
        WHERE YEAR(distribution_date) = YEAR(CURRENT_DATE())
        GROUP BY MONTH(distribution_date)
        ORDER BY month
    ");
    $monthlyDist = $monthlyStmt->fetchAll();
    
    // Crop type distribution
    $cropStmt = getDB()->query("
        SELECT crop_type, COUNT(*) as count
        FROM farmers
        WHERE crop_type IS NOT NULL AND crop_type != ''
        GROUP BY crop_type
        ORDER BY count DESC
    ");
    $crops = $cropStmt->fetchAll();
    
    // Distribution by region
    $regionStmt = getDB()->query("
        SELECT farm_location, COUNT(*) as count
        FROM farmers
        WHERE farm_location IS NOT NULL AND farm_location != ''
        GROUP BY farm_location
        ORDER BY count DESC
        LIMIT 10
    ");
    $regions = $regionStmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data' => [
            'monthly_distributions' => $monthlyDist,
            'crop_distribution' => $crops,
            'region_distribution' => $regions
        ]
    ]);
}