<?php
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');
// Force browser to load fresh page - bypass any cache
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['_v'])) {
    $uri = $_SERVER['REQUEST_URI'];
    $sep = (strpos($uri, '?') === false) ? '?' : '&';
    header('Location: ' . $uri . $sep . '_v=2');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">
    <meta name="description" content="Seed and Equipment Distribution Tracking System with offline synchronization and mobile PWA adaptability.">
    <meta name="theme-color" content="#22C55E">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="DistroTrack">
    
    <title>Distribution Tracking System</title>
    
    <link rel="manifest" href="manifest.json">
    <link rel="icon" type="image/svg+xml" href="img/icon.svg">
    <link rel="apple-touch-icon" href="img/icon.svg">
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <link rel="stylesheet" href="css/styles.css?v=<?php echo time(); ?>">
</head>
<body>
    <div id="app">
        <!-- Login Page -->
        <div id="login-page" class="page">
            <div class="login-modal-new">
                <div class="login-modal-header">
                    <div class="login-modal-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                    <h2>Administrator Login</h2>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            <input type="text" id="username" name="username" placeholder="Username" required autocomplete="username">
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                            <input type="password" id="password" name="password" placeholder="Password" required autocomplete="current-password">
                        </div>
                    </div>
                    <button type="submit" class="btn-login-new">Login</button>
                    <div id="login-error" class="login-error-message" style="color: #ef4444; font-size: 13px; margin-top: 10px; text-align: center;"></div>
                </form>
                <div class="login-footer">
                    <p class="login-system-notice" style="color: #64748b; font-size: 12.5px; margin: 0; line-height: 1.4; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="color: #2E7D32; flex-shrink: 0;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                        <span>Authorized access only. Contact your System Administrator for account access.</span>
                    </p>
                </div>
            </div>
        </div>

        <!-- Main App -->
        <div id="main-app" class="hidden">
            <!-- Sidebar Overlay for Mobile -->
            <div class="sidebar-overlay" id="sidebar-overlay"></div>

            <!-- Sidebar Drawer -->
            <aside id="sidebar" class="sidebar">
                <div class="sidebar-header">
                    <div class="logo-small">
                        <svg width="38" height="38" viewBox="0 0 60 60" fill="none">
                            <circle cx="30" cy="30" r="28" fill="#22C55E"/>
                            <path d="M30 45 C30 45 15 35 15 22 C15 12 23 8 30 15 C37 8 45 12 45 22 C45 35 30 45 30 45 Z" fill="white"/>
                            <path d="M30 20 L30 40" stroke="#15803D" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <span>Distribution Tracking</span>
                </div>
                <nav class="sidebar-nav">
                    <a href="#" class="nav-item active" data-page="dashboard">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="#" class="nav-item" data-page="farmers">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span>Farmer</span>
                    </a>
                    <a href="#" class="nav-item" data-page="farm">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3c0 1.49-.85 2.79-2 3.46V22h2V6.46c1.15-.67 2-1.97 2-3.46 0-2.21-1.79-4-4-4S17 3.79 17 6c0 1.49.85 2.79 2 3.46V22h2V6.46c1.15-.67 2-1.97 2-3.46z"/></svg>
                        <span>Farms</span>
                    </a>
                    <a href="#" class="nav-item" data-page="inventory">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
                        <span>Inventory</span>
                    </a>
                    <a href="#" class="nav-item" data-page="distributions">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        <span>Distributions</span>
                    </a>
                    <a href="#" class="nav-item" data-page="schedules">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
                        <span>Schedules</span>
                    </a>
                    <a href="#" class="nav-item" data-page="reports">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                        <span>Reports</span>
                    </a>
                </nav>
                <div class="sidebar-footer">
                    <a href="#" class="nav-item" data-page="settings">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                        <span>Settings</span>
                    </a>
                    <a href="#" class="nav-item" id="logout-btn">
                        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                        <span>Logout</span>
                    </a>
                </div>
            </aside>

            <!-- Main Content -->
            <main id="main-content">
                <!-- Header -->
                <header id="header">
                    <button id="menu-toggle" class="menu-toggle" aria-label="Toggle navigation menu">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
                    </button>
                    <div class="header-title">
                        <h2 id="page-title">Dashboard</h2>
                    </div>
                    <div class="header-actions">
                        <!-- Network Quality & Sync Pill -->
                        <div id="network-status-badge" class="network-badge online-fast" title="Connection status - Click to Sync">
                            <span class="net-dot"></span>
                            <span class="net-label">Online</span>
                        </div>

                        <!-- Syncing spinner -->
                        <div id="sync-indicator" class="sync-indicator hidden" title="Synchronizing with server...">
                            <svg class="spinning" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                            <span>Syncing...</span>
                        </div>

                        <!-- PWA Install Button (Mobile / Desktop) -->
                        <button id="pwa-install-btn" class="btn btn-pwa-install hidden" title="Install App to Home Screen">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                            <span class="install-text">Install App</span>
                        </button>

                        <!-- Notification Wrapper -->
                        <div class="notification-wrapper">
                            <button id="notifications-btn" class="icon-btn" aria-label="Notifications">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                                <span id="notification-badge" class="badge hidden">0</span>
                            </button>
                            <div id="notification-dropdown" class="notification-dropdown hidden">
                                <div class="notification-dropdown-header">
                                    <h4>Notifications</h4>
                                </div>
                                <div id="notification-list"></div>
                            </div>
                        </div>

                        <!-- User Info -->
                        <div id="user-info" class="user-info" title="View Settings & Profile">
                            <div class="user-avatar" style="width: 36px; height: 36px; min-width: 36px; max-width: 36px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span id="user-initial">A</span>
                            </div>
                            <span id="user-name">Admin</span>
                        </div>
                    </div>
                </header>

                <!-- Content Area -->
                <div id="content-area">
                    <!-- Dynamic Page Views Rendered Here -->
                </div>
            </main>

            <!-- Mobile Bottom Navigation Bar -->
            <nav id="mobile-bottom-nav" class="mobile-bottom-nav" aria-label="Mobile Navigation">
                <a href="#" class="bottom-nav-item active" data-page="dashboard">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
                    <span>Home</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="farmers">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    <span>Farmers</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="inventory">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
                    <span>Stock</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="distributions">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                    <span>Distro</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="schedules">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
                    <span>Schedules</span>
                </a>
                <a href="#" class="bottom-nav-item" data-page="settings">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                    <span>Settings</span>
                </a>
            </nav>
        </div>

        <!-- Notification Container -->
        <div id="notifications-container"></div>
    </div>

    <!-- Modal Template -->
    <div id="modal-overlay" class="modal-overlay hidden">
        <div id="modal-container" class="modal-container">
            <div class="modal-header">
                <h3 id="modal-title">Modal Title</h3>
                <button class="modal-close" id="modal-close" aria-label="Close modal">&times;</button>
            </div>
            <div id="modal-body" class="modal-body">
                <!-- Modal content dynamically injected -->
            </div>
            <div id="modal-footer" class="modal-footer">
                <!-- Modal buttons -->
            </div>
        </div>
    </div>

    <script src="js/utils_v2.js?v=<?php echo time(); ?>"></script>
    <script src="js/api_v2.js?v=<?php echo time(); ?>"></script>
    <script src="js/pages_v2.js?v=<?php echo time(); ?>"></script>
    <script src="js/import_v3.js?v=<?php echo time(); ?>"></script>
    <script src="js/app_v2.js?v=<?php echo time(); ?>"></script>
</body>
</html>