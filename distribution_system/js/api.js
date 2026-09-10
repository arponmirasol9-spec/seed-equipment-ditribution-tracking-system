const API = {
    baseUrl: 'api/',
    
    request(endpoint, options) {
        options = options || {};
        var self = this;
        var token = localStorage.getItem('authToken');
        var method = options.method || 'GET';
        var body = options.body || null;

        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, self.baseUrl + endpoint, true);
            xhr.timeout = 60000;

            if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            if (body && typeof body === 'string') {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }

            xhr.onload = function() {
                var raw = xhr.responseText || '';
                if (!raw || raw.trim().length === 0) {
                    reject(new Error('Server returned empty response'));
                    return;
                }

                var clean = raw.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
                var si = -1;
                for (var i = 0; i < clean.length; i++) {
                    if (clean[i] === '{' || clean[i] === '[') { si = i; break; }
                }
                if (si === -1) {
                    reject(new Error('Server returned non-JSON response: ' + clean.substring(0, 200)));
                    return;
                }

                try {
                    var data = JSON.parse(clean.substring(si));
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(data);
                    } else {
                        if (xhr.status === 401 && !endpoint.includes('auth.php?action=login')) {
                            self.logout();
                            if (window.App && typeof App.logout === 'function' && App.user) {
                                App.logout();
                            }
                        }
                        reject(new Error(data.error || 'Request failed (HTTP ' + xhr.status + ')'));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON from server: ' + clean.substring(0, 200)));
                }
            };

            xhr.onerror = function() {
                reject(new Error('Network error - could not reach server'));
            };

            xhr.ontimeout = function() {
                reject(new Error('Request timed out'));
            };

            xhr.send(body);
        });
    },
    
    // Auth
    async login(username, password) {
        console.log('API.login called with:', username, password);
        const result =  this.request('auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        console.log('API.login result:', result);
        return result;
    },
    
    async logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentPage');
    },
    
    async register(username, password, full_name, email, role = 'staff', status = 'active', avatar = null) {
        return this.request('users.php?action=create', {
            method: 'POST',
            body: JSON.stringify({ username, password, full_name, email, role, status, avatar })
        });
    },
    
    async updateProfile(profileData) {
        return this.request('users.php?action=update_profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    },
    
    changePassword(user_id, new_password) {
        return this.request('users.php?action=change_password', {
            method: 'POST',
            body: JSON.stringify({ user_id, new_password })
        });
    },
    
    // User Management & Access Tracking
    async getUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('users.php?action=list&' + query);
    },
    
    async getUser(id) {
        return this.request(`users.php?action=single&id=${id}`);
    },
    
    async createUser(userData) {
        return this.request('users.php?action=create', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    async updateUser(id, userData) {
        return this.request(`users.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    async toggleUserStatus(id, status) {
        return this.request(`users.php?action=toggle_status&id=${id}`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    },
    
    async deleteUser(id) {
        return this.request(`users.php?action=delete&id=${id}`, {
            method: 'POST',
            body: JSON.stringify({ id })
        });
    },

    async deleteUnusedUsers() {
        return this.request('users.php?action=delete_unused', {
            method: 'POST'
        });
    },

    async makeUserAdmin(id, role = 'admin') {
        return this.request(`users.php?action=make_admin&id=${id}`, {
            method: 'POST',
            body: JSON.stringify({ role })
        });
    },
    
    async getUserStats() {
        return this.request('users.php?action=stats');
    },
    
    async getLoginLogs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('users.php?action=login_logs&' + query);
    },
    
    // Dashboard
    async getDashboardStats() {
        return this.request('dashboard.php?action=stats');
    },
    
    async getAlerts() {
        return this.request('dashboard.php?action=alerts');
    },
    
    async getRecentActivity() {
        return this.request('dashboard.php?action=activity');
    },
    
    // Farmers
    async getFarmers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('farmers.php?action=list&' + query);
    },
    
    async getFarmer(id) {
        return this.request(`farmers.php?action=single&id=${id}`);
    },
    
    // Farm
    async getFarms(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('farms.php?action=list&' + query);
    },
    
    async searchFarms(query) {
        return this.request('farms.php?action=search&q=' + encodeURIComponent(query));
    },
    
    async getFarm(id) {
        return this.request(`farms.php?action=single&id=${id}`);
    },
    
    async getFarmsByFarmer(farmerId) {
        return this.request(`farms.php?action=by-farmer&farmer_id=${farmerId}`);
    },
    
    async createFarm(data) {
        return this.request('farms.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async updateFarm(id, data) {
        return this.request(`farms.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async deleteFarm(id) {
        return this.request(`farms.php?action=delete&id=${id}`, {
            method: 'POST'
        });
    },
    
    async syncFarmsFromFarmers() {
        return this.request('farms.php?action=sync-from-farmers');
    },
    
    async createFarmer(data) {
        return this.request('farmers.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async updateFarmer(id, data) {
        return this.request(`farmers.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async deleteFarmer(id) {
        return this.request(`farmers.php?action=delete&id=${id}`, {
            method: 'POST'
        });
    },
    
    async searchFarmers(query) {
        return this.request(`farmers.php?action=search&q=${encodeURIComponent(query)}`);
    },
    
    // Seeds
    async getSeeds(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('seeds.php?action=list&' + query);
    },
    
    // Equipment
    async getEquipment(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('equipment.php?action=list&' + query);
    },
    
    // Distributions
    async getDistributions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('distributions.php?action=list&' + query);
    },
    
    async getDistributionsByYear(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('distributions.php?action=by-year&' + query);
    },
    
    async createDistribution(data) {
        return this.request('distributions.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Inventory
    async getInventory(type, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`inventory.php?type=${type}&action=list&` + query);
    },
    
    async getLowStock(type) {
        return this.request(`inventory.php?type=${type}&action=low-stock`);
    },
    
    async createInventoryItem(type, data) {
        return this.request(`inventory.php?type=${type}&action=create`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async updateInventoryItem(type, id, data) {
        return this.request(`inventory.php?type=${type}&action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async deleteInventoryItem(type, id) {
        return this.request(`inventory.php?type=${type}&action=delete&id=${id}`, {
            method: 'POST'
        });
    },
    
    async adjustStock(type, data) {
        return this.request(`inventory.php?type=${type}&action=adjust`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async getDistribution(id) {
        return this.request(`distributions.php?action=single&id=${id}`);
    },
    
    deleteDistribution(id) {
        return this.request('distributions.php?action=delete&id=' + id, {
            method: 'POST'
        });
    },
    
    // Schedules
    async getSchedules(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request('schedules.php?action=list&' + query);
    },
    
    async getSchedule(id) {
        return this.request('schedules.php?action=single&id=' + id);
    },
    
    async getUpcomingSchedules(days = 7) {
        return this.request(`schedules.php?action=upcoming&days=${days}`);
    },
    
    async getCalendarData(year, month) {
        return this.request(`schedules.php?action=calendar&year=${year}&month=${month}`);
    },
    
    async createSchedule(data) {
        return this.request('schedules.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async updateSchedule(id, data) {
        return this.request(`schedules.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async deleteSchedule(id) {
        return this.request(`schedules.php?action=delete&id=${id}`, {
            method: 'POST'
        });
    },
    
    async completeSchedule(id) {
        return this.request(`schedules.php?action=complete&id=${id}`, {
            method: 'POST'
        });
    },
    
    async cancelSchedule(id) {
        return this.request(`schedules.php?action=cancel&id=${id}`, {
            method: 'POST'
        });
    },
    
    // Sync
    async getPendingSync() {
        return this.request('sync.php?action=pending');
    },
    
    async syncData(operations) {
        return this.request('sync.php?action=sync', {
            method: 'POST',
            body: JSON.stringify({ operations })
        });
    },
    
    // Reports
    async getDistributionStats() {
        return this.request('distributions.php?action=stats');
    },
    
    // Analytics
    async getDistributionTrends(period = 'monthly', months = 12) {
        return this.request(`analytics.php?action=distribution_trends&period=${period}&months=${months}`);
    },
    
    async getMostRequested(type = 'all', limit = 10) {
        return this.request(`analytics.php?action=most_requested&type=${type}&limit=${limit}`);
    },
    
    async getFarmerActivity(limit = 20, sortBy = 'total') {
        return this.request(`analytics.php?action=farmer_activity&limit=${limit}&sort=${sortBy}`);
    },
    
    async getStockPredictions(days = 30) {
        return this.request(`analytics.php?action=stock_predictions&days=${days}`);
    },
    
    async getComparisonData(period1Start, period1End, period2Start, period2End) {
        let url = 'analytics.php?action=comparison';
        if (period1Start) url += `&period1_start=${period1Start}`;
        if (period1End) url += `&period1_end=${period1End}`;
        if (period2Start) url += `&period2_start=${period2Start}`;
        if (period2End) url += `&period2_end=${period2End}`;
        return this.request(url);
    },
    
    async getAnalyticsSummary() {
        return this.request('analytics.php?action=summary');
    },
    
    async getRegionalData() {
        return this.request('analytics.php?action=regional');
    },
    
    async getSeasonalData() {
        return this.request('analytics.php?action=seasonal');
    }
};

window.API = API;