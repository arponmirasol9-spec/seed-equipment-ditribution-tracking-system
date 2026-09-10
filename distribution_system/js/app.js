const App = {
    currentPage: 'dashboard',
    user: null,
    isOnline: true,
    syncPending: false,
    
    init() {
        console.log('App init starting...');
        this.checkAuth();
        this.setupEventListeners();
        this.setupOfflineDetection();
        this.initPWA();
        setTimeout(() => {
            console.log('Calling loadNotificationBadge...');
            this.loadNotificationBadge();
        }, 1000);
    },
    
    async loadNotificationBadge() {
        try {
            const [alertsRes, statsRes] = await Promise.all([
                API.getAlerts(),
                API.getDashboardStats()
            ]);
            
            const alerts = alertsRes.data || [];
            const stats = statsRes.data || {};
            const schedules = stats.schedules || {};
            const seeds = stats.seeds || {};
            const equipment = stats.equipment || {};
            
            const overdueCount = schedules.overdue || 0;
            const upcomingCount = schedules.upcoming || 0;
            const lowStockCount = (seeds.low_stock || 0) + (equipment.low_stock || 0);
            const outOfStockCount = (seeds.out_of_stock || 0) + (equipment.out_of_stock || 0);
            const totalCount = overdueCount + upcomingCount + lowStockCount + outOfStockCount;
            
            const badge = document.getElementById('notification-badge');
            const btn = document.getElementById('notifications-btn');
            const notifList = document.getElementById('notification-list');
            
            if (totalCount > 0) {
                badge.textContent = totalCount;
                badge.classList.remove('hidden');
                btn.style.color = '#DC2626';
            } else {
                badge.classList.add('hidden');
                btn.style.color = '';
            }
            
            let html = '';
            
            if (overdueCount > 0) {
                html += `
                    <div class="notification-item" onclick="App.navigateTo('schedules'); App.toggleNotificationDropdown();">
                        <div class="notif-icon overdue">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">Overdue Schedules</div>
                            <div class="notif-desc">${overdueCount} schedule${overdueCount > 1 ? 's' : ''} past due date</div>
                        </div>
                        <div class="notif-count danger">${overdueCount}</div>
                    </div>
                `;
            }
            
            if (upcomingCount > 0) {
                html += `
                    <div class="notification-item" onclick="App.navigateTo('schedules'); App.toggleNotificationDropdown();">
                        <div class="notif-icon upcoming">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">Upcoming Schedules</div>
                            <div class="notif-desc">${upcomingCount} schedule${upcomingCount > 1 ? 's' : ''} coming up</div>
                        </div>
                        <div class="notif-count warning">${upcomingCount}</div>
                    </div>
                `;
            }
            
            if (lowStockCount > 0) {
                html += `
                    <div class="notification-item" onclick="App.navigateTo('inventory'); App.toggleNotificationDropdown();">
                        <div class="notif-icon low-stock">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">Low Stock Items</div>
                            <div class="notif-desc">${lowStockCount} item${lowStockCount > 1 ? 's' : ''} running low</div>
                        </div>
                        <div class="notif-count warning">${lowStockCount}</div>
                    </div>
                `;
            }
            
            if (outOfStockCount > 0) {
                html += `
                    <div class="notification-item" onclick="App.navigateTo('inventory'); App.toggleNotificationDropdown();">
                        <div class="notif-icon out-of-stock">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">Out of Stock</div>
                            <div class="notif-desc">${outOfStockCount} item${outOfStockCount > 1 ? 's' : ''} depleted</div>
                        </div>
                        <div class="notif-count danger">${outOfStockCount}</div>
                    </div>
                `;
            }
            
            if (!html) {
                html = '<div class="notification-empty">No notifications</div>';
            }
            
            notifList.innerHTML = html;
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    },
    
    async toggleNotificationDropdown() {
        const dropdown = document.getElementById('notification-dropdown');
        const isOpen = !dropdown.classList.contains('hidden');
        
        if (!isOpen) {
            await this.loadNotificationBadge();
        }
        
        dropdown.classList.toggle('hidden');
    },
    
    closeNotificationDropdown(e) {
        const dropdown = document.getElementById('notification-dropdown');
        const wrapper = document.querySelector('.notification-wrapper');
        if (!wrapper.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    },
    
    checkAuth() {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
            this.user = JSON.parse(userStr);
            this.showMainApp();
        } else {
            this.showLogin();
        }
    },
    
    showLogin() {
        const loginPage = document.getElementById('login-page');
        const regPage = document.getElementById('register-page');
        const mainApp = document.getElementById('main-app');
        if (loginPage) loginPage.classList.remove('hidden');
        if (regPage) regPage.classList.add('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    },
    
    showLoginPage() {
        this.showLogin();
    },
    
    showRegister() {
        const loginPage = document.getElementById('login-page');
        const regPage = document.getElementById('register-page');
        const mainApp = document.getElementById('main-app');
        if (loginPage) loginPage.classList.add('hidden');
        if (regPage) regPage.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    },
    
    showMainApp(page) {
        const loginPage = document.getElementById('login-page');
        const regPage = document.getElementById('register-page');
        const mainApp = document.getElementById('main-app');
        if (loginPage) loginPage.classList.add('hidden');
        if (regPage) regPage.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
        
        this.updateUserInfo();
        
        const targetPage = page || localStorage.getItem('currentPage') || 'dashboard';
        this.navigateTo(targetPage);
    },
    
    updateUserInfo() {
        if (this.user) {
            const uName = document.getElementById('user-name');
            const avatarContainer = document.querySelector('#user-info .user-avatar');
            if (uName) uName.textContent = this.user.full_name || this.user.username;
            
            if (avatarContainer) {
                if (this.user.avatar) {
                    avatarContainer.innerHTML = `<img src="${this.user.avatar}" class="user-avatar-img" alt="Avatar" style="width: 36px; height: 36px; max-width: 36px; max-height: 36px; object-fit: cover; border-radius: 50%; display: block;">`;
                } else {
                    const initial = (this.user.full_name || this.user.username || 'U').charAt(0).toUpperCase();
                    avatarContainer.innerHTML = `<span id="user-initial">${initial}</span>`;
                }
            }
        }
    },
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Register form (if exists)
        const regForm = document.getElementById('register-form');
        if (regForm) regForm.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Login/Register page switching (if exists)
        const showReg = document.getElementById('show-register');
        if (showReg) {
            showReg.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegister();
            });
        }
        
        const showLog = document.getElementById('show-login');
        if (showLog) {
            showLog.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginPage();
            });
        }
        
        // Navigation
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // User info click navigation to Settings
        const userInfoEl = document.getElementById('user-info');
        if (userInfoEl) {
            userInfoEl.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('settings');
            });
        }
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                this.logout();
            }
        });
        
        // Menu toggle
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.querySelector('.sidebar-overlay')?.classList.toggle('open');
        });
        
        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
        
        // Notifications
        document.getElementById('notifications-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNotificationDropdown();
        });
        document.addEventListener('click', (e) => this.closeNotificationDropdown(e));

        // Enter key handling for modal forms and active page forms
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const target = e.target;
                if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'A')) {
                    return;
                }

                const modalOverlay = document.getElementById('modal-overlay');
                if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
                    const primaryBtn = modalOverlay.querySelector('#modal-footer .btn-primary, .modal-container .btn-primary');
                    if (primaryBtn && !primaryBtn.disabled) {
                        e.preventDefault();
                        primaryBtn.click();
                        return;
                    }
                }

                const form = target ? target.closest('form') : null;
                if (form && form.id !== 'login-form' && form.id !== 'register-form') {
                    const submitBtn = form.querySelector('button[type="submit"], button.btn-primary');
                    if (submitBtn && !submitBtn.disabled) {
                        e.preventDefault();
                        submitBtn.click();
                    }
                }
            }
        });
    },
    
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        
        console.log('Login attempt with:', username);
        
        try {
            const response = await API.login(username, password);
            console.log('Login response:', response);
            
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('currentPage', 'dashboard');
            
            this.user = response.user;
            this.currentPage = 'dashboard';
            this.showMainApp('dashboard');
            
            Utils.showToast('success', 'Welcome', `Logged in as ${response.user.full_name}`);
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
        }
    },
    
    async handleRegister(e) {
        e.preventDefault();
        
        const name = (document.getElementById('reg-name')?.value || '').trim();
        const username = (document.getElementById('reg-username')?.value || '').trim();
        const email = (document.getElementById('reg-email')?.value || `${username}@system.local`).trim();
        const password = document.getElementById('reg-password')?.value || '';
        const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';
        
        if (!name || !username || !password) {
            Utils.showToast('error', 'Validation Error', 'All fields are required');
            return;
        }
        
        if (password !== confirmPassword) {
            Utils.showToast('error', 'Validation Error', 'Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            Utils.showToast('error', 'Validation Error', 'Password must be at least 6 characters');
            return;
        }
        
        try {
            const response = await API.register(username, password, name, email);
            
            Utils.showToast('success', 'Registration Successful', 'Please login with your credentials');
            this.showLoginPage();
            
            const rForm = document.getElementById('register-form');
            if (rForm) rForm.reset();
        } catch (error) {
            Utils.showToast('error', 'Registration Failed', error.message);
        }
    },
    
    logout() {
        API.logout();
        this.user = null;
        this.currentPage = 'dashboard';
        localStorage.removeItem('currentPage');
        
        // Reset navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === 'dashboard') {
                item.classList.add('active');
            }
        });
        
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = 'Dashboard';
        
        // Clear content area
        const contentArea = document.getElementById('content-area');
        if (contentArea) contentArea.innerHTML = '';
        
        // Close modal, notifications and mobile sidebar if open
        if (typeof this.closeModal === 'function') {
            this.closeModal();
        }
        document.getElementById('notification-dropdown')?.classList.add('hidden');
        document.getElementById('sidebar')?.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('open');
        
        // Reset login form fields and errors
        document.getElementById('login-form')?.reset();
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
        
        this.showLogin();
        Utils.showToast('info', 'Logged Out', 'You have been logged out successfully');
    },
    
    navigateTo(page) {
        console.log('navigateTo called with:', page);
        this.currentPage = page;
        localStorage.setItem('currentPage', page);
        
        // Close notification dropdown
        document.getElementById('notification-dropdown')?.classList.add('hidden');
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
        
        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            farmers: 'Farmers Management',
            inventory: 'Inventory',
            distributions: 'Distributions',
            schedules: 'Schedules',
            reports: 'Reports',
            settings: 'Settings'
        };
        
        document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
        
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('open');
        
        // Load page content
        Pages.loadPage(page).catch(function(err) {
            console.error('Failed to load page:', page, err);
        });
    },
    
    setupOfflineDetection() {
        this.updateOnlineStatus();
        
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    },
    
    updateOnlineStatus() {
        this.isOnline = navigator.onLine;
        this.updateConnectionIndicator();
    },
    
    handleOffline() {
        this.isOnline = false;
        this.updateConnectionIndicator();
        Utils.showToast('warning', 'Offline Mode', 'You are now offline. Data will be synced when connection is restored.');
    },
    
    handleOnline() {
        this.isOnline = true;
        this.updateConnectionIndicator();
        this.syncOfflineData();
    },
    
    updateConnectionIndicator() {
        const onlineIndicator = document.getElementById('online-indicator');
        const offlineIndicator = document.getElementById('offline-indicator');
        const syncIndicator = document.getElementById('sync-indicator');
        
        if (!this.isOnline) {
            onlineIndicator.classList.add('hidden');
            offlineIndicator.classList.remove('hidden');
            syncIndicator.classList.add('hidden');
        } else {
            onlineIndicator.classList.remove('hidden');
            offlineIndicator.classList.add('hidden');
        }
    },
    
    async syncOfflineData() {
        if (!this.isOnline) return;
        
        try {
            const response = await API.getPendingSync();
            
            if (response.data && response.data.length > 0) {
                document.getElementById('sync-indicator').classList.remove('hidden');
                
                await API.syncData(response.data);
                
                document.getElementById('sync-indicator').classList.add('hidden');
                const count = response.data.length;
                Utils.showToast('success', 'Synced', `${count} item(s) from offline have been synchronized`);
            } else {
                Utils.showToast('success', 'Online', 'You are now connected. No offline data to sync.');
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    },
    
    initPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for (let r of regs) r.unregister();
            });
        }
    },
    
    showModal(title, bodyContent, footerContent = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyContent;
        document.getElementById('modal-footer').innerHTML = footerContent;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    
    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },
    
    async showNotifications() {
        try {
            const response = await API.getAlerts();
            const alerts = response.data || [];
            
            if (alerts.length === 0) {
                this.showModal('Notifications', '<div class="empty-state"><p>No notifications</p></div>');
                return;
            }
            
            let html = '';
            alerts.forEach(alert => {
                const icon = alert.type === 'danger' ? 'error' : (alert.type === 'warning' ? 'warning' : 'info');
                html += `
                    <div class="alert alert-${alert.type}">
                        <strong>${alert.title}</strong>
                        <p>${alert.message}</p>
                    </div>
                `;
            });
            
            this.showModal('Notifications', html);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
};

window.App = App;

// Initialize app
document.addEventListener('DOMContentLoaded', () => App.init());