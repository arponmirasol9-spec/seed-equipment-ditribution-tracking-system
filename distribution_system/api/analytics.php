<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    switch ($action) {
        case 'distribution_trends':
            getDistributionTrends();
            break;
        case 'most_requested':
            getMostRequested();
            break;
        case 'farmer_activity':
            getFarmerActivity();
            break;
        case 'stock_predictions':
            getStockPredictions();
            break;
        case 'comparison':
            getComparisonData();
            break;
        case 'summary':
            getAnalyticsSummary();
            break;
        case 'regional':
            getRegionalData();
            break;
        case 'seasonal':
            getSeasonalData();
            break;
        default:
            jsonResponse(['error' => 'Invalid action'], 400);
    }
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

function getDistributionTrends() {
    $period = $_GET['period'] ?? 'monthly';
    $months = isset($_GET['months']) ? (int)$_GET['months'] : 12;
    
    if ($period === 'daily') {
        $stmt = getDB()->prepare("
            SELECT 
                DATE(distribution_date) as date,
                COUNT(*) as distributions,
                COALESCE(SUM(total_items), 0) as items_distributed
            FROM distributions
            WHERE distribution_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(distribution_date)
            ORDER BY date
        ");
        $stmt->execute([$months]);
    } elseif ($period === 'monthly') {
        $stmt = getDB()->prepare("
            SELECT 
                DATE_FORMAT(distribution_date, '%Y-%m') as date,
                DATE_FORMAT(distribution_date, '%b %Y') as month_label,
                COUNT(*) as distributions,
                COALESCE(SUM(total_items), 0) as items_distributed
            FROM distributions
            WHERE distribution_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(distribution_date, '%Y-%m')
            ORDER BY date
        ");
        $stmt->execute([$months]);
    } else {
        $stmt = getDB()->query("
            SELECT 
                YEAR(distribution_date) as year,
                COUNT(*) as distributions,
                COALESCE(SUM(total_items), 0) as items_distributed
            FROM distributions
            GROUP BY YEAR(distribution_date)
            ORDER BY year
        ");
    }
    
    $data = $stmt->fetchAll();
    
    // Return sample data if empty (for demo purposes)
    if (empty($data)) {
        $data = [
            ['month_label' => 'Jan 2026', 'distributions' => 0, 'items_distributed' => 0],
            ['month_label' => 'Feb 2026', 'distributions' => 0, 'items_distributed' => 0],
            ['month_label' => 'Mar 2026', 'distributions' => 0, 'items_distributed' => 0]
        ];
    }
    
    jsonResponse([
        'success' => true,
        'data' => $data,
        'period' => $period
    ]);
}

function getMostRequested() {
    $type = $_GET['type'] ?? 'all';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    
    $seedsStmt = getDB()->prepare("
        SELECT 
            si.id,
            si.crop_type,
            si.variety,
            si.unit,
            COALESCE(SUM(di.quantity), 0) as total_distributed,
            COUNT(DISTINCT di.distribution_id) as times_requested
        FROM seeds_inventory si
        LEFT JOIN distribution_items di ON di.item_type = 'seed' AND di.item_id = si.id
        GROUP BY si.id
        ORDER BY total_distributed DESC
        LIMIT " . (int)$limit . "
    ");
    $seedsStmt->execute();
    $seeds = $seedsStmt->fetchAll();
    
    $equipStmt = getDB()->prepare("
        SELECT 
            ei.id,
            ei.name,
            ei.category,
            COALESCE(SUM(di.quantity), 0) as total_distributed,
            COUNT(DISTINCT di.distribution_id) as times_requested
        FROM equipment_inventory ei
        LEFT JOIN distribution_items di ON di.item_type = 'equipment' AND di.item_id = ei.id
        GROUP BY ei.id
        ORDER BY total_distributed DESC
        LIMIT " . (int)$limit . "
    ");
    $equipStmt->execute();
    $equipment = $equipStmt->fetchAll();
    
    // Get seeds inventory for display even without distributions
    if (empty($seeds)) {
        $seedsStmt = getDB()->query("SELECT id, crop_type, variety, unit FROM seeds_inventory LIMIT 5");
        $seeds = $seedsStmt->fetchAll();
    }
    
    // Get equipment inventory for display even without distributions
    if (empty($equipment)) {
        $equipStmt = getDB()->query("SELECT id, name, category FROM equipment_inventory LIMIT 5");
        $equipment = $equipStmt->fetchAll();
    }
    
    // Ensure all items have the required fields
    foreach ($seeds as &$s) {
        if (!isset($s['total_distributed'])) $s['total_distributed'] = 0;
        if (!isset($s['times_requested'])) $s['times_requested'] = 0;
    }
    foreach ($equipment as &$e) {
        if (!isset($e['total_distributed'])) $e['total_distributed'] = 0;
        if (!isset($e['times_requested'])) $e['times_requested'] = 0;
    }
    
    jsonResponse([
        'success' => true,
        'data' => [
            'seeds' => $seeds,
            'equipment' => $equipment
        ]
    ]);
}

function getFarmerActivity() {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $sortBy = $_GET['sort'] ?? 'total';
    
    $orderBy = $sortBy === 'frequency' ? 'times_received DESC' : 'total_items DESC';
    
    $stmt = getDB()->prepare("
        SELECT 
            f.id,
            f.name,
            f.rsbsa_number,
            f.barangay,
            f.municipality,
            COUNT(d.id) as times_received,
            COALESCE(SUM(d.total_items), 0) as total_items
        FROM farmers f
        LEFT JOIN distributions d ON d.farmer_id = f.id
        GROUP BY f.id
        HAVING times_received > 0
        ORDER BY $orderBy
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    $farmers = $stmt->fetchAll();
    
    $totalStmt = getDB()->query("
        SELECT 
            COUNT(DISTINCT farmer_id) as active_farmers,
            COUNT(*) as total_distributions,
            SUM(total_items) as total_items_distributed
        FROM distributions
    ");
    $totals = $totalStmt->fetch();
    
    jsonResponse([
        'success' => true,
        'data' => [
            'farmers' => $farmers,
            'totals' => $totals
        ]
    ]);
}

function getStockPredictions() {
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
    
    $seedsStmt = getDB()->query("
        SELECT 
            id,
            crop_type,
            variety,
            quantity,
            threshold,
            unit
        FROM seeds_inventory
        WHERE status != 'out_of_stock'
    ");
    $seeds = $seedsStmt->fetchAll();
    
    $predictions = [];
    
    foreach ($seeds as $seed) {
        $avgStmt = getDB()->prepare("
            SELECT AVG(daily_avg) as avg_daily FROM (
                SELECT DATE(distribution_date) as date,
                    COALESCE(SUM(di.quantity), 0) as daily_avg
                FROM distributions d
                JOIN distribution_items di ON di.distribution_id = d.id
                WHERE di.item_type = 'seed' AND di.item_id = ?
                AND d.distribution_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                GROUP BY DATE(distribution_date)
            ) daily
        ");
        $avgStmt->execute([$seed['id']]);
        $avg = $avgStmt->fetch();
        
        $dailyAvg = floatval($avg['avg_daily'] ?? 0);
        $currentQty = floatval($seed['quantity']);
        $threshold = floatval($seed['threshold']);
        
        $daysUntilEmpty = $dailyAvg > 0 ? floor($currentQty / $dailyAvg) : 999;
        $daysUntilThreshold = $dailyAvg > 0 ? floor(($currentQty - $threshold) / $dailyAvg) : 999;
        
        $status = 'ok';
        $alertLevel = 'low';
        
        if ($currentQty <= $threshold) {
            $status = 'critical';
            $alertLevel = 'high';
        } elseif ($daysUntilThreshold <= 30) {
            $status = 'warning';
            $alertLevel = 'medium';
        } elseif ($daysUntilEmpty <= $days) {
            $status = 'low';
            $alertLevel = 'medium';
        }
        
        $predictions[] = [
            'id' => $seed['id'],
            'type' => 'seed',
            'name' => $seed['crop_type'] . ' (' . $seed['variety'] . ')',
            'current_quantity' => $currentQty,
            'threshold' => $threshold,
            'daily_average' => round($dailyAvg, 2),
            'days_until_empty' => $daysUntilEmpty,
            'days_until_threshold' => $daysUntilThreshold,
            'status' => $status,
            'alert_level' => $alertLevel,
            'unit' => $seed['unit']
        ];
    }
    
    $equipStmt = getDB()->query("
        SELECT 
            id,
            name,
            category,
            quantity,
            threshold
        FROM equipment_inventory
        WHERE status != 'out_of_stock'
    ");
    $equipment = $equipStmt->fetchAll();
    
    foreach ($equipment as $equip) {
        $avgStmt = getDB()->prepare("
            SELECT AVG(daily_avg) as avg_daily FROM (
                SELECT DATE(d.distribution_date) as date,
                    COALESCE(SUM(di.quantity), 0) as daily_avg
                FROM distributions d
                JOIN distribution_items di ON di.distribution_id = d.id
                WHERE di.item_type = 'equipment' AND di.item_id = ?
                AND d.distribution_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                GROUP BY DATE(d.distribution_date)
            ) daily
        ");
        $avgStmt->execute([$equip['id']]);
        $avg = $avgStmt->fetch();
        
        $dailyAvg = floatval($avg['avg_daily'] ?? 0);
        $currentQty = floatval($equip['quantity']);
        $threshold = floatval($equip['threshold']);
        
        $daysUntilEmpty = $dailyAvg > 0 ? floor($currentQty / $dailyAvg) : 999;
        $daysUntilThreshold = $dailyAvg > 0 ? floor(($currentQty - $threshold) / $dailyAvg) : 999;
        
        $status = 'ok';
        $alertLevel = 'low';
        
        if ($currentQty <= $threshold) {
            $status = 'critical';
            $alertLevel = 'high';
        } elseif ($daysUntilThreshold <= 30) {
            $status = 'warning';
            $alertLevel = 'medium';
        } elseif ($daysUntilEmpty <= $days) {
            $status = 'low';
            $alertLevel = 'medium';
        }
        
        $predictions[] = [
            'id' => $equip['id'],
            'type' => 'equipment',
            'name' => $equip['name'],
            'current_quantity' => $currentQty,
            'threshold' => $threshold,
            'daily_average' => round($dailyAvg, 2),
            'days_until_empty' => $daysUntilEmpty,
            'days_until_threshold' => $daysUntilThreshold,
            'status' => $status,
            'alert_level' => $alertLevel,
            'unit' => 'units'
        ];
    }
    
    usort($predictions, function($a, $b) {
        $alertOrder = ['high' => 0, 'medium' => 1, 'low' => 2];
        return $alertOrder[$a['alert_level']] - $alertOrder[$b['alert_level']];
    });
    
    jsonResponse([
        'success' => true,
        'data' => $predictions
    ]);
}

function getComparisonData() {
    $period1Start = $_GET['period1_start'] ?? date('Y-m-01', strtotime('-6 months'));
    $period1End = $_GET['period1_end'] ?? date('Y-m-t', strtotime('-3 months'));
    $period2Start = $_GET['period2_start'] ?? date('Y-m-01');
    $period2End = $_GET['period2_end'] ?? date('Y-m-d');
    
    $stmt1 = getDB()->prepare("
        SELECT 
            COUNT(*) as distributions,
            SUM(total_items) as items
        FROM distributions
        WHERE distribution_date BETWEEN ? AND ?
    ");
    $stmt1->execute([$period1Start, $period1End]);
    $period1 = $stmt1->fetch();
    
    $stmt2 = getDB()->prepare("
        SELECT 
            COUNT(*) as distributions,
            SUM(total_items) as items
        FROM distributions
        WHERE distribution_date BETWEEN ? AND ?
    ");
    $stmt2->execute([$period2Start, $period2End]);
    $period2 = $stmt2->fetch();
    
    $distChange = $period1['distributions'] > 0 
        ? round((($period2['distributions'] - $period1['distributions']) / $period1['distributions']) * 100, 1)
        : 0;
    
    $itemsChange = $period1['items'] > 0 
        ? round((($period2['items'] - $period1['items']) / $period1['items']) * 100, 1)
        : 0;
    
    $cropStmt = getDB()->query("
        SELECT crop_type, COUNT(*) as count
        FROM farmers
        WHERE crop_type IS NOT NULL AND crop_type != ''
        GROUP BY crop_type
        ORDER BY count DESC
    ");
    $crops = $cropStmt->fetchAll();
    
    $regionStmt = getDB()->query("
        SELECT barangay, municipality, COUNT(*) as count
        FROM farmers
        WHERE barangay IS NOT NULL AND barangay != ''
        GROUP BY barangay, municipality
        ORDER BY count DESC
        LIMIT 10
    ");
    $regions = $regionStmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data' => [
            'period1' => [
                'start' => $period1Start,
                'end' => $period1End,
                'distributions' => (int)$period1['distributions'],
                'items' => (int)$period1['items']
            ],
            'period2' => [
                'start' => $period2Start,
                'end' => $period2End,
                'distributions' => (int)$period2['distributions'],
                'items' => (int)$period2['items']
            ],
            'changes' => [
                'distributions' => $distChange,
                'items' => $itemsChange
            ],
            'crops' => $crops,
            'regions' => $regions
        ]
    ]);
}

function getAnalyticsSummary() {
    $today = date('Y-m-d');
    $thisMonth = date('Y-m-01');
    $thisYear = date('Y-01-01');
    
    $todayStmt = getDB()->prepare("
        SELECT COUNT(*) as distributions, COALESCE(SUM(total_items), 0) as items
        FROM distributions WHERE distribution_date = ?
    ");
    $todayStmt->execute([$today]);
    $todayData = $todayStmt->fetch();
    
    $monthStmt = getDB()->prepare("
        SELECT COUNT(*) as distributions, COALESCE(SUM(total_items), 0) as items
        FROM distributions WHERE distribution_date >= ?
    ");
    $monthStmt->execute([$thisMonth]);
    $monthData = $monthStmt->fetch();
    
    $yearStmt = getDB()->prepare("
        SELECT COUNT(*) as distributions, COALESCE(SUM(total_items), 0) as items
        FROM distributions WHERE distribution_date >= ?
    ");
    $yearStmt->execute([$thisYear]);
    $yearData = $yearStmt->fetch();
    
    $seedsStmt = getDB()->query("SELECT SUM(quantity) as total FROM seeds_inventory");
    $seedsTotal = $seedsStmt->fetch();
    
    $equipStmt = getDB()->query("SELECT SUM(quantity) as total FROM equipment_inventory");
    $equipTotal = $equipStmt->fetch();
    
    $farmerStmt = getDB()->query("SELECT COUNT(*) as total FROM farmers WHERE status = 'active'");
    $activeFarmers = $farmerStmt->fetch();
    
    jsonResponse([
        'success' => true,
        'data' => [
            'today' => [
                'distributions' => (int)$todayData['distributions'],
                'items' => (int)$todayData['items']
            ],
            'this_month' => [
                'distributions' => (int)$monthData['distributions'],
                'items' => (int)$monthData['items']
            ],
            'this_year' => [
                'distributions' => (int)$yearData['distributions'],
                'items' => (int)$yearData['items']
            ],
            'seeds_stock' => (int)$seedsTotal['total'],
            'equipment_stock' => (int)$equipTotal['total'],
            'active_farmers' => (int)$activeFarmers['total']
        ]
    ]);
}

function getRegionalData() {
    $stmt = getDB()->query("
        SELECT 
            COALESCE(f.barangay, 'Unknown') as region,
            COALESCE(f.municipality, 'Unknown') as municipality,
            COUNT(DISTINCT f.id) as farmers,
            COUNT(d.id) as distributions,
            COALESCE(SUM(d.total_items), 0) as items
        FROM farmers f
        LEFT JOIN distributions d ON d.farmer_id = f.id
        GROUP BY f.barangay, f.municipality
        ORDER BY items DESC
        LIMIT 15
    ");
    $data = $stmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'data' => $data
    ]);
}

function getSeasonalData() {
    $stmt = getDB()->query("
        SELECT 
            CASE 
                WHEN MONTH(distribution_date) IN (3,4,5) THEN 'Q1 (Mar-May)'
                WHEN MONTH(distribution_date) IN (6,7,8) THEN 'Q2 (Jun-Aug)'
                WHEN MONTH(distribution_date) IN (9,10,11) THEN 'Q3 (Sep-Nov)'
                ELSE 'Q4 (Dec-Feb)'
            END as season,
            MONTH(distribution_date) as month_num,
            COUNT(*) as distributions,
            SUM(total_items) as items
        FROM distributions
        WHERE distribution_date >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
        GROUP BY season, month_num
        ORDER BY month_num
    ");
    $data = $stmt->fetchAll();
    
    $seasonTotals = [];
    foreach ($data as $row) {
        if (!isset($seasonTotals[$row['season']])) {
            $seasonTotals[$row['season']] = ['season' => $row['season'], 'distributions' => 0, 'items' => 0];
        }
        $seasonTotals[$row['season']]['distributions'] += (int)$row['distributions'];
        $seasonTotals[$row['season']]['items'] += (int)$row['items'];
    }
    
    jsonResponse([
        'success' => true,
        'data' => [
            'monthly' => $data,
            'seasonal' => array_values($seasonTotals)
        ]
    ]);
}
