const API = {
    baseUrl: 'api/',
    
    // Determine dynamic timeout based on connection quality
    getAdaptiveTimeout() {
        if (typeof Utils !== 'undefined' && Utils.getConnectionInfo) {
            const conn = Utils.getConnectionInfo();
            if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return 45000;
            if (conn.effectiveType === '3g') return 25000;
            return 15000;
        }
        return 20000;
    },

    // Core HTTP request handler with adaptive timeouts, retry logic, and offline caching
    request(endpoint, options, retryCount = 0) {
        options = options || {};
        var self = this;
        var token = localStorage.getItem('authToken');
        var method = (options.method || 'GET').toUpperCase();
        var body = options.body || null;
        var maxRetries = options.maxRetries !== undefined ? options.maxRetries : (method === 'GET' ? 2 : 1);
        var timeoutMs = options.timeout || self.getAdaptiveTimeout();

        // Check if browser is strictly offline
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            if (method === 'GET') {
                const cached = Utils.getCachedData(endpoint);
                if (cached) {
                    console.log(`[API] Serving offline cached data for: ${endpoint}`);
                    return Promise.resolve(Object.assign({}, cached, { _isOfflineCached: true }));
                }
                return Promise.reject(new Error('Offline Mode: No cached data available for this view.'));
            }
        }

        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, self.baseUrl + endpoint, true);
            xhr.timeout = timeoutMs;

            if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            if (body && typeof body === 'string') {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }

            xhr.onload = function() {
                var raw = xhr.responseText || '';
                if (!raw || raw.trim().length === 0) {
                    // Try fallback if GET
                    if (method === 'GET') {
                        const cached = Utils.getCachedData(endpoint);
                        if (cached) return resolve(Object.assign({}, cached, { _isOfflineCached: true }));
                    }
                    reject(new Error('Server returned empty response'));
                    return;
                }

                var clean = raw.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
                var si = -1;
                for (var i = 0; i < clean.length; i++) {
                    if (clean[i] === '{' || clean[i] === '[') { si = i; break; }
                }
                if (si === -1) {
                    if (method === 'GET') {
                        const cached = Utils.getCachedData(endpoint);
                        if (cached) return resolve(Object.assign({}, cached, { _isOfflineCached: true }));
                    }
                    reject(new Error('Server returned non-JSON response: ' + clean.substring(0, 200)));
                    return;
                }

                try {
                    var data = JSON.parse(clean.substring(si));
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Automatically cache successful GET requests
                        if (method === 'GET' && typeof Utils !== 'undefined' && Utils.cacheData) {
                            Utils.cacheData(endpoint, data);
                        }
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
                    if (method === 'GET') {
                        const cached = Utils.getCachedData(endpoint);
                        if (cached) return resolve(Object.assign({}, cached, { _isOfflineCached: true }));
                    }
                    reject(new Error('Invalid JSON from server: ' + clean.substring(0, 200)));
                }
            };

            xhr.onerror = function() {
                // Retry network failure with exponential backoff if retries left
                if (retryCount < maxRetries) {
                    const delay = Math.pow(2, retryCount) * 800;
                    console.warn(`[API] Request to ${endpoint} failed. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
                    setTimeout(() => {
                        self.request(endpoint, options, retryCount + 1).then(resolve).catch(reject);
                    }, delay);
                    return;
                }

                // Fallback to cache on GET if available
                if (method === 'GET') {
                    const cached = Utils.getCachedData(endpoint);
                    if (cached) {
                        console.log(`[API] Network error. Serving cached data for ${endpoint}`);
                        resolve(Object.assign({}, cached, { _isOfflineCached: true }));
                        return;
                    }
                }
                reject(new Error('Network error - could not reach server'));
            };

            xhr.ontimeout = function() {
                // Retry timeout once
                if (retryCount < maxRetries) {
                    console.warn(`[API] Request to ${endpoint} timed out. Retrying with extended timeout...`);
                    const extendedOptions = Object.assign({}, options, { timeout: timeoutMs + 10000 });
                    self.request(endpoint, extendedOptions, retryCount + 1).then(resolve).catch(reject);
                    return;
                }

                if (method === 'GET') {
                    const cached = Utils.getCachedData(endpoint);
                    if (cached) {
                        resolve(Object.assign({}, cached, { _isOfflineCached: true }));
                        return;
                    }
                }
                reject(new Error('Request timed out'));
            };

            xhr.send(body);
        });
    },

    // Helper for executing write operations with automatic offline queue fallback
    async executeWrite(endpoint, options, fallbackOperation) {
        try {
            return await this.request(endpoint, options);
        } catch (error) {
            // If offline or network unreachable and we have fallbackOperation info, queue locally
            if (fallbackOperation && (!navigator.onLine || error.message.includes('Network error') || error.message.includes('timed out'))) {
                console.log('[API] Network offline or unreachable. Enqueuing mutation locally:', fallbackOperation);
                const queuedItem = Utils.addToOfflineQueue(fallbackOperation);
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('warning', 'Saved Offline', 'Operation saved locally. Will synchronize automatically when connected.');
                }
                if (window.App && typeof App.updateConnectionIndicator === 'function') {
                    App.updateConnectionIndicator();
                }
                return {
                    success: true,
                    offline_queued: true,
                    queued_item: queuedItem,
                    message: 'Record queued offline. Will sync with server automatically.'
                };
            }
            throw error;
        }
    },
    
    // Auth
    async login(username, password) {
        return this.request('auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
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
        return this.executeWrite('users.php?action=create', {
            method: 'POST',
            body: JSON.stringify(userData)
        }, {
            table_name: 'users',
            operation: 'INSERT',
            data: userData
        });
    },
    
    async updateUser(id, userData) {
        return this.executeWrite(`users.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(userData)
        }, {
            table_name: 'users',
            operation: 'UPDATE',
            record_id: id,
            data: userData
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
    
    async searchFarmers(query) {
        return this.request(`farmers.php?action=search&q=${encodeURIComponent(query)}`);
    },

    async createFarmer(data) {
        return this.executeWrite('farmers.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: 'farmers',
            operation: 'INSERT',
            data: data
        });
    },
    
    async updateFarmer(id, data) {
        return this.executeWrite(`farmers.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: 'farmers',
            operation: 'UPDATE',
            record_id: id,
            data: data
        });
    },
    
    async deleteFarmer(id) {
        return this.executeWrite(`farmers.php?action=delete&id=${id}`, {
            method: 'POST'
        }, {
            table_name: 'farmers',
            operation: 'DELETE',
            record_id: id
        });
    },

    // Farms
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
        return this.executeWrite('farms.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: 'farms',
            operation: 'INSERT',
            data: data
        });
    },
    
    async updateFarm(id, data) {
        return this.executeWrite(`farms.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: 'farms',
            operation: 'UPDATE',
            record_id: id,
            data: data
        });
    },
    
    async deleteFarm(id) {
        return this.executeWrite(`farms.php?action=delete&id=${id}`, {
            method: 'POST'
        }, {
            table_name: 'farms',
            operation: 'DELETE',
            record_id: id
        });
    },
    
    async syncFarmsFromFarmers() {
        return this.request('farms.php?action=sync-from-farmers');
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
    
    async checkFarmerToday(farmerId, date) {
        return this.request(`distributions.php?action=check-farmer-today&farmer_id=${farmerId}&date=${date || ''}`);
    },
    
    async createDistribution(data) {
        return this.executeWrite('distributions.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: 'distributions',
            operation: 'INSERT',
            data: data
        });
    },

    async getDistribution(id) {
        return this.request(`distributions.php?action=single&id=${id}`);
    },
    
    async deleteDistribution(id) {
        return this.executeWrite('distributions.php?action=delete&id=' + id, {
            method: 'POST'
        }, {
            table_name: 'distributions',
            operation: 'DELETE',
            record_id: id
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
        const tableName = type === 'seed' ? 'seeds_inventory' : 'equipment_inventory';
        return this.executeWrite(`inventory.php?type=${type}&action=create`, {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: tableName,
            operation: 'INSERT',
            data: data
        });
    },
    
    async updateInventoryItem(type, id, data) {
        const tableName = type === 'seed' ? 'seeds_inventory' : 'equipment_inventory';
        return this.executeWrite(`inventory.php?type=${type}&action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: tableName,
            operation: 'UPDATE',
            record_id: id,
            data: data
        });
    },
    
    async deleteInventoryItem(type, id) {
        const tableName = type === 'seed' ? 'seeds_inventory' : 'equipment_inventory';
        return this.executeWrite(`inventory.php?type=${type}&action=delete&id=${id}`, {
            method: 'POST'
        }, {
            table_name: tableName,
            operation: 'DELETE',
            record_id: id
        });
    },
    
    async adjustStock(type, data) {
        return this.request(`inventory.php?type=${type}&action=adjust`, {
            method: 'POST',
            body: JSON.stringify(data)
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
        return this.executeWrite('schedules.php?action=create', {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: 'schedules',
            operation: 'INSERT',
            data: data
        });
    },
    
    async updateSchedule(id, data) {
        return this.executeWrite(`schedules.php?action=update&id=${id}`, {
            method: 'POST',
            body: JSON.stringify(data)
        }, {
            table_name: 'schedules',
            operation: 'UPDATE',
            record_id: id,
            data: data
        });
    },
    
    async deleteSchedule(id) {
        return this.executeWrite(`schedules.php?action=delete&id=${id}`, {
            method: 'POST'
        }, {
            table_name: 'schedules',
            operation: 'DELETE',
            record_id: id
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

    // Sync Local Offline Queue to Server
    async syncLocalOfflineQueue() {
        if (!navigator.onLine) return { success: false, message: 'Device is offline' };
        
        const localQueue = Utils.getOfflineQueue();
        if (!localQueue || localQueue.length === 0) {
            return { success: true, count: 0, message: 'No offline items to sync' };
        }

        console.log(`[API] Syncing ${localQueue.length} offline operations to server...`);
        const result = await this.syncData(localQueue);
        if (result && result.success) {
            Utils.clearOfflineQueue();
            return { success: true, count: localQueue.length, result };
        }
        return result;
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