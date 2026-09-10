const Pages = {
    pages: {},
    
    async loadPage(pageName) {
        const contentArea = document.getElementById('content-area');
        
        switch(pageName) {
            case 'dashboard':
                contentArea.innerHTML = this.dashboardPage();
                this.initDashboard();
                break;
            case 'farmers':
                contentArea.innerHTML = this.farmersPage();
                await this.initFarmers();
                break;
            case 'farm':
                contentArea.innerHTML = this.farmPage();
                await this.initFarm();
                break;
            case 'inventory':
                contentArea.innerHTML = this.inventoryPage();
                this.initInventory();
                break;
            case 'distributions':
                contentArea.innerHTML = this.distributionsPage();
                this.initDistributions();
                break;
            case 'schedules':
                contentArea.innerHTML = this.schedulesPage();
                this.initSchedules();
                break;
            case 'reports':
                contentArea.innerHTML = this.reportsPage();
                this.initReports();
                break;
            case 'settings':
                contentArea.innerHTML = this.settingsPage();
                this.initSettings();
                break;
            default:
                contentArea.innerHTML = '<div class="empty-state"><h3>Page not found</h3></div>';
        }
    },
    
    // Farmers Page
    farmersPage() {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Farmer</h1>
                    <p class="page-subtitle">Manage farmer information and details</p>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary-outline" id="import-farmer-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
                        Import Farmer Data
                    </button>
                    <button class="btn btn-primary" id="add-farmer-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add Farmer
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="table-header">
                    <div class="search-box">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="farmer-search" placeholder="Search farmers...">
                    </div>
                </div>
                <div class="table-container">
                    <table id="farmers-table">
                        <thead>
                            <tr>
                                <th>RSBSA Number</th>
                                <th>Farmer Name</th>
                                <th>Contact Number</th>
                                <th>Sex</th>
                                <th>Birthdate</th>
                                <th>Barangay</th>
                                <th>Municipality</th>
                                <th>Province</th>
                                <th>Farm Size</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="farmers-tbody">
                            <tr>
                                <td colspan="11" class="text-center">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination" id="farmers-pagination">
                    <div class="pagination-info" id="pagination-info">Showing 0 to 0 of 0 records</div>
                    <div class="pagination-controls" id="pagination-controls"></div>
                </div>
            </div>
        `;
    },
    
    async initFarmers() {
        await this.loadFarmers();
        
        document.getElementById('add-farmer-btn').addEventListener('click', () => this.showFarmerModal());
        document.getElementById('import-farmer-btn').addEventListener('click', () => this.importFarmers());
        
        document.getElementById('farmer-search').addEventListener('input', Utils.debounce(async (e) => {
            await this.searchFarmers(e.target.value);
        }, 300));
    },
    
    async loadFarmers(page = 1) {
        try {
            const response = await API.getFarmers({ page, limit: 10 });
            this.renderFarmersTable(response.data);
            this.renderPagination(response.pagination);
        } catch (error) {
            console.error('loadFarmers error:', error);
            Utils.showToast('error', 'Error', 'Failed to load farmers: ' + (error.message || 'Unknown error'));
        }
    },
    
    renderFarmersTable(farmers) {
        const tbody = document.getElementById('farmers-tbody');
        
        if (!farmers || farmers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">No farmers found</td></tr>';
            return;
        }
        
        tbody.innerHTML = farmers.map(farmer => `
            <tr>
                <td>${farmer.rsbsa_number || '-'}</td>
                <td>${farmer.name}</td>
                <td>${farmer.phone || farmer.contact || '-'}</td>
                <td>${farmer.sex || '-'}</td>
                <td>${farmer.birthdate && farmer.birthdate !== '0000-00-00' ? farmer.birthdate : '-'}</td>
                <td>${farmer.barangay || '-'}</td>
                <td>${farmer.municipality || '-'}</td>
                <td>${farmer.province || '-'}</td>
                <td>${(farmer.total_farm_size || farmer.farm_size) ? (farmer.total_farm_size || farmer.farm_size) + ' ' + (farmer.farm_size_unit || 'ha') : '-'}</td>
                <td>
                    <span class="badge-status ${farmer.status}">${farmer.status || 'active'}</span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="Pages.editFarmer(${farmer.id})" title="Edit">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="Pages.deleteFarmer(${farmer.id})" title="Delete">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    renderPagination(pagination) {
        const info = document.getElementById('pagination-info');
        const controls = document.getElementById('pagination-controls');
        
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        
        info.textContent = `Showing ${start} to ${end} of ${pagination.total} records`;
        
        let buttons = '';
        
        if (pagination.pages > 1) {
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadFarmers(1)" title="First">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadFarmers(${pagination.page - 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>`;
            
            const maxVisible = 5;
            let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
            let endPage = Math.min(pagination.pages, startPage + maxVisible - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                buttons += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="Pages.loadFarmers(${i})">${i}</button>`;
            }
            
            if (endPage < pagination.pages) {
                buttons += `<span class="pagination-dots">...</span>`;
            }
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadFarmers(${pagination.page + 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadFarmers(${pagination.pages})" title="Last">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
        }
        
        controls.innerHTML = buttons;
    },
    
    async searchFarmers(query) {
        try {
            const response = query ? await API.searchFarmers(query) : await API.getFarmers();
            this.renderFarmersTable(response.data);
        } catch (error) {
            console.error('Search error:', error);
            Utils.showToast('error', 'Error', error.message || 'Search failed');
        }
    },
    
    showFarmerModal(farmer = null) {
        const isEdit = farmer !== null;
        document.getElementById('modal-title').textContent = isEdit ? 'Edit Farmer' : 'Add Farmer';
        
        document.getElementById('modal-body').innerHTML = `
            <form id="farmer-form" class="app-form" onsubmit="event.preventDefault(); Pages.saveFarmer(${farmer?.id || null});">
                <div class="grid-2">
                    <div class="form-group">
                        <label>RSBSA Number *</label>
                        <input type="text" class="form-control" name="rsbsa_number" value="${farmer?.rsbsa_number || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="form-group">
                        <label>Sex *</label>
                        <select class="form-control" name="sex" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                            <option value="">Select Sex</option>
                            <option value="MALE" ${farmer?.sex === 'MALE' ? 'selected' : ''}>Male</option>
                            <option value="FEMALE" ${farmer?.sex === 'FEMALE' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Last Name *</label>
                        <input type="text" class="form-control" name="last_name" value="${farmer?.last_name || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="form-group">
                        <label>First Name *</label>
                        <input type="text" class="form-control" name="first_name" value="${farmer?.first_name || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Middle Name</label>
                        <input type="text" class="form-control" name="middle_name" value="${farmer?.middle_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Suffix/Extension</label>
                        <input type="text" class="form-control" name="extension" value="${farmer?.extension || ''}" placeholder="e.g., Jr., Sr., III">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Birthdate *</label>
                        <input type="date" class="form-control" name="birthdate" value="${farmer?.birthdate || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="form-group">
                        <label>Contact No. *</label>
                        <input type="text" class="form-control" name="phone" value="${farmer?.phone || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                </div>
                <div class="form-group">
                    <label>Barangay *</label>
                    <input type="text" class="form-control" name="barangay" value="${farmer?.barangay || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Municipality *</label>
                        <input type="text" class="form-control" name="municipality" value="${farmer?.municipality || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="form-group">
                        <label>Province *</label>
                        <input type="text" class="form-control" name="province" value="${farmer?.province || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Farm Area *</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" step="0.01" class="form-control" name="farm_size" value="${farmer?.farm_size || ''}" style="flex: 1" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                            <select class="form-control" name="farm_size_unit" style="width: 80px" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                                <option value="hectares" ${farmer?.farm_size_unit === 'hectares' ? 'selected' : ''}>ha</option>
                                <option value="acres" ${farmer?.farm_size_unit === 'acres' ? 'selected' : ''}>acres</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Commodity *</label>
                        <input type="text" class="form-control" name="crop_type" value="${farmer?.crop_type || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                </div>
                <div class="form-group">
                    <label>Status *</label>
                    <select class="form-control" name="status" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                        <option value="active" ${farmer?.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${farmer?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
            </form>
        `;
        
        document.getElementById('modal-footer').innerHTML = `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.saveFarmer(${farmer?.id || null})">${isEdit ? 'Update' : 'Save'}</button>
        `;
        
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    
    async saveFarmer(id = null) {
        const form = document.getElementById('farmer-form');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (id) {
                await API.updateFarmer(id, data);
                Utils.showToast('success', 'Success', 'Farmer updated successfully');
            } else {
                await API.createFarmer(data);
                Utils.showToast('success', 'Success', 'Farmer created successfully');
            }
            
            App.closeModal();
            await this.loadFarmers();
        } catch (error) {
            Utils.showToast('error', 'Error', error.message);
        }
    },
    
    async editFarmer(id) {
        try {
            const response = await API.getFarmer(id);
            this.showFarmerModal(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load farmer');
        }
    },
    
    async deleteFarmer(id) {
        if (!confirm('Are you sure you want to delete this farmer?')) return;
        if (this.deleteInProgress) return;
        this.deleteInProgress = true;
        
        try {
            await API.deleteFarmer(id);
            Utils.showToast('success', 'Success', 'Farmer deleted successfully');
            await this.loadFarmers();
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to delete farmer');
        } finally {
            this.deleteInProgress = false;
        }
    },
    
    // Dashboard Page
    dashboardPage() {
        return `
            <div class="page-header">
                <h1>Dashboard</h1>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    </div>
                    <div class="stat-content">
                        <h3 id="stat-total-farmers">-</h3>
                        <p>Total Farmers</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.33z"/></svg>
                    </div>
                    <div class="stat-content">
                        <h3 id="stat-registered-farms">-</h3>
                        <p>Registered Farms</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                    <div class="stat-content">
                        <h3 id="stat-seed-stocks">-</h3>
                        <p>Seed Stocks (Kg)</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
                    </div>
                    <div class="stat-content">
                        <h3 id="stat-equipment-stocks">-</h3>
                        <p>Equipment Stocks (Units)</p>
                    </div>
                </div>
            </div>
            
            <div class="grid-2 dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Distribute Seeds & Equipment</h3>
                    </div>
                    <div class="card-body">
                        <form id="distribution-form" class="app-form">
                            <div class="form-group">
                                <label>Select Farmer</label>
                                <select class="form-control" name="farmer_id" id="dist-farmer-select" onchange="Pages.onFarmerChangeDash(this)">
                                    <option value="">Loading farmers...</option>
                                </select>
                            </div>
                            <div class="form-group" id="dash-farm-info" style="display: none;">
                                <label>Farm Size</label>
                                <div class="form-control" style="background: #f5f5f5; display: flex; align-items: center;">
                                    <span id="dash-farm-size-display" style="color: #666;"></span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Items to Distribute *</label>
                                <div id="dash-distribution-items-container">
                                    <div class="distribution-item-row" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start;">
                                        <div style="flex: 2;">
                                            <select class="form-control item-select" name="items[0][type]" onchange="Pages.updateItemQuantityDash(this)" required>
                                                <option value="">Loading items...</option>
                                            </select>
                                        </div>
                                        <div style="flex: 1; position: relative;">
                                            <input type="number" class="form-control" name="items[0][quantity]" placeholder="Qty" min="1" value="1" required oninput="Pages.validateItemQuantityDash(this)">
                                        </div>
                                        <button type="button" class="btn btn-icon btn-delete" onclick="Pages.removeDistributionItemDash(this)" style="padding: 6px 10px;">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-secondary-outline btn-sm" onclick="Pages.addDistributionItemDash()" style="margin-top: 5px;">
                                    + Add Another Item
                                </button>
                            </div>
                            <button type="submit" class="btn btn-primary btn-distribute" id="dash-distribute-btn" style="width: 100%; margin-top: 10px;">Distribute</button>
                        </form>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3>Seed & Equipment</h3>
                    </div>
                    <div class="card-body">
                        <div id="stock-list">
                            <div class="stock-item">
                                <div class="stock-info">
                                    <span class="stock-name">Loading...</span>
                                    <span class="stock-qty">-</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Distribution Summary</h3>
                </div>
                <div class="table-container">
                    <table id="distribution-table">
                        <thead>
                            <tr>
                                <th>Farmer</th>
                                <th>Item</th>
                                <th>Quantity</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody id="distribution-tbody">
                            <tr>
                                <td colspan="4" class="text-center">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    async initDashboard() {
        try {
            const [statsRes, farmersRes, seedsRes, equipRes, distributionsRes] = await Promise.all([
                API.getDashboardStats(),
                API.getFarmers({ limit: 100 }),
                API.getSeeds({ limit: 100 }),
                API.getEquipment({ limit: 100 }),
                API.getDistributions({ limit: 10 })
            ]);
            
            const stats = statsRes.data;
            
            document.getElementById('stat-total-farmers').textContent = stats.farmers?.total || 0;
            document.getElementById('stat-registered-farms').textContent = stats.farms?.total || 0;
            
            const totalSeeds = seedsRes.data.reduce((sum, s) => sum + Math.max(0, parseFloat(s.quantity) || 0), 0);
            document.getElementById('stat-seed-stocks').textContent = totalSeeds + ' Kg';
            
            const totalEquip = equipRes.data.reduce((sum, e) => sum + Math.max(0, parseInt(e.quantity) || 0), 0);
            document.getElementById('stat-equipment-stocks').textContent = totalEquip + ' Units';
            
            this.loadDistributionForm(farmersRes.data, seedsRes.data, equipRes.data);
            this.loadStockList(seedsRes.data, equipRes.data);
            this.loadDistributionTable(distributionsRes.data);
        } catch (error) {
            console.error('Dashboard stats error:', error);
        }
    },
    
    seedOptionsDash: '',
    equipOptionsDash: '',
    dashInventoryStock: {},

    loadDistributionForm(farmers, seeds, equipment) {
        const farmerSelect = document.getElementById('dist-farmer-select');
        const container = document.getElementById('dash-distribution-items-container');
        
        if (farmerSelect) {
            farmerSelect.innerHTML = '<option value="">Select Farmer</option>' + 
                farmers.sort((a, b) => a.name.localeCompare(b.name)).map(f => {
                    var size = (parseFloat(f.total_farm_size) > 0) ? parseFloat(f.total_farm_size) : (parseFloat(f.farm_size) || 0);
                    return `<option value="${f.id}" data-farm-size="${size}">${f.name}${size > 0 ? ' (' + size + ' ha)' : ''}</option>`;
                }).join('');
        }
        
        this.seedOptionsDash = seeds.map(s => {
            const qty = parseFloat(s.quantity) || 0;
            const disabled = qty <= 0 ? 'disabled' : '';
            const label = qty <= 0 ? ' [OUT OF STOCK]' : '';
            return `<option value="seed_${s.id}" data-qty="${s.quantity}" ${disabled}>${s.crop_type} - ${s.variety} (${qty} ${s.unit || 'Kg'})${label}</option>`;
        }).join('');

        this.equipOptionsDash = equipment.map(e => {
            const qty = parseFloat(e.quantity) || 0;
            const disabled = qty <= 0 ? 'disabled' : '';
            const label = qty <= 0 ? ' [OUT OF STOCK]' : '';
            return `<option value="equip_${e.id}" data-qty="${e.quantity}" ${disabled}>${e.name} (${qty} units)${label}</option>`;
        }).join('');
        
        this.dashInventoryStock = {};
        seeds.forEach(s => { this.dashInventoryStock['seed_' + s.id] = parseFloat(s.quantity) || 0; });
        equipment.forEach(e => { this.dashInventoryStock['equip_' + e.id] = parseFloat(e.quantity) || 0; });

        if (container) {
            container.innerHTML = `
                <div class="distribution-item-row" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start;">
                    <div style="flex: 2;">
                        <select class="form-control item-select" name="items[0][type]" onchange="Pages.updateItemQuantityDash(this)" required>
                            <option value="">Select Item</option>
                            <optgroup label="Seeds">${this.seedOptionsDash}</optgroup>
                            <optgroup label="Equipment">${this.equipOptionsDash}</optgroup>
                        </select>
                    </div>
                    <div style="flex: 1; position: relative;">
                        <input type="number" class="form-control" name="items[0][quantity]" placeholder="Qty" min="1" value="1" required oninput="Pages.validateItemQuantityDash(this)">
                    </div>
                    <button type="button" class="btn btn-icon btn-delete" onclick="Pages.removeDistributionItemDash(this)" style="padding: 6px 10px;">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
            `;
        }

        const distForm = document.getElementById('distribution-form');
        if (distForm && !distForm.dataset.listenerAdded) {
            distForm.dataset.listenerAdded = 'true';
            distForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const farmerId = form.querySelector('[name="farmer_id"]')?.value;
                
                if (!farmerId) {
                    Utils.showToast('error', 'Error', 'Please select a farmer');
                    return;
                }
                
                const itemRows = form.querySelectorAll('.distribution-item-row');
                const items = [];
                const selectedItemKeys = new Set();

                for (let i = 0; i < itemRows.length; i++) {
                    const row = itemRows[i];
                    const select = row.querySelector('.item-select');
                    const qtyInput = row.querySelector('input[name*="quantity"]');
                    const val = select ? select.value : '';
                    const qty = parseFloat(qtyInput ? qtyInput.value : 0);

                    if (!val) {
                        Utils.showToast('error', 'Error', 'Please select an item for all rows');
                        return;
                    }
                    if (selectedItemKeys.has(val)) {
                        Utils.showToast('error', 'Duplicate Item', 'The same item was selected multiple times. Please combine quantities.');
                        return;
                    }
                    selectedItemKeys.add(val);

                    if (!qty || qty <= 0) {
                        Utils.showToast('error', 'Error', 'Please enter a valid quantity for all selected items');
                        return;
                    }

                    const [type, id] = val.split('_');
                    items.push({
                        item_type: type === 'equip' ? 'equipment' : type,
                        item_id: parseInt(id),
                        quantity: qty
                    });
                }

                if (items.length === 0) {
                    Utils.showToast('error', 'Error', 'Please add at least one item to distribute');
                    return;
                }

                try {
                    var todayCheck = await API.checkFarmerToday(farmerId, new Date().toISOString().split('T')[0]);
                    if (todayCheck.has_distribution) {
                        Utils.showToast('error', 'Already Distributed Today', 'This farmer has already received a distribution today. Only one distribution per farmer per day is allowed.');
                        return;
                    }
                } catch (checkErr) {
                    Utils.showToast('error', 'Error', 'Failed to verify farmer distribution status');
                    return;
                }

                try {
                    var freshSeeds = await API.getSeeds({ limit: 100 });
                    var freshEquip = await API.getEquipment({ limit: 100 });
                    var freshStock = {};
                    (freshSeeds.data || []).forEach(s => { freshStock['seed_' + s.id] = parseFloat(s.quantity) || 0; });
                    (freshEquip.data || []).forEach(e => { freshStock['equip_' + e.id] = parseFloat(e.quantity) || 0; });

                    for (let it of items) {
                        const prefix = it.item_type === 'equipment' ? 'equip_' : 'seed_';
                        const key = prefix + it.item_id;
                        const avail = freshStock[key] || 0;
                        if (it.quantity > avail) {
                            Utils.showToast('error', 'Insufficient Stock', `Requested ${it.quantity} but only ${avail} available in stock.`);
                            return;
                        }
                    }
                } catch (stockErr) {
                    Utils.showToast('error', 'Error', 'Failed to verify stock availability');
                    return;
                }

                const payload = {
                    farmer_id: farmerId,
                    items: items
                };

                try {
                    await API.createDistribution(payload);
                    Utils.showToast('success', 'Success', 'Distribution created successfully');
                    form.reset();
                    this.initDashboard();
                } catch (error) {
                    Utils.showToast('error', 'Error', error.message);
                }
            });
        }
    },

    addDistributionItemDash() {
        var container = document.getElementById('dash-distribution-items-container');
        if (!container) return;
        var index = container.children.length;
        
        var row = document.createElement('div');
        row.className = 'distribution-item-row';
        row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start;';
        row.innerHTML = `
            <div style="flex: 2;">
                <select class="form-control item-select" name="items[${index}][type]" onchange="Pages.updateItemQuantityDash(this)" required>
                    <option value="">Select Item</option>
                    <optgroup label="Seeds">${this.seedOptionsDash || ''}</optgroup>
                    <optgroup label="Equipment">${this.equipOptionsDash || ''}</optgroup>
                </select>
            </div>
            <div style="flex: 1; position: relative;">
                <input type="number" class="form-control" name="items[${index}][quantity]" placeholder="Qty" min="1" value="1" required oninput="Pages.validateItemQuantityDash(this)">
            </div>
            <button type="button" class="btn btn-icon btn-delete" onclick="Pages.removeDistributionItemDash(this)" style="padding: 6px 10px;">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        `;
        
        container.appendChild(row);
    },
    
    removeDistributionItemDash(btn) {
        var container = document.getElementById('dash-distribution-items-container');
        if (container && container.children.length > 1) {
            btn.closest('.distribution-item-row').remove();
        } else {
            Utils.showToast('warning', 'Notice', 'At least one item is required for distribution');
        }
    },
    
    updateItemQuantityDash(select) {
        var itemType = select.value;
        var row = select.closest('.distribution-item-row');
        var quantityInput = row ? row.querySelector('input[name*="quantity"]') : null;
        if (!quantityInput) return;
        
        var stock = this.dashInventoryStock ? (this.dashInventoryStock[itemType] || 0) : 0;
        
        var stockInfo = row.querySelector('.stock-info-label');
        if (!stockInfo) {
            stockInfo = document.createElement('div');
            stockInfo.className = 'stock-info-label';
            stockInfo.style.cssText = 'font-size: 11px; margin-top: 2px;';
            quantityInput.parentNode.appendChild(stockInfo);
        }
        
        var qtyWarning = row.querySelector('.qty-warning-label');
        if (!qtyWarning) {
            qtyWarning = document.createElement('div');
            qtyWarning.className = 'qty-warning-label';
            qtyWarning.style.cssText = 'font-size: 11px; color: #ef4444; margin-top: 2px; display: none;';
            quantityInput.parentNode.appendChild(qtyWarning);
        }
        
        quantityInput.classList.remove('stock-valid', 'stock-invalid', 'stock-warning');
        
        if (!itemType) {
            stockInfo.style.display = 'none';
            qtyWarning.style.display = 'none';
            return;
        }

        if (stock <= 0) {
            select.value = '';
            quantityInput.value = '';
            quantityInput.removeAttribute('max');
            quantityInput.classList.add('stock-invalid');
            stockInfo.textContent = '0 - OUT OF STOCK';
            stockInfo.style.color = '#991b1b';
            stockInfo.style.display = 'block';
            qtyWarning.textContent = 'Out of stock';
            qtyWarning.style.display = 'block';
            return;
        }
        
        stockInfo.textContent = 'Available: ' + stock;
        stockInfo.style.color = '#166534';
        stockInfo.style.display = 'block';
        qtyWarning.style.display = 'none';
        
        quantityInput.setAttribute('min', '1');
        quantityInput.setAttribute('max', stock);
        quantityInput.classList.add('stock-valid');
        
        var farmerSelect = document.getElementById('dist-farmer-select');
        var farmSize = farmerSelect ? (parseFloat(farmerSelect.getAttribute('data-farm-size')) || 0) : 0;
        if (farmSize > 0 && itemType.startsWith('seed_')) {
            var calculated = Math.ceil(farmSize * 2);
            quantityInput.value = Math.min(calculated, stock);
        }
        
        var currentVal = parseFloat(quantityInput.value) || 0;
        if (currentVal > stock) {
            quantityInput.value = stock;
        }
        if (currentVal < 1 || currentVal === 0) {
            quantityInput.value = Math.min(1, stock);
        }
        
        this.validateItemQuantityDash(quantityInput);
    },
    
    validateItemQuantityDash(input) {
        var row = input.closest('.distribution-item-row');
        if (!row) return;
        var select = row.querySelector('.item-select');
        var itemType = select ? select.value : '';
        var stock = this.dashInventoryStock ? (this.dashInventoryStock[itemType] || 0) : 0;
        var qtyWarning = row.querySelector('.qty-warning-label');
        var val = parseFloat(input.value) || 0;

        if (itemType && val > stock) {
            input.value = stock;
            if (qtyWarning) {
                qtyWarning.textContent = 'Max available is ' + stock;
                qtyWarning.style.display = 'block';
            }
        } else if (qtyWarning) {
            qtyWarning.style.display = 'none';
        }
    },
    
    loadStockList(seeds, equipment) {
        const stockList = document.getElementById('stock-list');
        
        let html = '';
        const maxSeed = Math.max(100, ...(seeds || []).map(s => parseFloat(s.quantity) || 0));
        (seeds || []).forEach(seed => {
            const qty = Math.max(0, parseFloat(seed.quantity) || 0);
            const threshold = parseFloat(seed.threshold) || 10;
            const pct = Math.min(100, Math.max(0, Math.round((qty / maxSeed) * 100)));
            
            let color = '#22C55E';
            const statusText = seed.status || (qty <= 0 ? 'out_of_stock' : (qty <= threshold ? 'low_stock' : 'available'));
            if (qty <= 0 || statusText === 'out_of_stock') {
                color = '#EF4444';
            } else if (qty <= threshold || statusText === 'low_stock') {
                color = '#F59E0B';
            }

            html += `
                <div class="stock-item">
                    <div class="stock-info">
                        <span class="stock-name">${seed.variety || seed.crop_type}</span>
                        <span class="stock-qty" style="font-weight: 500; color: ${color};">${qty} ${seed.unit || 'Kg'}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pct}%; background-color: ${color};"></div>
                    </div>
                </div>
            `;
        });
        
        const maxEquip = Math.max(50, ...(equipment || []).map(e => parseInt(e.quantity) || 0));
        (equipment || []).forEach(equip => {
            const qty = Math.max(0, parseInt(equip.quantity) || 0);
            const threshold = parseInt(equip.threshold) || 5;
            const pct = Math.min(100, Math.max(0, Math.round((qty / maxEquip) * 100)));
            
            let color = '#22C55E';
            const statusText = equip.status || (qty <= 0 ? 'out_of_stock' : (qty <= threshold ? 'low_stock' : 'available'));
            if (qty <= 0 || statusText === 'out_of_stock') {
                color = '#EF4444';
            } else if (qty <= threshold || statusText === 'low_stock') {
                color = '#F59E0B';
            }

            html += `
                <div class="stock-item">
                    <div class="stock-info">
                        <span class="stock-name">${equip.name}</span>
                        <span class="stock-qty" style="font-weight: 500; color: ${color};">${qty} units</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pct}%; background-color: ${color};"></div>
                    </div>
                </div>
            `;
        });
        
        if (stockList) stockList.innerHTML = html || '<p class="text-center">No stock data</p>';
    },
    
    loadDistributionTable(distributions) {
        const tbody = document.getElementById('distribution-tbody');
        
        if (!distributions || distributions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No distributions found</td></tr>';
            return;
        }
        
        const html = distributions.map(d => {
            const itemsHtml = (d.items || []).map(i => {
                if (!i.item_type || i.item_type === '') {
                    return 'Unknown Item';
                }
                if (i.item_type === 'seed') {
                    return i.seed_variety || i.item_name || 'Seed';
                }
                if (i.item_type === 'equipment') {
                    return i.equip_name || i.equip_category || i.item_name || 'Equipment';
                }
                return i.item_name || 'Item';
            }).join(', ');
            return `
            <tr>
                <td>${d.farmer_name || d.rsbsa_number || 'Farmer #' + d.farmer_id}</td>
                <td>${itemsHtml}</td>
                <td>${d.total_items}</td>
                <td>${d.distribution_date}</td>
            </tr>
        `}).join('');
        
        tbody.innerHTML = html;
    },
    
    onFarmerChangeDash(select) {
        var farmerId = select.value;
        var farmInfoDiv = document.getElementById('dash-farm-info');
        var farmSizeDisplay = document.getElementById('dash-farm-size-display');
        
        if (!farmerId) {
            if (farmInfoDiv) farmInfoDiv.style.display = 'none';
            select.removeAttribute('data-farm-size');
            return;
        }

        var opt = select.options[select.selectedIndex];
        var immediateSize = opt ? (parseFloat(opt.getAttribute('data-farm-size')) || 0) : 0;
        if (immediateSize > 0 && farmSizeDisplay) {
            select.setAttribute('data-farm-size', immediateSize);
            farmSizeDisplay.textContent = immediateSize + ' ha';
            if (farmInfoDiv) farmInfoDiv.style.display = 'block';
        }
        
        select.disabled = true;
        
        API.getFarmer(farmerId).then(function(res) {
            select.disabled = false;
            var farmer = res ? res.data : null;
            if (farmer) {
                var size = (parseFloat(farmer.total_farm_size) > 0) ? parseFloat(farmer.total_farm_size) : (parseFloat(farmer.farm_size) || 0);
                select.setAttribute('data-farm-size', size);
                if (size > 0 && farmSizeDisplay) {
                    farmSizeDisplay.textContent = size + ' ha';
                    if (farmInfoDiv) farmInfoDiv.style.display = 'block';
                }
                
                var rows = document.querySelectorAll('#dash-distribution-items-container .distribution-item-row');
                rows.forEach(function(row) {
                    var itemSel = row.querySelector('.item-select');
                    if (itemSel && itemSel.value) {
                        Pages.updateItemQuantityDash(itemSel);
                    }
                });
            }
        }).catch(function() {
            select.disabled = false;
        });
    },
    
    async loadDashboardCharts() {
        try {
            console.log('Loading dashboard charts...');
            
            const [trendsRes, requestedRes] = await Promise.all([
                API.getDistributionTrends('monthly', 6),
                API.getMostRequested('all', 5)
            ]);
            
            console.log('Trends data:', trendsRes);
            console.log('Requested data:', requestedRes);
            
            const trendData = trendsRes.data;
            const trendCanvas = document.getElementById('dashboard-trend-chart');
            
            if (trendCanvas) {
                const trendCtx = trendCanvas.getContext('2d');
                const existingTrendChart = Chart.getChart(trendCanvas);
                if (existingTrendChart) existingTrendChart.destroy();
                
                new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: trendData.map(d => d.month_label || d.date || d.year),
                        datasets: [{
                            label: 'Distributions',
                            data: trendData.map(d => parseInt(d.distributions) || 0),
                            borderColor: '#22C55E',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } },
                        animation: { duration: 1000 }
                    }
                });
                console.log('Trend chart created');
            }
            
            const itemsCanvas = document.getElementById('dashboard-items-chart');
            if (itemsCanvas) {
                const itemsCtx = itemsCanvas.getContext('2d');
                const existingItemsChart = Chart.getChart(itemsCanvas);
                if (existingItemsChart) existingItemsChart.destroy();
                
                const seeds = requestedRes.data?.seeds || [];
                const equipment = requestedRes.data?.equipment || [];
                
                const allItems = [
                    ...seeds.slice(0, 3).map(s => ({ name: s.crop_type, qty: parseInt(s.total_distributed) || 0 })),
                    ...equipment.slice(0, 2).map(e => ({ name: e.name, qty: parseInt(e.total_distributed) || 0 }))
                ];
                
                console.log('All items for chart:', allItems);
                
                if (allItems.length > 0) {
                    new Chart(itemsCtx, {
                        type: 'bar',
                        data: {
                            labels: allItems.map(i => i.name),
                            datasets: [{
                                label: 'Distributed',
                                data: allItems.map(i => i.qty),
                                backgroundColor: '#3B82F6'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y',
                            plugins: { legend: { display: false } },
                            scales: { x: { beginAtZero: true } },
                            animation: { duration: 1000 }
                        }
                    });
                    console.log('Items chart created');
                } else {
                    itemsCanvas.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to load dashboard charts:', error);
        }
    },
    
    async loadStockAlerts() {
        try {
            const response = await API.getStockPredictions(30);
            const data = response.data;
            
            const alertsContainer = document.getElementById('stock-alerts');
            if (!alertsContainer) return;
            
            const highAlerts = data.filter(d => d.alert_level === 'high');
            const mediumAlerts = data.filter(d => d.alert_level === 'medium');
            
            let html = '';
            highAlerts.slice(0, 2).forEach(item => {
                html += `<div class="alert alert-danger"><strong>CRITICAL:</strong> ${item.name} - only ${item.current_quantity} ${item.unit} left (${item.days_until_empty} days)</div>`;
            });
            mediumAlerts.slice(0, 2).forEach(item => {
                html += `<div class="alert alert-warning"><strong>LOW STOCK:</strong> ${item.name} - ${item.days_until_threshold} days to threshold</div>`;
            });
            
            if (html === '') {
                html = '<div class="alert alert-success">All stock levels are adequate</div>';
            }
            
            alertsContainer.innerHTML = html;
            
            const alertsCard = document.getElementById('stock-alerts-card');
            if (alertsCard && highAlerts.length === 0 && mediumAlerts.length === 0) {
                alertsCard.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load stock alerts:', error);
        }
    },
    
    // Inventory Page
    inventoryPage() {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Inventory</h1>
                    <p class="page-subtitle">Manage seeds and equipment stock</p>
                </div>
                <div class="actions">
                    <button class="btn btn-primary" id="add-inventory-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add Item
                    </button>
                </div>
            </div>
            
            <div class="tabs-container">
                <div class="tabs">
                    <button class="tab active" data-tab="seeds">Seeds</button>
                    <button class="tab" data-tab="equipment">Equipment</button>
                </div>
            </div>
            
            <div class="card">
                <div class="table-header">
                    <div class="search-box">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="inventory-search" placeholder="Search inventory...">
                    </div>
                    <div class="filter-group">
                        <select class="form-control" id="inventory-type-filter">
                            <option value="">All Types</option>
                            <option value="seeds">Seeds Only</option>
                            <option value="equipment">Equipment Only</option>
                        </select>
                        <select class="form-control" id="inventory-status-filter">
                            <option value="">All Status</option>
                            <option value="available">Available</option>
                            <option value="low_stock">Low Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                        </select>
                    </div>
                </div>
                <div class="table-container">
                    <table id="inventory-table">
                        <thead>
                            <tr id="inventory-thead">
                                <th>ID</th>
                                <th>Name/Type</th>
                                <th>Variety/Category</th>
                                <th>Quantity</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-tbody">
                            <tr>
                                <td colspan="6" class="text-center">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination" id="inventory-pagination">
                    <div class="pagination-info" id="inventory-pagination-info">Showing 0 to 0 of 0 records</div>
                    <div class="pagination-controls" id="inventory-pagination-controls"></div>
                </div>
            </div>
        `;
    },
    
    async initInventory() {
        this.currentInventoryTab = 'seeds';
        await this.loadInventory();
        
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', async (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentInventoryTab = e.target.dataset.tab;
                this.updateInventoryTableHeader();
                await this.loadInventory();
            });
        });
        
        document.getElementById('add-inventory-btn').addEventListener('click', () => this.showInventoryModal());
        
        document.getElementById('inventory-search').addEventListener('input', Utils.debounce(async (e) => {
            await this.searchInventory(e.target.value);
        }, 300));
        
        document.getElementById('inventory-type-filter').addEventListener('change', async (e) => {
            await this.loadInventory(1, document.getElementById('inventory-status-filter').value, e.target.value);
        });
        
        document.getElementById('inventory-status-filter').addEventListener('change', async (e) => {
            await this.loadInventory(1, e.target.value, document.getElementById('inventory-type-filter').value);
        });
    },
    
    updateInventoryTableHeader() {
        const thead = document.getElementById('inventory-thead');
        if (this.currentInventoryTab === 'seeds') {
            thead.innerHTML = `
                <th>ID</th>
                <th>Crop Type</th>
                <th>Variety</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Action</th>
            `;
        } else {
            thead.innerHTML = `
                <th>ID</th>
                <th>Equipment Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Condition</th>
                <th>Action</th>
            `;
        }
    },
    
    async loadInventory(page = 1, status = '', typeFilter = '') {
        try {
            let type = typeFilter || this.currentInventoryTab;
            const response = await API.getInventory(type, { page, limit: 10, status });
            this.renderInventoryTable(response.data);
            this.renderInventoryPagination(response.pagination);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load inventory');
        }
    },
    
    renderInventoryTable(items) {
        const tbody = document.getElementById('inventory-tbody');
        
        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No items found</td></tr>';
            return;
        }
        
        if (this.currentInventoryTab === 'seeds') {
            tbody.innerHTML = items.map(item => `
                <tr>
                    <td>SD-${String(item.id).padStart(3, '0')}</td>
                    <td>${item.crop_type}</td>
                    <td>${item.variety || '-'}</td>
                    <td>${Math.max(0, item.quantity)} ${item.unit}</td>
                    <td><span class="badge-status ${item.status}">${item.status.replace('_', ' ')}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon btn-edit" onclick="Pages.editInventory('seeds', ${item.id})" title="Edit">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                            <button class="btn-icon btn-delete" onclick="Pages.deleteInventory('seeds', ${item.id})" title="Delete">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = items.map(item => `
                <tr>
                    <td>EQ-${String(item.id).padStart(3, '0')}</td>
                    <td>${item.name}</td>
                    <td>${item.category || '-'}</td>
                    <td>${Math.max(0, item.quantity)} units</td>
                    <td><span class="badge-status ${item.condition === 'good' ? 'active' : item.condition === 'new' ? 'active' : 'inactive'}">${item.condition}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon btn-edit" onclick="Pages.editInventory('equipment', ${item.id})" title="Edit">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                            <button class="btn-icon btn-delete" onclick="Pages.deleteInventory('equipment', ${item.id})" title="Delete">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    },
    
    renderInventoryPagination(pagination) {
        const info = document.getElementById('inventory-pagination-info');
        const controls = document.getElementById('inventory-pagination-controls');
        
        if (!pagination) {
            info.textContent = '';
            controls.innerHTML = '';
            return;
        }
        
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        
        info.textContent = `Showing ${start} to ${end} of ${pagination.total} records`;
        
        let buttons = '';
        
        if (pagination.pages > 1) {
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadInventory(1)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadInventory(${pagination.page - 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>`;
            
            const maxVisible = 5;
            let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
            let endPage = Math.min(pagination.pages, startPage + maxVisible - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                buttons += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="Pages.loadInventory(${i})">${i}</button>`;
            }
            
            if (endPage < pagination.pages) {
                buttons += `<span class="pagination-dots">...</span>`;
            }
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadInventory(${pagination.page + 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadInventory(${pagination.pages})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
        }
        
        controls.innerHTML = buttons;
    },
    
    async searchInventory(query) {
        try {
            const typeFilter = document.getElementById('inventory-type-filter').value;
            const statusFilter = document.getElementById('inventory-status-filter').value;
            const type = typeFilter || this.currentInventoryTab;
            const response = query ? await API.getInventory(type, { search: query, status: statusFilter }) : await API.getInventory(type, { status: statusFilter });
            this.renderInventoryTable(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Search failed');
        }
    },
    
    onCropTypeChange(select) {
        select.setCustomValidity('');
        const form = select.closest('form');
        if (!form) return;
        const unitSelect = form.querySelector('[name="unit"]');
        const qtyInput = form.querySelector('[name="quantity"]');
        const qty = parseFloat(qtyInput?.value) || 0;
        
        if (unitSelect) {
            if (qty >= 1000) {
                unitSelect.value = 'tons';
            } else if (select.value === 'Rice') {
                unitSelect.value = 'bags';
            } else if (select.value === 'Vegetable') {
                unitSelect.value = 'kg';
            }
        }
    },

    onVarietyChange(select) {
        select.setCustomValidity('');
        const form = select.closest('form');
        if (!form) return;
        const cropSelect = form.querySelector('[name="crop_type"]');
        const unitSelect = form.querySelector('[name="unit"]');
        const qtyInput = form.querySelector('[name="quantity"]');
        const qty = parseFloat(qtyInput?.value) || 0;
        const val = select.value;

        const riceVarieties = ['White', 'Red'];
        const vegVarieties = ['Pechay', 'Okra', 'Squash', 'Eggplant', 'Sitaw', 'Ampalaya', 'Water Spinach', 'Chinese Cabbage'];

        if (riceVarieties.includes(val)) {
            if (cropSelect) cropSelect.value = 'Rice';
            if (unitSelect) {
                unitSelect.value = (qty >= 1000) ? 'tons' : 'bags';
            }
        } else if (vegVarieties.includes(val)) {
            if (cropSelect) cropSelect.value = 'Vegetable';
            if (unitSelect) {
                unitSelect.value = (qty >= 1000) ? 'tons' : 'kg';
            }
        }
    },

    onQuantityChange(input) {
        input.setCustomValidity('');
        const form = input.closest('form');
        if (!form) return;
        const unitSelect = form.querySelector('[name="unit"]');
        const cropSelect = form.querySelector('[name="crop_type"]');
        const qty = parseFloat(input.value) || 0;

        if (unitSelect) {
            if (qty >= 1000) {
                unitSelect.value = 'tons';
            } else if (cropSelect && cropSelect.value === 'Rice') {
                unitSelect.value = 'bags';
            } else if (cropSelect && cropSelect.value === 'Vegetable') {
                unitSelect.value = 'kg';
            }
        }
    },

    showInventoryModal(item = null) {
        const isEdit = item !== null;
        const type = this.currentInventoryTab;
        
        document.getElementById('modal-title').textContent = isEdit ? `Edit ${type === 'seeds' ? 'Seed' : 'Equipment'}` : `Add ${type === 'seeds' ? 'Seed' : 'Equipment'}`;
        
        if (type === 'seeds') {
            document.getElementById('modal-body').innerHTML = `
                <form id="inventory-form" class="app-form" onsubmit="event.preventDefault(); Pages.saveInventory(${item?.id || null});">
                    <div class="grid-2">
                        <div class="form-group">
                            <label>Crop Type *</label>
                            <select class="form-control" name="crop_type" required oninvalid="this.setCustomValidity('Please fill the required information')" onchange="Pages.onCropTypeChange(this)">
                                <option value="">Select</option>
                                <option value="Rice" ${item?.crop_type === 'Rice' ? 'selected' : ''}>Rice</option>
                                <option value="Vegetable" ${item?.crop_type === 'Vegetable' ? 'selected' : ''}>Vegetable</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Variety *</label>
                            <select class="form-control" name="variety" required oninvalid="this.setCustomValidity('Please fill the required information')" onchange="Pages.onVarietyChange(this)">
                                <option value="">Select</option>
                                <optgroup label="Vegetables">
                                    <option value="Pechay" ${item?.variety === 'Pechay' ? 'selected' : ''}>Pechay</option>
                                    <option value="Okra" ${item?.variety === 'Okra' ? 'selected' : ''}>Okra</option>
                                    <option value="Squash" ${item?.variety === 'Squash' ? 'selected' : ''}>Squash</option>
                                    <option value="Eggplant" ${item?.variety === 'Eggplant' ? 'selected' : ''}>Eggplant</option>
                                    <option value="Sitaw" ${item?.variety === 'Sitaw' ? 'selected' : ''}>Sitaw</option>
                                    <option value="Ampalaya" ${item?.variety === 'Ampalaya' ? 'selected' : ''}>Ampalaya</option>
                                    <option value="Water Spinach" ${item?.variety === 'Water Spinach' ? 'selected' : ''}>Water Spinach</option>
                                    <option value="Chinese Cabbage" ${item?.variety === 'Chinese Cabbage' ? 'selected' : ''}>Chinese Cabbage</option>
                                </optgroup>
                                <optgroup label="Rice">
                                    <option value="White" ${item?.variety === 'White' ? 'selected' : ''}>White</option>
                                    <option value="Red" ${item?.variety === 'Red' ? 'selected' : ''}>Red</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label>Quantity *</label>
                             <input type="number" step="0.01" min="0" class="form-control" name="quantity" value="${item?.quantity ?? ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="Pages.onQuantityChange(this)">
                        </div>
                        <div class="form-group">
                            <label>Unit *</label>
                            <select class="form-control" name="unit" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                                <option value="kg" ${item?.unit === 'kg' ? 'selected' : ''}>kg</option>
                                <option value="bags" ${item?.unit === 'bags' ? 'selected' : ''}>bags</option>
                                <option value="tons" ${item?.unit === 'tons' ? 'selected' : ''}>tons</option>
                            </select>
                        </div>
                    </div>
                </form>
            `;
        } else {
            document.getElementById('modal-body').innerHTML = `
                <form id="inventory-form" class="app-form" onsubmit="event.preventDefault(); Pages.saveInventory(${item?.id || null});">
                    <div class="grid-2">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" class="form-control" name="name" value="${item?.name || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                        </div>
                        <div class="form-group">
                            <label>Category *</label>
                            <select class="form-control" name="category" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                                <option value="">Select</option>
                                <option value="Sprayer" ${item?.category === 'Sprayer' ? 'selected' : ''}>Sprayer</option>
                                <option value="Tractor" ${item?.category === 'Tractor' ? 'selected' : ''}>Tractor</option>
                                <option value="Bolo" ${item?.category === 'Bolo' ? 'selected' : ''}>Bolo</option>
                                <option value="Fertilizer" ${item?.category === 'Fertilizer' ? 'selected' : ''}>Fertilizer</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label>Quantity *</label>
                            <input type="number" min="0" class="form-control" name="quantity" value="${item?.quantity ?? ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                        </div>
                        <div class="form-group">
                            <label>Condition *</label>
                            <select class="form-control" name="condition" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                                <option value="">Select</option>
                                <option value="new" ${item?.condition === 'new' ? 'selected' : ''}>New</option>
                                <option value="good" ${item?.condition === 'good' ? 'selected' : ''}>Good</option>
                                <option value="fair" ${item?.condition === 'fair' ? 'selected' : ''}>Fair</option>
                                <option value="poor" ${item?.condition === 'poor' ? 'selected' : ''}>Poor</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label>Threshold</label>
                            <input type="number" class="form-control" name="threshold" value="${item?.threshold || 5}">
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea class="form-control" name="notes" rows="2">${item?.notes || ''}</textarea>
                        </div>
                    </div>
                </form>
            `;
        }
        
        document.getElementById('modal-footer').innerHTML = `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.saveInventory(${item?.id || null})">${isEdit ? 'Update' : 'Save'}</button>
        `;
        
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    
    updateVarietyField() {
        const cropType = document.getElementById('crop-type-select').value;
        const varietyField = document.getElementById('variety-field');
        const varietySelect = document.getElementById('variety-select');
        
        if (cropType === 'Rice') {
            varietyField.style.display = 'block';
            varietySelect.required = true;
        } else {
            varietyField.style.display = 'none';
            varietySelect.required = false;
            varietySelect.value = '';
        }
    },
    
    async saveInventory(id = null) {
        const form = document.getElementById('inventory-form');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        if (data.quantity !== undefined && parseFloat(data.quantity) < 0) {
            Utils.showToast('error', 'Error', 'Quantity cannot be negative');
            return;
        }
        
        console.log('Saving inventory:', this.currentInventoryTab, data);
        
        try {
            if (id) {
                await API.updateInventoryItem(this.currentInventoryTab, id, data);
                Utils.showToast('success', 'Success', 'Item updated successfully');
            } else {
                await API.createInventoryItem(this.currentInventoryTab, data);
                Utils.showToast('success', 'Success', 'Item created successfully');
            }
            
            App.closeModal();
            await this.loadInventory();
        } catch (error) {
            console.error('Save inventory error:', error);
            Utils.showToast('error', 'Error', error.message || 'Failed to create item');
        }
    },
    
    async editInventory(type, id) {
        this.currentInventoryTab = type;
        try {
            const response = await API.getInventory(type, { id });
            const item = response.data[0];
            this.showInventoryModal(item);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load item');
        }
    },
    
    async deleteInventory(type, id) {
        if (!confirm('Are you sure you want to delete this item?')) return;
        if (this.deleteInProgress) return;
        this.deleteInProgress = true;
        
        try {
            await API.deleteInventoryItem(type, id);
            Utils.showToast('success', 'Success', 'Item deleted successfully');
            await this.loadInventory();
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to delete item');
        } finally {
            this.deleteInProgress = false;
        }
    },
    
    // Distributions Page
    distributionsPage() {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Distributions</h1>
                    <p class="page-subtitle">Track seed and equipment distributions to farmers</p>
                </div>
                <div class="actions">
                    <button class="btn btn-primary" id="add-distribution-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add New Distribution
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="table-header">
                    <div class="search-box">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="distribution-search" placeholder="Search distributions...">
                    </div>
                    <div class="filter-group">
                        <select class="form-control" id="distribution-year-filter" style="font-weight: 500;">
                            <option value="all">All Years</option>
                            <option value="2026">2026 Allocation Year</option>
                            <option value="2025">2025 Allocation Year</option>
                            <option value="2024">2024 Allocation Year</option>
                            <option value="2023">2023 Allocation Year</option>
                        </select>
                        <input type="date" class="form-control" id="distribution-date-filter">
                        <select class="form-control" id="distribution-sort">
                            <option value="asc">Oldest First</option>
                            <option value="desc" selected>Newest First</option>
                        </select>
                    </div>
                </div>
                <div class="table-container">
                    <table id="distributions-table">
                        <thead>
                            <tr>
                                <th>Dist. ID</th>
                                <th>Farmer</th>
                                <th>Items</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="distributions-tbody">
                            <tr>
                                <td colspan="5" class="text-center">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination" id="distributions-pagination">
                    <div class="pagination-info" id="distributions-pagination-info">Showing 0 to 0 of 0 records</div>
                    <div class="pagination-controls" id="distributions-pagination-controls"></div>
                </div>
            </div>
        `;
    },
    
    async initDistributions() {
        await this.loadDistributions();
        
        document.getElementById('add-distribution-btn').addEventListener('click', () => this.showDistributionModal());
        
        document.getElementById('distribution-search').addEventListener('input', Utils.debounce(async (e) => {
            await this.filterDistributions();
        }, 300));
        
        const yearFilterEl = document.getElementById('distribution-year-filter');
        if (yearFilterEl) {
            yearFilterEl.addEventListener('change', async () => {
                await this.filterDistributions();
            });
        }
        
        document.getElementById('distribution-date-filter').addEventListener('change', async () => {
            await this.filterDistributions();
        });
        
        document.getElementById('distribution-sort').addEventListener('change', async () => {
            await this.filterDistributions();
        });
    },
    
    async filterDistributions() {
        const search = document.getElementById('distribution-search').value;
        const date = document.getElementById('distribution-date-filter').value;
        const year = document.getElementById('distribution-year-filter')?.value;
        const sort = document.getElementById('distribution-sort').value;
        
        try {
            const response = await API.getDistributions({ q: search, date: date, year: year, sort: sort });
            this.renderDistributionsTable(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Filter failed');
        }
    },
    
    async loadDistributions(page = 1) {
        const sort = document.getElementById('distribution-sort')?.value || 'desc';
        const year = document.getElementById('distribution-year-filter')?.value || 'all';
        try {
            const response = await API.getDistributions({ page, limit: 10, sort: sort, year: year });
            this.renderDistributionsTable(response.data);
            this.renderDistributionsPagination(response.pagination);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load distributions');
        }
    },
    
    renderDistributionsTable(distributions) {
        const tbody = document.getElementById('distributions-tbody');
        
        if (!distributions || distributions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No distributions found</td></tr>';
            return;
        }
        
        console.log('Distribution items:', distributions.map(d => ({ id: d.id, items: d.items })));
        
        tbody.innerHTML = distributions.map(dist => `
            <tr>
                <td>DST-${String(dist.id).padStart(4, '0')}</td>
                <td>
                    <div class="farmer-info">
                        <span class="farmer-name">${dist.farmer_name || 'Farmer #' + dist.farmer_id}</span>
                        <span class="farmer-contact">${dist.rsbsa_number || ''}</span>
                    </div>
                </td>
                <td>
                    <div class="items-list">
                        ${(dist.items || []).map(item => {
                            let itemDisplay;
                            if (item.item_type === 'seed') {
                                itemDisplay = item.seed_variety || item.item_variety || item.item_name || 'Seed';
                            } else if (item.item_type === 'equipment') {
                                itemDisplay = item.equip_name || item.equip_category || item.item_name || 'Equipment';
                            } else {
                                itemDisplay = item.item_name || 'Item';
                            }
                            return `<span class="item-badge">${itemDisplay} (${item.quantity})</span>`;
                        }).join('')}
                    </div>
                </td>
                <td>${dist.distribution_date}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="Pages.viewDistribution(${dist.id})" title="View Details">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="Pages.deleteDistribution(${dist.id})" title="Delete">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    renderDistributionsPagination(pagination) {
        const info = document.getElementById('distributions-pagination-info');
        const controls = document.getElementById('distributions-pagination-controls');
        
        if (!pagination) {
            info.textContent = '';
            controls.innerHTML = '';
            return;
        }
        
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        
        info.textContent = `Showing ${start} to ${end} of ${pagination.total} records`;
        
        let buttons = '';
        
        if (pagination.pages > 1) {
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadDistributions(1)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadDistributions(${pagination.page - 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>`;
            
            const maxVisible = 5;
            let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
            let endPage = Math.min(pagination.pages, startPage + maxVisible - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                buttons += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="Pages.loadDistributions(${i})">${i}</button>`;
            }
            
            if (endPage < pagination.pages) {
                buttons += `<span class="pagination-dots">...</span>`;
            }
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadDistributions(${pagination.page + 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadDistributions(${pagination.pages})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
        }
        
        controls.innerHTML = buttons;
    },
    
    async searchDistributions(query) {
        try {
            const response = query ? await API.getDistributions({ q: query }) : await API.getDistributions();
            this.renderDistributionsTable(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Search failed');
        }
    },
    
    async showDistributionModal(distribution = null) {
        const isEdit = distribution !== null;
        
        const [farmersRes, seedsRes, equipRes] = await Promise.all([
            API.getFarmers({ limit: 100 }),
            API.getSeeds({ limit: 100 }),
            API.getEquipment({ limit: 100 })
        ]);
        
        document.getElementById('modal-title').textContent = isEdit ? 'Edit Distribution' : 'Add New Distribution';
        
        const farmerOptions = farmersRes.data.sort((a, b) => a.name.localeCompare(b.name)).map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        
        const seedOptions = seedsRes.data.map(s => {
            const qty = parseFloat(s.quantity) || 0;
            const disabled = qty <= 0 ? 'disabled' : '';
            const label = qty <= 0 ? ' [OUT OF STOCK]' : '';
            return `<option value="seed_${s.id}" data-qty="${s.quantity}" ${disabled}>${s.crop_type} - ${s.variety} (${qty} ${s.unit})${label}</option>`;
        }).join('');
        const equipOptions = equipRes.data.map(e => {
            const qty = parseFloat(e.quantity) || 0;
            const disabled = qty <= 0 ? 'disabled' : '';
            const label = qty <= 0 ? ' [OUT OF STOCK]' : '';
            return `<option value="equip_${e.id}" data-qty="${e.quantity}" ${disabled}>${e.name} (${qty} units)${label}</option>`;
        }).join('');
        
        this.seedOptions = seedOptions;
        this.equipOptions = equipOptions;
        
        this.inventoryStock = {};
        seedsRes.data.forEach(s => { this.inventoryStock['seed_' + s.id] = parseFloat(s.quantity) || 0; });
        equipRes.data.forEach(e => { this.inventoryStock['equip_' + e.id] = parseFloat(e.quantity) || 0; });
        
        document.getElementById('modal-body').innerHTML = `
            <form id="distribution-form" class="app-form" onsubmit="event.preventDefault(); Pages.saveDistribution(${distribution?.id || null});">
                <div class="form-group">
                    <label>Select Farmer *</label>
                    <select class="form-control" name="farmer_id" id="dist-farmer-select" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')" onchange="Pages.onFarmerChangeForDistribution(this)">
                        <option value="">Select Farmer</option>
                        ${farmerOptions}
                    </select>
                </div>
                <div id="farmer-farm-info" class="form-group" style="display: none;">
                    <label>Farm Size</label>
                    <div id="farm-size-display" class="form-control" style="background: #f5f5f5; display: flex; align-items: center;"></div>
                    <input type="hidden" name="farmer_farm_size" id="farmer-farm-size">
                </div>
                <div class="form-group">
                    <label>Distribution Date *</label>
                    <input type="date" class="form-control" name="distribution_date" value="${distribution?.distribution_date || new Date().toISOString().split('T')[0]}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                </div>
                <div class="form-group">
                    <label>Season *</label>
                    <input type="text" class="form-control" name="season" value="${distribution?.season || ''}" placeholder="e.g., Long Rains 2026" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                </div>
                <div class="form-group">
                    <label>Items to Distribute *</label>
                    <div id="distribution-items-container">
                        <div class="distribution-item-row">
                            <select class="form-control item-select" name="items[0][type]" onchange="Pages.updateItemQuantity(this)" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                                <option value="">Select Item</option>
                                <optgroup label="Seeds">${seedOptions}</optgroup>
                                <optgroup label="Equipment">${equipOptions}</optgroup>
                            </select>
                            <input type="number" class="form-control" name="items[0][quantity]" id="item-qty-0" placeholder="Qty" min="1" value="1" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity(''); Pages.validateItemQuantity(this)">
                            <button type="button" class="btn btn-icon btn-delete" onclick="Pages.removeDistributionItem(this)">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary-outline btn-sm" onclick="Pages.addDistributionItem()">
                        + Add Another Item
                    </button>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea class="form-control" name="notes" rows="2" placeholder="Optional notes...">${distribution?.notes || ''}</textarea>
                </div>
            </form>
        `;
        
        document.getElementById('modal-footer').innerHTML = `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.saveDistribution(${distribution?.id || null})">${isEdit ? 'Update' : 'Add Distribution'}</button>
        `;
        
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    
    addDistributionItem() {
        const container = document.getElementById('distribution-items-container');
        const index = container.children.length;
        
        const row = document.createElement('div');
        row.className = 'distribution-item-row';
        row.innerHTML = `
            <select class="form-control item-select" name="items[${index}][type]" onchange="Pages.updateItemQuantity(this)" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                <option value="">Select Item</option>
                <optgroup label="Seeds">${this.seedOptions || ''}</optgroup>
                <optgroup label="Equipment">${this.equipOptions || ''}</optgroup>
            </select>
            <input type="number" class="form-control" name="items[${index}][quantity]" placeholder="Qty" min="1" value="1" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity(''); Pages.validateItemQuantity(this)">
            <button type="button" class="btn btn-icon btn-delete" onclick="Pages.removeDistributionItem(this)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        `;
        
        container.appendChild(row);
    },
    
    removeDistributionItem(btn) {
        const container = document.getElementById('distribution-items-container');
        if (container.children.length > 1) {
            btn.closest('.distribution-item-row').remove();
        }
    },
    
    updateItemQuantity(select) {
        var itemType = select.value;
        var row = select.closest('.distribution-item-row');
        var quantityInput = row.querySelector('input[name*="quantity"]');
        if (!quantityInput) return;
        
        var stock = this.inventoryStock ? (this.inventoryStock[itemType] || 0) : 0;
        
        var stockInfo = row.querySelector('.stock-info-label');
        if (!stockInfo) {
            stockInfo = document.createElement('div');
            stockInfo.className = 'stock-info-label';
            quantityInput.parentNode.appendChild(stockInfo);
        }
        
        var qtyWarning = row.querySelector('.qty-warning-label');
        if (!qtyWarning) {
            qtyWarning = document.createElement('div');
            qtyWarning.className = 'qty-warning-label';
            quantityInput.parentNode.appendChild(qtyWarning);
        }
        
        quantityInput.classList.remove('stock-valid', 'stock-invalid', 'stock-warning');
        
        if (stock <= 0) {
            select.value = '';
            quantityInput.value = '';
            quantityInput.removeAttribute('max');
            quantityInput.classList.add('stock-invalid');
            stockInfo.textContent = '0 - OUT OF STOCK';
            stockInfo.style.color = '#991b1b';
            stockInfo.style.display = 'block';
            qtyWarning.textContent = 'This item is out of stock. Distribution cannot be completed.';
            qtyWarning.style.display = 'block';
            return;
        }
        
        stockInfo.textContent = 'Available: ' + stock;
        stockInfo.style.color = '#166534';
        stockInfo.style.display = 'block';
        qtyWarning.style.display = 'none';
        
        quantityInput.setAttribute('min', '1');
        quantityInput.setAttribute('max', stock);
        quantityInput.classList.add('stock-valid');
        
        this.autoFillSeedQuantity(select, quantityInput);
        
        var currentVal = parseFloat(quantityInput.value) || 0;
        if (currentVal > stock) {
            quantityInput.value = stock;
        }
        if (currentVal < 1 || currentVal === 0) {
            quantityInput.value = Math.min(1, stock);
        }
        
        this.validateItemQuantity(quantityInput);
    },
    
    validateItemQuantity(input) {
        var row = input.closest('.distribution-item-row');
        if (!row) return;
        var select = row.querySelector('select[name*="type"]');
        if (!select) return;
        
        var itemType = select.value;
        var stock = this.inventoryStock ? (this.inventoryStock[itemType] || 0) : 0;
        var val = parseFloat(input.value) || 0;
        
        var qtyWarning = row.querySelector('.qty-warning-label');
        if (!qtyWarning) {
            qtyWarning = document.createElement('div');
            qtyWarning.className = 'qty-warning-label';
            input.parentNode.appendChild(qtyWarning);
        }
        
        input.classList.remove('stock-valid', 'stock-invalid', 'stock-warning');
        
        if (stock <= 0) {
            input.classList.add('stock-invalid');
            qtyWarning.textContent = 'This item is out of stock. Distribution cannot be completed.';
            qtyWarning.style.display = 'block';
        } else if (val > stock) {
            input.classList.add('stock-invalid');
            qtyWarning.textContent = 'Exceeds available stock. Only ' + stock + ' available.';
            qtyWarning.style.display = 'block';
        } else if (val <= 0) {
            input.classList.add('stock-warning');
            qtyWarning.textContent = 'Quantity must be at least 1.';
            qtyWarning.style.display = 'block';
        } else {
            input.classList.add('stock-valid');
            qtyWarning.style.display = 'none';
        }
    },
    
    onFarmerChangeForDistribution(select) {
        var farmerId = select.value;
        var farmInfoDiv = document.getElementById('farmer-farm-info');
        var farmSizeDisplay = document.getElementById('farm-size-display');
        var farmSizeInput = document.getElementById('farmer-farm-size');
        
        if (!farmerId) {
            farmInfoDiv.style.display = 'none';
            return;
        }
        
        select.disabled = true;
        
        API.getFarmer(farmerId).then(function(res) {
            select.disabled = false;
            var farmer = res.data;
            if (!farmer) {
                farmInfoDiv.style.display = 'none';
                return;
            }
            var farmSizeNum = parseFloat(farmer.total_farm_size) || 0;
            select.setAttribute('data-farm-size', farmSizeNum);
            
            if (farmSizeNum > 0) {
                farmSizeDisplay.innerHTML = '<span style="color: #666;">' + farmSizeNum + ' ha</span>';
                farmSizeInput.value = farmSizeNum;
                farmInfoDiv.style.display = 'block';
            } else {
                farmInfoDiv.style.display = 'none';
            }
        }).catch(function() {
            select.disabled = false;
            farmInfoDiv.style.display = 'none';
        });
    },
    
    calculateSeedQuantity(seedType, farmSize) {
        var farmSizeNum = parseFloat(farmSize) || 0;
        var rates = {
            'Rice': 20,
            'Corn': 15,
            'Vegetables': 10
        };
        var rate = rates[seedType] || 10;
        return Math.ceil(farmSizeNum * rate);
    },
    
    autoFillSeedQuantity(itemSelect, quantityInput) {
        var itemType = itemSelect.value;
        if (!itemType) return;
        
        if (!itemType.startsWith('seed_')) return;
        
        var farmerSelect = document.getElementById('dist-farmer-select');
        var farmSize = 0;
        
        if (farmerSelect && farmerSelect.hasAttribute('data-farm-size')) {
            farmSize = parseFloat(farmerSelect.getAttribute('data-farm-size')) || 0;
        }
        
        if (!farmSize) return;
        
        var selectedOption = itemSelect.options[itemSelect.selectedIndex];
        var optionText = selectedOption ? selectedOption.textContent : '';
        
        var seedType = 'Vegetables';
        if (optionText.toLowerCase().includes('rice')) {
            seedType = 'Rice';
        } else if (optionText.toLowerCase().includes('corn')) {
            seedType = 'Corn';
        } else if (optionText.toLowerCase().includes('vegetable')) {
            seedType = 'Vegetables';
        }
        
        var qty = this.calculateSeedQuantity(seedType, farmSize);
        
        var stock = this.inventoryStock ? (this.inventoryStock[itemType] || 0) : 0;
        if (stock > 0 && qty > stock) {
            qty = stock;
        }
        
        if (qty > 0) {
            quantityInput.value = qty;
        }
    },
    
    async saveDistribution(id = null) {
        const form = document.getElementById('distribution-form');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        
        const data = {
            farmer_id: formData.get('farmer_id'),
            distribution_date: formData.get('distribution_date'),
            season: formData.get('season'),
            notes: formData.get('notes'),
            items: []
        };
        
        const itemRows = document.querySelectorAll('.distribution-item-row');
        itemRows.forEach((row, index) => {
            const type = row.querySelector(`[name="items[${index}][type]"]`).value;
            const quantity = row.querySelector(`[name="items[${index}][quantity]"]`).value;
            if (type && quantity) {
                const [itemType, itemId] = type.split('_');
                const finalType = itemType === 'equip' ? 'equipment' : itemType;
                data.items.push({ item_type: finalType, item_id: parseInt(itemId), quantity: parseFloat(quantity) });
            }
        });
        
        if (data.items.length === 0) {
            Utils.showToast('error', 'Error', 'Please add at least one item');
            return;
        }
        
        if (!id) {
            try {
                var todayCheck = await API.checkFarmerToday(data.farmer_id, data.distribution_date);
                if (todayCheck.has_distribution) {
                    Utils.showToast('error', 'Already Distributed Today', 'This farmer has already received a distribution on ' + data.distribution_date + '. Only one distribution per farmer per day is allowed.');
                    return;
                }
            } catch (checkErr) {
                Utils.showToast('error', 'Error', 'Failed to verify farmer distribution status');
                return;
            }
        }
        
        try {
            var freshSeeds = await API.getSeeds({ limit: 100 });
            var freshEquip = await API.getEquipment({ limit: 100 });
            var freshStock = {};
            (freshSeeds.data || []).forEach(function(s) { freshStock['seed_' + s.id] = parseFloat(s.quantity) || 0; });
            (freshEquip.data || []).forEach(function(e) { freshStock['equip_' + e.id] = parseFloat(e.quantity) || 0; });
            
            var stockNeeded = {};
            for (var i = 0; i < data.items.length; i++) {
                var item = data.items[i];
                var stockKey = (item.item_type === 'equipment' ? 'equip_' : 'seed_') + item.item_id;
                if (!stockNeeded[stockKey]) {
                    stockNeeded[stockKey] = { total: 0, item_type: item.item_type, item_id: item.item_id };
                }
                stockNeeded[stockKey].total += item.quantity;
            }
            
            for (var stockKey in stockNeeded) {
                var entry = stockNeeded[stockKey];
                var available = freshStock[stockKey] || 0;
                var prefix = entry.item_type === 'equipment' ? 'equip_' : 'seed_';
                var opt = document.querySelector('select[name*="type"] option[value="' + prefix + entry.item_id + '"]');
                var itemName = opt ? opt.textContent : stockKey;
                
                if (available <= 0) {
                    Utils.showToast('error', 'Out of Stock', itemName + ' is out of stock and cannot be distributed');
                    return;
                }
                if (entry.total > available) {
                    Utils.showToast('error', 'Insufficient Stock', itemName + ': requested ' + entry.total + ' but only ' + available + ' available');
                    return;
                }
            }
        } catch (e) {
            Utils.showToast('error', 'Error', 'Failed to verify stock availability');
            return;
        }
        
        try {
            if (id) {
                await API.updateDistribution(id, data);
                Utils.showToast('success', 'Success', 'Distribution updated successfully');
            } else {
                await API.createDistribution(data);
                Utils.showToast('success', 'Success', 'Distribution created successfully');
            }
            
            App.closeModal();
            await this.loadDistributions();
        } catch (error) {
            Utils.showToast('error', 'Error', error.message);
        }
    },
    
    async viewDistribution(id) {
        try {
            const response = await API.getDistribution(id);
            this.showDistributionModal(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load distribution');
        }
    },
    
    async deleteDistribution(id) {
        if (!confirm('Are you sure you want to delete this distribution?')) return;
        if (this.deleteInProgress) return;
        this.deleteInProgress = true;
        
        try {
            const result = await API.deleteDistribution(id);
            Utils.showToast('success', 'Success', 'Distribution deleted successfully');
            await this.loadDistributions();
        } catch (error) {
            console.error('Delete distribution error:', error);
            Utils.showToast('error', 'Error', error.message || 'Failed to delete distribution');
        } finally {
            this.deleteInProgress = false;
        }
    },
    
    // Schedules Page
    schedulesPage() {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Schedules</h1>
                    <p class="page-subtitle">Manage distribution schedules and activities</p>
                </div>
                <div class="actions">
                    <button class="btn btn-primary" id="add-schedule-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add Schedule
                    </button>
                </div>
            </div>
            
            <div class="stats-grid stats-grid-3">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>
                    </div>
                    <div class="stat-content">
                        <h3 id="schedule-total">-</h3>
                        <p>Total Schedules</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    </div>
                    <div class="stat-content">
                        <h3 id="schedule-upcoming">-</h3>
                        <p>Upcoming</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                    <div class="stat-content">
                        <h3 id="schedule-completed">-</h3>
                        <p>Completed</p>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="table-header">
                    <div class="search-box">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="schedule-search" placeholder="Search schedules...">
                    </div>
                    <div class="filter-group">
                        <select class="form-control" id="schedule-status-filter">
                            <option value="">All Status</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <select class="form-control" id="schedule-sort">
                            <option value="asc">Oldest First</option>
                            <option value="desc">Newest First</option>
                        </select>
                    </div>
                </div>
                <div class="table-container">
                    <table id="schedules-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Date & Time</th>
                                <th>Location</th>
                                <th>Assigned Staff</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="schedules-tbody">
                            <tr>
                                <td colspan="6" class="text-center">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination" id="schedules-pagination">
                    <div class="pagination-info" id="schedules-pagination-info">Showing 0 to 0 of 0 records</div>
                    <div class="pagination-controls" id="schedules-pagination-controls"></div>
                </div>
            </div>
        `;
    },
    
    async initSchedules() {
        await this.loadScheduleStats();
        await this.loadSchedules();
        
        document.getElementById('add-schedule-btn').addEventListener('click', () => this.showScheduleModal());
        
        document.getElementById('schedule-search').addEventListener('input', Utils.debounce(async (e) => {
            await this.filterSchedules();
        }, 300));
        
        document.getElementById('schedule-status-filter').addEventListener('change', async (e) => {
            await this.filterSchedules();
        });
        
        document.getElementById('schedule-sort').addEventListener('change', async () => {
            await this.filterSchedules();
        });
    },
    
    async filterSchedules() {
        const search = document.getElementById('schedule-search').value;
        const status = document.getElementById('schedule-status-filter').value;
        const sort = document.getElementById('schedule-sort').value;
        
        try {
            const response = await API.getSchedules({ search, status, sort, limit: 50 });
            this.renderSchedulesTable(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Filter failed');
        }
    },
    
    async loadScheduleStats() {
        try {
            const response = await API.getSchedules({ limit: 100, sort: 'asc' });
            const schedules = response.data || [];
            
            document.getElementById('schedule-total').textContent = schedules.length;
            document.getElementById('schedule-upcoming').textContent = schedules.filter(s => s.status === 'scheduled').length;
            document.getElementById('schedule-completed').textContent = schedules.filter(s => s.status === 'completed').length;
        } catch (error) {
            console.error('Failed to load schedule stats:', error);
        }
    },
    
    async loadSchedules(page = 1, status = '') {
        const sort = document.getElementById('schedule-sort')?.value || 'asc';
        try {
            const response = await API.getSchedules({ page, limit: 10, status, sort });
            this.renderSchedulesTable(response.data);
            this.renderSchedulesPagination(response.pagination);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load schedules');
        }
    },
    
    renderSchedulesTable(schedules) {
        const tbody = document.getElementById('schedules-tbody');
        
        if (!schedules || schedules.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No schedules found</td></tr>';
            return;
        }
        
        tbody.innerHTML = schedules.map(schedule => `
            <tr>
                <td>
                    <div class="schedule-title">
                        <span class="title">${schedule.title}</span>
                        <span class="description">${schedule.description || ''}</span>
                    </div>
                </td>
                <td>
                    <div class="schedule-datetime">
                        <span class="date">${schedule.schedule_date}</span>
                        <span class="time">${schedule.schedule_time ? new Date('1970-01-01 ' + schedule.schedule_time).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true}) : ''}</span>
                    </div>
                </td>
                <td>${schedule.location || '-'}</td>
                <td>${schedule.assigned_staff || '-'}</td>
                <td>
                    <span class="badge-status ${schedule.status}">${schedule.status}</span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="Pages.editSchedule(${schedule.id})" title="Edit">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        ${schedule.status === 'scheduled' ? `
                        <button class="btn-icon" onclick="Pages.completeSchedule(${schedule.id})" title="Mark Complete" style="color: var(--success-color)">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        </button>
                        <button class="btn-icon" onclick="Pages.cancelSchedule(${schedule.id})" title="Cancel" style="color: var(--warning-color)">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </button>
                        ` : ''}
                        <button class="btn-icon btn-delete" onclick="Pages.deleteSchedule(${schedule.id})" title="Delete">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    renderSchedulesPagination(pagination) {
        const info = document.getElementById('schedules-pagination-info');
        const controls = document.getElementById('schedules-pagination-controls');
        
        if (!pagination) {
            info.textContent = '';
            controls.innerHTML = '';
            return;
        }
        
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        
        info.textContent = `Showing ${start} to ${end} of ${pagination.total} records`;
        
        let buttons = '';
        
        if (pagination.pages > 1) {
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadSchedules(1)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadSchedules(${pagination.page - 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>`;
            
            const maxVisible = 5;
            let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
            let endPage = Math.min(pagination.pages, startPage + maxVisible - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                buttons += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="Pages.loadSchedules(${i})">${i}</button>`;
            }
            
            if (endPage < pagination.pages) {
                buttons += `<span class="pagination-dots">...</span>`;
            }
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadSchedules(${pagination.page + 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadSchedules(${pagination.pages})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
        }
        
        controls.innerHTML = buttons;
    },
    
    async searchSchedules(query) {
        try {
            const response = await API.getSchedules({ search: query });
            this.renderSchedulesTable(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Search failed');
        }
    },
    
    showScheduleModal(schedule = null) {
        const isEdit = schedule !== null;
        
        document.getElementById('modal-title').textContent = isEdit ? 'Edit Schedule' : 'Add Schedule';
        
        document.getElementById('modal-body').innerHTML = `
            <form id="schedule-form" class="app-form" onsubmit="event.preventDefault(); Pages.saveSchedule(${schedule?.id || null});">
                <div class="form-group">
                    <label>Title *</label>
                    <input type="text" class="form-control" name="title" value="${schedule?.title || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" class="form-control" name="schedule_date" value="${schedule?.schedule_date || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="form-group">
                        <label>Time *</label>
                        <input type="time" class="form-control" name="schedule_time" value="${schedule?.schedule_time || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                </div>
                <div class="form-group">
                    <label>Location *</label>
                    <input type="text" class="form-control" name="location" value="${schedule?.location || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                </div>
                <div class="form-group">
                    <label>Assigned Staff *</label>
                    <select class="form-control" name="assigned_staff" required oninvalid="this.setCustomValidity('Please select the assigned staff')" oninput="this.setCustomValidity('')">
                        <option value="">Select Staff</option>
                        <option value="Madel Diaz" ${schedule?.assigned_staff === 'Madel Diaz' ? 'selected' : ''}>Madel Diaz</option>
                        <option value="Rosemarie Donaire" ${schedule?.assigned_staff === 'Rosemarie Donaire' ? 'selected' : ''}>Rosemarie Donaire</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" name="description" rows="2">${schedule?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Item Details</label>
                    <textarea class="form-control" name="item_details" rows="2">${schedule?.item_details || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Status *</label>
                    <select class="form-control" name="status" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                        <option value="">Select</option>
                        <option value="scheduled" ${schedule?.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="completed" ${schedule?.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${schedule?.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            </form>
        `;
        
        document.getElementById('modal-footer').innerHTML = `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.saveSchedule(${schedule?.id || null})">${isEdit ? 'Update' : 'Add Schedule'}</button>
        `;
        
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    
    async saveSchedule(id = null) {
        const form = document.getElementById('schedule-form');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (id) {
                await API.updateSchedule(id, data);
                Utils.showToast('success', 'Success', 'Schedule updated successfully');
            } else {
                await API.createSchedule(data);
                Utils.showToast('success', 'Success', 'Schedule created successfully');
            }
            
            App.closeModal();
            await this.loadSchedules();
            await this.loadScheduleStats();
        } catch (error) {
            Utils.showToast('error', 'Error', error.message);
        }
    },
    
    async editSchedule(id) {
        try {
            const response = await API.getSchedule(id);
            this.showScheduleModal(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load schedule');
        }
    },
    
    async deleteSchedule(id) {
        if (!confirm('Are you sure you want to delete this schedule?')) return;
        if (this.deleteInProgress) return;
        this.deleteInProgress = true;
        
        try {
            await API.deleteSchedule(id);
            Utils.showToast('success', 'Success', 'Schedule deleted successfully');
            await this.loadSchedules();
            await this.loadScheduleStats();
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to delete schedule');
        } finally {
            this.deleteInProgress = false;
        }
    },
    
    async completeSchedule(id) {
        try {
            await API.completeSchedule(id);
            Utils.showToast('success', 'Success', 'Schedule marked as completed');
            await this.loadSchedules();
            await this.loadScheduleStats();
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to complete schedule');
        }
    },
    
    async cancelSchedule(id) {
        if (!confirm('Are you sure you want to cancel this schedule?')) return;
        
        try {
            await API.cancelSchedule(id);
            Utils.showToast('success', 'Success', 'Schedule cancelled successfully');
            await this.loadSchedules();
            await this.loadScheduleStats();
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to cancel schedule');
        }
    },
    
    // Reports Page
    reportsPage() {
        console.log('reportsPage called');
        return `
            <style>
            .page-header { margin-bottom: 24px; }
            .page-header h1 { font-size: 24px; font-weight: 600; color: #1E293B; margin-bottom: 4px; }
            .page-subtitle { font-size: 14px; color: #64748B; }
            .report-filter-section { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
            .filter-row { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
            .filter-row .filter-group { flex: 1; min-width: 200px; max-width: 300px; }
            .filter-row .filter-group label { display: block; font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 6px; }
            .form-control { width: 100%; padding: 10px 14px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 14px; color: #1E293B; background: #fff; }
            .btn { padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
            .btn-green { background: #22C55E; color: white; }
            .btn-green:hover { background: #16A34A; }
            .report-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
            .report-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: flex; flex-direction: column; align-items: flex-start; border: 1px solid #E2E8F0; }
            .report-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-2px); }
            .report-card-icon { width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
            .report-card-icon svg { width: 24px; height: 24px; color: white; }
            .report-card-title { font-size: 16px; font-weight: 600; color: #1E293B; margin-bottom: 8px; }
            .report-card-desc { font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 20px; flex-grow: 1; }
            .report-result { margin-top: 24px; background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
            .report-result h3 { margin-bottom: 16px; color: #1E293B; }
            .report-table { width: 100%; border-collapse: collapse; }
            .report-table th, .report-table td { padding: 12px; text-align: left; border-bottom: 1px solid #E2E8F0; }
            .report-table th { background: #F8FAFC; font-weight: 600; color: #1E293B; }
            .report-table td { color: #64748B; }
            .analytics-section { margin-top: 32px; }
            .analytics-section h2 { font-size: 20px; font-weight: 600; color: #1E293B; margin-bottom: 16px; }
            .analytics-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
            .analytics-stat { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; }
            .analytics-stat h4 { font-size: 32px; font-weight: 700; color: #22C55E; margin-bottom: 4px; }
            .analytics-stat p { font-size: 14px; color: #64748B; }
            .analytics-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
            .analytics-chart { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
            .analytics-chart h4 { margin-bottom: 16px; color: #1E293B; }
            </style>
            <div class="page-header">
                <h1>Reports</h1>
                <p class="page-subtitle">Generate and download reports</p>
            </div>
            
            <div class="report-filter-section">
                <div class="filter-row">
                    <div class="filter-group">
                        <label>Report Type</label>
                        <select class="form-control" id="report-type-filter">
                            <option value="">All Reports</option>
                            <option value="distribution">Distribution Reports</option>
                            <option value="farmer">Farmer Records</option>
                            <option value="farm">Farm Details</option>
                            <option value="stock">Stock Reports</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Filter By</label>
                        <select class="form-control" id="report-period-filter">
                            <option value="all">All Time</option>
                            <option value="day">Specific Day</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div class="filter-group" id="day-filter-group" style="display: none;">
                        <label>Select Date</label>
                        <input type="date" class="form-control" id="report-day-input">
                    </div>
                    <div class="filter-group" id="monthly-filter-group" style="display: none;">
                        <label>Month & Year</label>
                        <div style="display: flex; gap: 8px;">
                            <select class="form-control" id="report-month-select" style="width: 80px;">
                                <option value="1">Jan</option>
                                <option value="2">Feb</option>
                                <option value="3">Mar</option>
                                <option value="4">Apr</option>
                                <option value="5">May</option>
                                <option value="6">Jun</option>
                                <option value="7">Jul</option>
                                <option value="8">Aug</option>
                                <option value="9">Sep</option>
                                <option value="10">Oct</option>
                                <option value="11">Nov</option>
                                <option value="12">Dec</option>
                            </select>
                            <select class="form-control" id="report-year-select">
                                ${this.getYearOptions()}
                            </select>
                        </div>
                    </div>
                    <div class="filter-group" id="item-filter-group">
                        <label>Seed/Equipment</label>
                        <select class="form-control" id="report-item-filter">
                            <option value="">All Items</option>
                            <optgroup label="Seeds">
                                <option value="seed_Rice">Rice</option>
                                <option value="seed_Corn">Corn</option>
                                <option value="seed_Vegetables">Vegetables</option>
                            </optgroup>
                            <optgroup label="Equipment">
                                <option value="equip_Sprayer">Sprayer</option>
                                <option value="equip_Drill">Drill</option>
                                <option value="equip_Stirrup">Stirrup</option>
                                <option value="equip_Machete">Machete</option>
                            </optgroup>
                        </select>
                    </div>
                    <button class="btn btn-green" onclick="Reports.generateFromFilter()">Generate Report</button>
                </div>
            </div>
            
            <div id="report-result"></div>
            
            <div class="analytics-section">
                <h2>Data Analytics</h2>
                <div class="analytics-stats">
                    <div class="analytics-stat">
                        <h4 id="stat-total-dist">-</h4>
                        <p>Total Distributions</p>
                    </div>
                    <div class="analytics-stat">
                        <h4 id="stat-total-farmers">-</h4>
                        <p>Total Farmers</p>
                    </div>
                    <div class="analytics-stat">
                        <h4 id="stat-total-farms">-</h4>
                        <p>Total Farms</p>
                    </div>
                    <div class="analytics-stat">
                        <h4 id="stat-total-seeds">-</h4>
                        <p>Seed & Equipment Stocks</p>
                    </div>
                </div>
                <div class="analytics-charts">
                    <div class="analytics-chart">
                        <h4>Monthly Distribution Trends</h4>
                        <canvas id="dist-trend-chart" style="max-height: 250px;"></canvas>
                    </div>
                    <div class="analytics-chart">
                        <h4>Most Distributed Items</h4>
                        <canvas id="items-chart" style="max-height: 250px;"></canvas>
                    </div>
                </div>
                <div class="analytics-charts" style="margin-top: 20px;">
                    <div class="analytics-chart">
                        <h4>Top Farmers by Resources Received</h4>
                        <canvas id="top-farmers-chart" style="max-height: 250px;"></canvas>
                    </div>
                    <div class="analytics-chart">
                        <h4>Most Distributed Seed Types</h4>
                        <canvas id="seed-types-chart" style="max-height: 250px;"></canvas>
                    </div>
                </div>
            </div>
        `;
    },
    
    initReports() {
        const periodFilter = document.getElementById('report-period-filter');
        const dayFilter = document.getElementById('day-filter-group');
        const monthlyFilter = document.getElementById('monthly-filter-group');
        
        if (periodFilter) {
            periodFilter.addEventListener('change', function() {
                if (this.value === 'day') {
                    dayFilter.style.display = 'block';
                    monthlyFilter.style.display = 'none';
                } else if (this.value === 'monthly') {
                    dayFilter.style.display = 'none';
                    monthlyFilter.style.display = 'block';
                } else {
                    dayFilter.style.display = 'none';
                    monthlyFilter.style.display = 'none';
                }
            });
        }
        
        Promise.all([
            API.getSeeds({ limit: 100 }),
            API.getEquipment({ limit: 100 })
        ]).then(([seedsRes, equipRes]) => {
            const itemFilter = document.getElementById('report-item-filter');
            if (!itemFilter) return;
            
            const seeds = seedsRes.data || [];
            const equipment = equipRes.data || [];
            
            let seedGroup = itemFilter.querySelector('optgroup[label="Seeds"]');
            let equipGroup = itemFilter.querySelector('optgroup[label="Equipment"]');
            
            if (seedGroup) {
                seedGroup.innerHTML = seeds.map(s => `<option value="seed_${s.id}">${s.crop_type} - ${s.variety}</option>`).join('');
            }
            if (equipGroup) {
                equipGroup.innerHTML = equipment.map(e => `<option value="equip_${e.id}">${e.name}</option>`).join('');
            }
        });
        
        Reports.loadAnalytics();
    },
    
    getYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const selected = year === currentYear ? 'selected' : '';
            options += `<option value="${year}" ${selected}>${year}</option>`;
        }
        return options;
    },
    
    downloadReport(type) {
        var self = this;
        console.log('downloadReport called:', type);
        
        if (type === 'distribution') {
            API.getDistributions({ limit: 1000 }).then(function(res) {
                console.log('Got distributions:', res.data.length);
                self.saveReport(res.data, 'distribution_report');
            }).catch(function(err) {
                console.error('Error:', err);
                alert('Error generating report');
            });
        } else if (type === 'farmer') {
            API.getFarmers({ limit: 1000 }).then(function(res) {
                self.saveReport(res.data, 'farmer_records_report');
            }).catch(function(err) {
                console.error('Error:', err);
                alert('Error generating report');
            });
        } else if (type === 'farm') {
            API.getFarms({ limit: 1000 }).then(function(res) {
                self.saveReport(res.data, 'farm_details_report');
            }).catch(function(err) {
                console.error('Error:', err);
                alert('Error generating report');
            });
        } else if (type === 'stock') {
            API.getSeeds({ limit: 1000 }).then(function(seeds) {
                API.getEquipment({ limit: 1000 }).then(function(equipment) {
                    var data = { seeds: seeds.data, equipment: equipment.data };
                    self.saveReport(data, 'stock_report');
                });
            }).catch(function(err) {
                console.error('Error:', err);
                alert('Error generating report');
            });
        } else {
            alert('Unknown report type: ' + type);
        }
    },
    
    saveReport(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    async loadTrendChart() {
        const period = document.getElementById('trend-period').value;
        const months = document.getElementById('trend-months').value;
        
        try {
            const response = await API.getDistributionTrends(period, months);
            const data = response.data;
            
            const tbody = document.getElementById('trend-tbody');
            tbody.innerHTML = data.map(row => `
                <tr>
                    <td>${row.month_label || row.date || row.year}</td>
                    <td>${row.distributions}</td>
                    <td>${row.items_distributed}</td>
                </tr>
            `).join('');
            
            this.renderTrendChart(data, period);
        } catch (error) {
            console.error('Failed to load trends:', error);
        }
    },
    
    renderTrendChart(data, period) {
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
        
        canvas.width = canvas.parentElement.clientWidth - 40;
        canvas.height = 300;
        
        const labels = data.map(d => d.month_label || d.date || d.year);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Distributions',
                    data: data.map(d => d.distributions),
                    borderColor: '#22C55E',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Items Distributed',
                    data: data.map(d => d.items_distributed),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },
    
    async loadMostRequested() {
        try {
            const response = await API.getMostRequested('all', 10);
            const data = response.data;
            
            const tbody = document.getElementById('requested-tbody');
            let html = '';
            
            data.seeds.slice(0, 5).forEach((seed, idx) => {
                html += `<tr>
                    <td><span class="badge-status active">Seed</span></td>
                    <td>${seed.crop_type} (${seed.variety})</td>
                    <td>${seed.total_distributed} ${seed.unit}</td>
                    <td>${seed.times_requested}</td>
                </tr>`;
            });
            
            data.equipment.slice(0, 5).forEach((equip, idx) => {
                html += `<tr>
                    <td><span class="badge-status scheduled">Equipment</span></td>
                    <td>${equip.name}</td>
                    <td>${equip.total_distributed} units</td>
                    <td>${equip.times_requested}</td>
                </tr>`;
            });
            
            tbody.innerHTML = html;
            
            this.renderBarChart('seeds-chart', data.seeds.slice(0, 5).map(s => s.crop_type), data.seeds.slice(0, 5).map(s => s.total_distributed), 'Seeds');
            this.renderBarChart('equipment-chart', data.equipment.slice(0, 5).map(e => e.name), data.equipment.slice(0, 5).map(e => e.total_distributed), 'Equipment');
        } catch (error) {
            console.error('Failed to load most requested:', error);
        }
    },
    
    renderBarChart(canvasId, labels, data, label) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
        
        canvas.width = canvas.parentElement.clientWidth - 40;
        canvas.height = 250;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: label === 'Seeds' ? '#22C55E' : '#3B82F6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },
    
    async loadFarmerActivity() {
        const sortBy = document.getElementById('activity-sort').value;
        const limit = document.getElementById('activity-limit').value;
        
        try {
            const response = await API.getFarmerActivity(limit, sortBy);
            const data = response.data;
            
            document.getElementById('active-farmers').textContent = data.totals.active_farmers || 0;
            document.getElementById('total-distributions').textContent = data.totals.total_distributions || 0;
            document.getElementById('total-items-dist').textContent = data.totals.total_items_distributed || 0;
            
            const tbody = document.getElementById('activity-tbody');
            tbody.innerHTML = data.farmers.map((f, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${f.name}</td>
                    <td>${f.rsbsa_number || '-'}</td>
                    <td>${f.times_received}</td>
                    <td>${f.total_items}</td>
                </tr>
            `).join('');
            
            this.renderHorizontalBarChart('farmer-activity-chart', 
                data.farmers.slice(0, 10).map(f => f.name), 
                data.farmers.slice(0, 10).map(f => f.total_items), 
                'Items Received');
        } catch (error) {
            console.error('Failed to load farmer activity:', error);
        }
    },
    
    renderHorizontalBarChart(canvasId, labels, data, label) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
        
        canvas.width = canvas.parentElement.clientWidth - 40;
        canvas.height = 300;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: '#8B5CF6'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    },
    
    async loadStockPredictions() {
        try {
            const response = await API.getStockPredictions(30);
            const data = response.data;
            
            const alertsContainer = document.getElementById('prediction-alerts');
            const highAlerts = data.filter(d => d.alert_level === 'high');
            const mediumAlerts = data.filter(d => d.alert_level === 'medium');
            
            let alertsHtml = '';
            highAlerts.slice(0, 3).forEach(item => {
                alertsHtml += `<div class="alert alert-danger"><strong>${item.status.toUpperCase()}:</strong> ${item.name} - ${item.days_until_empty} days remaining</div>`;
            });
            mediumAlerts.slice(0, 3).forEach(item => {
                alertsHtml += `<div class="alert alert-warning"><strong>${item.status.toUpperCase()}:</strong> ${item.name} - ${item.days_until_threshold} days to threshold</div>`;
            });
            alertsContainer.innerHTML = alertsHtml || '<div class="alert alert-success">All stock levels are adequate</div>';
            
            const tbody = document.getElementById('predictions-tbody');
            tbody.innerHTML = data.slice(0, 20).map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.current_quantity} ${item.unit}</td>
                    <td>${item.daily_average}</td>
                    <td>${item.days_until_empty === 999 ? 'N/A' : item.days_until_empty}</td>
                    <td>${item.days_until_threshold === 999 ? 'N/A' : item.days_until_threshold}</td>
                    <td><span class="badge-status ${item.alert_level === 'high' ? 'inactive' : item.alert_level === 'medium' ? 'low_stock' : 'available'}">${item.status}</span></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Failed to load predictions:', error);
        }
    },
    
    async loadComparison() {
        const p1Start = document.getElementById('comp-p1-start').value;
        const p1End = document.getElementById('comp-p1-end').value;
        const p2Start = document.getElementById('comp-p2-start').value;
        const p2End = document.getElementById('comp-p2-end').value;
        
        try {
            const response = await API.getComparisonData(p1Start, p1End, p2Start, p2End);
            const data = response.data;
            
            document.getElementById('comp-p1-dist').textContent = data.period1.distributions;
            document.getElementById('comp-p2-dist').textContent = data.period2.distributions;
            
            const changeEl = document.getElementById('comp-change');
            const change = data.changes.distributions;
            changeEl.textContent = (change >= 0 ? '+' : '') + change + '%';
            changeEl.style.color = change >= 0 ? 'var(--success)' : 'var(--error)';
            
            this.renderPieChart('crop-comparison-chart', data.crops.map(c => c.crop_type), data.crops.map(c => c.count));
            this.renderPieChart('region-comparison-chart', data.regions.slice(0, 5).map(r => r.barangay), data.regions.slice(0, 5).map(r => r.count));
        } catch (error) {
            console.error('Failed to load comparison:', error);
        }
    },
    
    renderPieChart(canvasId, labels, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
        
        canvas.width = canvas.parentElement.clientWidth - 40;
        canvas.height = 250;
        
        const colors = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
        
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    },
    
    async loadReportStats() {
        try {
            const response = await API.getDistributionStats();
            const stats = response.data;
            
            document.getElementById('report-total-dist').textContent = stats.total_distributions || 0;
            document.getElementById('report-farmers-served').textContent = stats.unique_farmers || 0;
            document.getElementById('report-items-dist').textContent = stats.total_items_distributed || 0;
        } catch (error) {
            console.error('Failed to load report stats:', error);
        }
    },
    
    async generateReport() {
        const type = document.getElementById('report-type').value;
        
        if (type === 'distribution') {
            const response = await API.getDistributions({ limit: 100 });
            const distributions = response.data || [];
            const tbody = document.getElementById('report-tbody');
            let html = '';
            distributions.forEach(dist => {
                (dist.items || []).forEach(item => {
                    let itemDisplay;
                    if (item.item_type === 'seed') {
                        itemDisplay = item.seed_variety || item.item_variety || item.item_name || 'Seed';
                    } else if (item.item_type === 'equipment') {
                        itemDisplay = item.equip_name || item.equip_category || item.item_category || item.item_name || 'Equipment';
                    } else {
                        itemDisplay = item.item_name || 'Item';
                    }
                    html += `<tr><td>${dist.distribution_date}</td><td>${dist.farmer_name || 'Farmer #' + dist.farmer_id}</td><td>${itemDisplay}</td><td>${item.quantity}</td><td>${dist.season || '-'}</td></tr>`;
                });
            });
            tbody.innerHTML = html || '<tr><td colspan="5" class="text-center">No data found</td></tr>';
        } else if (type === 'farmer') {
            const response = await API.getFarmers({ limit: 100 });
            const tbody = document.getElementById('report-tbody');
            let html = '';
            (response.data || []).forEach(f => {
                html += `<tr><td>${f.rsbsa_number || '-'}</td><td>${f.name}</td><td>${f.barangay || '-'}</td><td>${f.farm_size || '-'} ha</td><td>${f.status || 'active'}</td></tr>`;
            });
            tbody.innerHTML = html || '<tr><td colspan="5" class="text-center">No data found</td></tr>';
        } else if (type === 'inventory') {
            const tbody = document.getElementById('report-tbody');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Feature coming soon</td></tr>';
        }
    },
    
    exportReport() {
        const activePanel = document.querySelector('.analytics-panel.active');
        if (!activePanel) {
            Utils.showToast('error', 'Error', 'No data to export');
            return;
        }
        
        const tables = activePanel.querySelectorAll('table');
        if (tables.length === 0) {
            Utils.showToast('error', 'Error', 'No table data to export');
            return;
        }
        
        let csv = [];
        tables.forEach((table, tableIndex) => {
            const tableTitle = table.previousElementSibling?.textContent || `Table ${tableIndex + 1}`;
            csv.push(`# ${tableTitle}`);
            
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');
            
            if (thead) {
                const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());
                csv.push(headers.join(','));
            }
            
            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0) {
                        const rowData = Array.from(cells).map(cell => {
                            let text = cell.textContent.trim();
                            if (text.includes(',')) {
                                text = '"' + text + '"';
                            }
                            return text;
                        });
                        csv.push(rowData.join(','));
                    }
                });
            }
            csv.push('');
        });
        
        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'analytics_report_' + new Date().toISOString().split('T')[0] + '.csv';
        link.click();
        
        Utils.showToast('success', 'Success', 'Report exported successfully');
    },
    
    printReport() {
        const activePanel = document.querySelector('.analytics-panel.active');
        if (!activePanel) return;
        
        const tables = activePanel.querySelectorAll('table');
        const charts = activePanel.querySelectorAll('canvas');
        
        if (tables.length === 0 && charts.length === 0) {
            Utils.showToast('error', 'Error', 'No data to print');
            return;
        }
        
        const activeTab = document.querySelector('.analytics-tab.active');
        const tabName = activeTab ? activeTab.textContent.trim() : 'Analytics Report';
        
        let tablesHtml = '';
        tables.forEach(table => {
            tablesHtml += table.outerHTML;
        });
        
        let chartsHtml = '';
        charts.forEach(chart => {
            const chartImage = chart.toDataURL('image/png');
            chartsHtml += `<div class="chart-container"><img src="${chartImage}" /></div>`;
        });
        
        let statsHtml = '';
        const statsCards = activePanel.querySelectorAll('.stat-card');
        if (statsCards.length > 0) {
            statsHtml = '<div class="stats-grid">';
            statsCards.forEach(card => {
                const value = card.querySelector('h3')?.textContent || '-';
                const label = card.querySelector('p')?.textContent || '';
                statsHtml += `
                    <div class="stat-card">
                        <h3>${value}</h3>
                        <p>${label}</p>
                    </div>
                `;
            });
            statsHtml += '</div>';
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${tabName}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
                    h1 { margin-bottom: 10px; color: #1E293B; border-bottom: 2px solid #22C55E; padding-bottom: 10px; }
                    .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
                    .report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                    .logo { display: flex; align-items: center; gap: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                    th { background: #22C55E; color: white; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .chart-container { page-break-inside: avoid; margin-bottom: 20px; text-align: center; }
                    .chart-container img { max-width: 100%; max-height: 400px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
                    .stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; border-radius: 5px; }
                    .stat-card h3 { margin: 0; font-size: 24px; color: #22C55E; }
                    .stat-card p { margin: 5px 0 0; color: #666; font-size: 12px; }
                    .stats-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                    .print-header { text-align: left; margin-bottom: 20px; }
                    .print-header h2 { margin: 0; font-size: 16px; font-weight: bold; }
                    .print-header h3 { margin: 10px 0 5px; font-size: 14px; font-weight: bold; }
                    .print-header p { margin: 2px 0; font-size: 12px; }
                    .print-header .program-title { font-size: 14px; font-weight: bold; margin: 10px 0; }
                    .print-header .location-info { margin-top: 10px; font-size: 12px; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h2>DEPARTMENT OF AGRICULTURE</h2>
                    <h2>REGIONAL OFFFICE VII</h2>
                    <p>KANHURAW HILL, TACLOBAN CITY</p>
                    <p class="program-title">High Value Crops Development Program</p>
                    <p class="program-title">VEGETABLE SEEDS</p>
                    <div class="location-info">
                        <p><strong>Municipality:</strong> ZUMARRAGA, SAMAR</p>
                        <p><strong>Province:</strong> SAMAR</p>
                    </div>
                </div>
                <div class="report-header">
                    <h1>${tabName}</h1>
                    <div class="meta">Generated: ${new Date().toLocaleDateString()}</div>
                </div>
                ${statsHtml}
                ${chartsHtml}
                ${tablesHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    },
    farmPage() {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Farms</h1>
                    <p class="page-subtitle">Manage farm information and details</p>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary-outline" id="sync-farms-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                        Sync from Farmers
                    </button>
                    <button class="btn btn-primary" id="add-farm-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add Farm
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="table-header">
                    <div class="search-box">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="farm-search" placeholder="Search farms...">
                    </div>
                </div>
                <div class="table-container">
                    <table id="farm-table">
                        <thead>
                            <tr>
                                <th>Farm ID</th>
                                <th>Farmer</th>
                                <th>Location</th>
                                <th>Farm Size</th>
                                <th>Crop Type</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="farm-tbody">
                            <tr>
                                <td colspan="6" class="text-center">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="pagination" id="farm-pagination">
                    <div class="pagination-info" id="farm-pagination-info">Showing 0 to 0 of 0 records</div>
                    <div class="pagination-controls" id="farm-pagination-controls"></div>
                </div>
            </div>
        `;
    },
    
    async initFarm() {
        await this.loadFarms();
        
        document.getElementById('add-farm-btn').addEventListener('click', () => this.showFarmModal());
        
        document.getElementById('sync-farms-btn').addEventListener('click', async () => {
            try {
                document.getElementById('sync-farms-btn').textContent = 'Syncing...';
                const res = await API.syncFarmsFromFarmers();
                Utils.showToast('success', 'Success', res.message);
                await this.loadFarms();
                document.getElementById('sync-farms-btn').innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Sync from Farmers';
            } catch (error) {
                Utils.showToast('error', 'Error', 'Failed to sync farms');
            }
        });
        
        document.getElementById('farm-search').addEventListener('input', Utils.debounce(async (e) => {
            await this.searchFarms(e.target.value);
        }, 300));
    },
    
    async loadFarms(page = 1) {
        try {
            const response = await API.getFarms({ page, limit: 10 });
            this.renderFarmTable(response.data);
            this.renderFarmPagination(response.pagination);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load farms');
        }
    },
    
    renderFarmPagination(pagination) {
        const info = document.getElementById('farm-pagination-info');
        const controls = document.getElementById('farm-pagination-controls');
        
        if (!pagination) {
            info.textContent = '';
            controls.innerHTML = '';
            return;
        }
        
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        
        info.textContent = `Showing ${start} to ${end} of ${pagination.total} records`;
        
        let buttons = '';
        
        if (pagination.pages > 1) {
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadFarms(1)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === 1 ? 'disabled' : ''} onclick="Pages.loadFarms(${pagination.page - 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>`;
            
            const maxVisible = 5;
            let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
            let endPage = Math.min(pagination.pages, startPage + maxVisible - 1);
            
            for (let i = startPage; i <= endPage; i++) {
                buttons += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="Pages.loadFarms(${i})">${i}</button>`;
            }
            
            if (endPage < pagination.pages) {
                buttons += `<span class="pagination-dots">...</span>`;
            }
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadFarms(${pagination.page + 1})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
            
            buttons += `<button class="pagination-btn pagination-arrow" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="Pages.loadFarms(${pagination.pages})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>`;
        }
        
        controls.innerHTML = buttons;
    },
    
    renderFarmTable(farms) {
        const tbody = document.getElementById('farm-tbody');
        
        if (!farms || farms.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No farms found</td></tr>';
            return;
        }
        
        tbody.innerHTML = farms.map(farm => `
            <tr>
                <td>F${String(farm.id).padStart(3, '0')}</td>
                <td>${farm.farmer_name || 'Farmer #' + farm.farmer_id}<br><small>${farm.rsbsa_number || ''}</small></td>
                <td>${farm.barangay || farm.location || '-'}</td>
                <td>${farm.size ? farm.size + ' ' + (farm.size_unit || 'ha') : '-'}</td>
                <td>${farm.crop_type || '-'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="Pages.editFarm(${farm.id})" title="Edit">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="Pages.deleteFarm(${farm.id})" title="Delete">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    async searchFarms(query) {
        try {
            const response = await API.getFarms({ search: query });
            this.renderFarmTable(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Search failed');
        }
    },
    
    showFarmModal(farm = null) {
        const isEdit = farm !== null;
        document.getElementById('modal-title').textContent = isEdit ? 'Edit Farm' : 'Add Farm';
        
        this.loadFarmersForModal(farm, isEdit);
        
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    
    async loadFarmersForModal(farm = null, isEdit = false) {
        try {
            const response = await API.getFarmers({ limit: 500 });
            const farmers = response.data;
            
            const farmerSelect = `
                <select class="form-control" name="farmer_id" id="farm-farmer-select" required ${isEdit ? 'disabled' : ''} oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    <option value="">Select Farmer</option>
                    ${farmers.map(f => `<option value="${f.id}" ${farm?.farmer_id == f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                </select>
            `;
            
            document.getElementById('modal-body').innerHTML = `
                <form id="farm-form" class="app-form" onsubmit="event.preventDefault(); Pages.saveFarm(${farm?.id || null});">
                    <div class="form-group">
                        <label>Farmer *</label>
                        ${farmerSelect}
                        ${isEdit ? '<input type="hidden" name="farmer_id" value="' + farm.farmer_id + '">' : ''}
                    </div>
                    <div class="form-group">
                        <label>Farm Name *</label>
                        <input type="text" class="form-control" name="farm_name" value="${farm?.farm_name || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="form-group">
                        <label>Location *</label>
                        <input type="text" class="form-control" name="location" id="farm-location" value="${farm?.location || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label>Size *</label>
                            <input type="number" step="0.01" class="form-control" name="size" value="${farm?.size || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                        </div>
                        <div class="form-group">
                            <label>Unit *</label>
                            <select class="form-control" name="size_unit" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                                <option value="hectares" ${farm?.size_unit === 'hectares' ? 'selected' : ''}>Hectares</option>
                                <option value="acres" ${farm?.size_unit === 'acres' ? 'selected' : ''}>Acres</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Crop Type *</label>
                        <input type="text" class="form-control" name="crop_type" value="${farm?.crop_type || ''}" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                    </div>
                    <div class="form-group">
                        <label>Status *</label>
                        <select class="form-control" name="status" required oninvalid="this.setCustomValidity('Please fill the required information')" oninput="this.setCustomValidity('')">
                            <option value="active" ${farm?.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${farm?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </form>
            `;
            
            if (!isEdit) {
                document.getElementById('farm-farmer-select').addEventListener('change', async (e) => {
                    const farmerId = e.target.value;
                    if (farmerId) {
                        const farmer = farmers.find(f => f.id == farmerId);
                        if (farmer && farmer.barangay) {
                            document.getElementById('farm-location').value = farmer.barangay;
                        }
                    }
                });
            }
            
            document.getElementById('modal-footer').innerHTML = `
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="Pages.saveFarm(${farm?.id || null})">${isEdit ? 'Update' : 'Save'}</button>
            `;
        } catch (error) {
            console.error('Failed to load farmers:', error);
        }
    },
    
    async saveFarm(id = null) {
        const form = document.getElementById('farm-form');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        if (!id && !data.farmer_id) {
            Utils.showToast('error', 'Error', 'Please select a farmer');
            return;
        }
        
        try {
            if (id) {
                await API.updateFarm(id, data);
                Utils.showToast('success', 'Success', 'Farm updated successfully');
            } else {
                await API.createFarm(data);
                Utils.showToast('success', 'Success', 'Farm created successfully and farmer farm size updated');
            }
            
            App.closeModal();
            await this.loadFarms();
        } catch (error) {
            Utils.showToast('error', 'Error', error.message);
        }
    },
    
    async editFarm(id) {
        try {
            const response = await API.getFarm(id);
            this.showFarmModal(response.data);
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to load farm');
        }
    },
    
    async deleteFarm(id) {
        if (!confirm('Are you sure you want to delete this farm?')) return;
        if (this.deleteInProgress) return;
        this.deleteInProgress = true;
        
        try {
            await API.deleteFarm(id);
            Utils.showToast('success', 'Success', 'Farm deleted successfully');
            await this.loadFarms();
        } catch (error) {
            Utils.showToast('error', 'Error', 'Failed to delete farm');
        } finally {
            this.deleteInProgress = false;
        }
    },
    
    // Settings Page
    settingsPage() {
        return `
            <div class="page-header">
                <div class="page-header-content">
                    <h1>Settings</h1>
                    <p class="page-subtitle">Manage your account and application settings</p>
                </div>
            </div>
            
            <div class="settings-container">
                <div class="settings-nav">
                    <button class="settings-tab active" data-tab="profile">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        Profile
                    </button>
                    <button class="settings-tab" data-tab="security">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                        Security
                    </button>
                    <button class="settings-tab" data-tab="notifications">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                        Notifications
                    </button>
                    <button class="settings-tab" data-tab="users">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        Users & Access
                    </button>
                    <button class="settings-tab" data-tab="system">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                        System
                    </button>
                    <button class="settings-tab" data-tab="allocations">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                        Yearly Allocations
                    </button>
                </div>
                
                <div class="settings-content">
                    <div class="settings-panel active" id="profile-panel">
                        <div class="card">
                            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">Profile Information</h3>
                                    <p style="margin: 3px 0 0 0; font-size: 12.5px; color: #64748b;">Update your personal details, email address, and account avatar picture</p>
                                </div>
                            </div>
                            <div class="card-body" style="padding: 24px;">
                                <div class="profile-avatar-section">
                                    <div class="profile-avatar-display" id="profile-avatar-preview-box" style="width: 88px; height: 88px; min-width: 88px; max-width: 88px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <span id="profile-avatar-fallback-initial">A</span>
                                    </div>
                                    <div class="profile-avatar-details">
                                        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1e293b;">Profile Picture</h4>
                                        <p style="margin: 0 0 12px 0; font-size: 12.5px; color: #64748b;">Upload a JPG, PNG, or WebP photo (Max 5MB). Photo is automatically optimized for fast loading.</p>
                                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                            <input type="file" id="profile-avatar-input" accept="image/png, image/jpeg, image/jpg, image/webp, image/gif" style="display: none;">
                                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('profile-avatar-input').click()" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 13px;">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
                                                Upload Photo
                                            </button>
                                            <button type="button" class="btn btn-secondary-outline" id="profile-avatar-remove-btn" onclick="Pages.removeProfileAvatar()" style="display: none; padding: 7px 14px; font-size: 13px; color: #dc2626; border-color: #fca5a5;">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="vertical-align: -2px; margin-right: 4px;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                                Remove Photo
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

                                <form id="profile-form" class="app-form" onsubmit="event.preventDefault(); Pages.saveProfile();">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group">
                                            <label style="font-weight: 600;">Full Name <span style="color: #ef4444;">*</span></label>
                                            <input type="text" class="form-control" id="setting-fullname" placeholder="Enter your full name" required autocomplete="name">
                                        </div>
                                        <div class="form-group">
                                            <label style="font-weight: 600;">Email Address <span style="color: #ef4444;">*</span></label>
                                            <input type="email" class="form-control" id="setting-email" placeholder="e.g. yourname@domain.com" required autocomplete="email">
                                            <small style="color: #64748b; font-size: 11.5px; display: block; margin-top: 4px;">You can also use this email to log in to the distribution system.</small>
                                        </div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 4px;">
                                        <div class="form-group">
                                            <label style="font-weight: 600;">Username</label>
                                            <input type="text" class="form-control" id="setting-username" disabled style="background: #f8fafc; color: #64748b; cursor: not-allowed;">
                                            <small style="color: #64748b; font-size: 11.5px; display: block; margin-top: 4px;">Your unique system login handle.</small>
                                        </div>
                                        <div class="form-group">
                                            <label style="font-weight: 600;">Assigned Role</label>
                                            <input type="text" class="form-control" id="setting-role" disabled style="background: #f8fafc; color: #64748b; cursor: not-allowed;">
                                            <small style="color: #64748b; font-size: 11.5px; display: block; margin-top: 4px;">Managed by system administrators.</small>
                                        </div>
                                    </div>
                                    <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                                        <button type="submit" class="btn btn-primary" id="save-profile-btn" style="display: inline-flex; align-items: center; gap: 8px; padding: 9px 20px;">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                                            Save Profile Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-panel" id="security-panel">
                        <div class="card">
                            <div class="card-header">
                                <h3>Change Password</h3>
                            </div>
                            <div class="card-body">
                                <form id="password-form" class="app-form">
                                    <div class="form-group">
                                        <label>Current Password</label>
                                        <input type="password" class="form-control" name="current_password">
                                    </div>
                                    <div class="form-group">
                                        <label>New Password</label>
                                        <input type="password" class="form-control" name="new_password">
                                    </div>
                                    <div class="form-group">
                                        <label>Confirm New Password</label>
                                        <input type="password" class="form-control" name="confirm_password">
                                    </div>
                                    <button type="button" class="btn btn-primary" onclick="Pages.changePassword()">Update Password</button>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-panel" id="notifications-panel">
                        <div class="card">
                            <div class="card-header">
                                <h3>Notification Preferences</h3>
                            </div>
                            <div class="card-body">
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label>Low Stock Alerts</label>
                                        <p>Get notified when inventory is running low</p>
                                    </div>
                                    <label class="toggle">
                                        <input type="checkbox" id="low-stock-alerts" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label>Distribution Reminders</label>
                                        <p>Reminders for upcoming scheduled distributions</p>
                                    </div>
                                    <label class="toggle">
                                        <input type="checkbox" id="distribution-reminders" checked>
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="settings-panel" id="users-panel">
                        <!-- Summary Stats Cards -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 14px;">
                                <div style="width: 44px; height: 44px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Users</div>
                                    <div id="stat-total-users" style="font-size: 22px; font-weight: 700; color: #0f172a;">0</div>
                                </div>
                            </div>
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 14px;">
                                <div style="width: 44px; height: 44px; border-radius: 10px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Active Accounts</div>
                                    <div id="stat-active-users" style="font-size: 22px; font-weight: 700; color: #16a34a;">0</div>
                                </div>
                            </div>
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 14px;">
                                <div style="width: 44px; height: 44px; border-radius: 10px; background: #fff1f2; color: #e11d48; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Unused Accounts</div>
                                    <div id="stat-unused-users" style="font-size: 22px; font-weight: 700; color: #e11d48;">0</div>
                                </div>
                            </div>
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 14px;">
                                <div style="width: 44px; height: 44px; border-radius: 10px; background: #ede9fe; color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Administrators</div>
                                    <div id="stat-admin-users" style="font-size: 22px; font-weight: 700; color: #7c3aed;">0</div>
                                </div>
                            </div>
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 14px;">
                                <div style="width: 44px; height: 44px; border-radius: 10px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Logins Today</div>
                                    <div id="stat-today-logins" style="font-size: 22px; font-weight: 700; color: #d97706;">0</div>
                                </div>
                            </div>
                        </div>

                        <!-- Sub-Navigation Switcher -->
                        <div class="card" style="margin-bottom: 0;">
                            <div style="border-bottom: 1px solid #e2e8f0; padding: 10px 20px 0 20px; display: flex; gap: 10px; background: #fafafa; border-radius: 10px 10px 0 0;">
                                <button class="subtab-btn active" id="btn-subtab-users" onclick="Pages.switchUserSubtab('users-list')">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                    System Users & Access
                                </button>
                                <button class="subtab-btn" id="btn-subtab-history" onclick="Pages.switchUserSubtab('login-history')">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
                                    Login History & Activity
                                </button>
                            </div>

                            <!-- Sub-Panel 1: Users List -->
                            <div id="user-subpanel-users-list" style="padding: 20px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
                                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; flex: 1;">
                                        <div style="position: relative; min-width: 220px; max-width: 300px; flex: 1;">
                                            <input type="text" id="user-search-input" class="form-control" placeholder="Search by name or username..." oninput="Pages.filterUsersTable()">
                                        </div>
                                        <select id="user-role-filter" class="form-control" style="width: auto; padding: 7px 12px;" onchange="Pages.filterUsersTable()">
                                            <option value="">All Roles</option>
                                            <option value="admin">Administrator</option>
                                            <option value="staff">Staff</option>
                                            <option value="farmer">Farmer</option>
                                        </select>
                                        <select id="user-status-filter" class="form-control" style="width: auto; padding: 7px 12px;" onchange="Pages.filterUsersTable()">
                                            <option value="">All Statuses</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="unused">Never Logged In (Unused)</option>
                                        </select>
                                    </div>
                                    <div id="user-action-buttons-container" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                        <button class="btn btn-secondary-outline" id="btn-clean-unused-users" onclick="Pages.deleteUnusedUsersPrompt()" style="display: inline-flex; align-items: center; gap: 6px; color: #e11d48; border-color: #fecdd3;" title="Delete all user accounts that have never logged into the system">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                            Delete Unused Accounts
                                        </button>
                                        <button class="btn btn-primary" onclick="Pages.showAddUserModal()" style="display: inline-flex; align-items: center; gap: 6px;">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                                            Add New User
                                        </button>
                                    </div>
                                </div>

                                <div class="table-responsive" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                                    <table class="data-table" id="users-management-table" style="width: 100%; margin: 0;">
                                        <thead>
                                            <tr>
                                                <th>User Profile</th>
                                                <th>System Role</th>
                                                <th>Account Status</th>
                                                <th>Last Login</th>
                                                <th>Created Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="users-management-tbody">
                                            <tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">Loading users...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Sub-Panel 2: Login History -->
                            <div id="user-subpanel-login-history" style="display: none; padding: 20px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
                                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; flex: 1;">
                                        <div style="position: relative; min-width: 240px; max-width: 320px; flex: 1;">
                                            <input type="text" id="login-log-search" class="form-control" placeholder="Search user, name or IP..." oninput="Pages.filterLoginLogsTable()">
                                        </div>
                                        <select id="login-status-filter" class="form-control" style="width: auto; padding: 7px 12px;" onchange="Pages.filterLoginLogsTable()">
                                            <option value="">All Statuses</option>
                                            <option value="success">Successful Logins</option>
                                            <option value="failed">Failed Attempts</option>
                                        </select>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="btn btn-secondary-outline" onclick="Pages.loadLoginLogs()" title="Refresh Logs" style="padding: 7px 12px;">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> Refresh
                                        </button>
                                        <button class="btn btn-secondary-outline" onclick="Pages.exportLoginLogs()" style="padding: 7px 12px;">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Export Logs
                                        </button>
                                    </div>
                                </div>

                                <div class="table-responsive" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                                    <table class="data-table" id="login-history-table" style="width: 100%; margin: 0;">
                                        <thead>
                                            <tr>
                                                <th>Login Time</th>
                                                <th>User Account</th>
                                                <th>Role</th>
                                                <th>IP Address</th>
                                                <th>Client / Device</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody id="login-history-tbody">
                                            <tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">Loading login history...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="settings-panel" id="system-panel">
                        <div class="card">
                            <div class="card-header">
                                <h3>System Information</h3>
                            </div>
                            <div class="card-body">
                                <div class="system-info">
                                    <div class="info-row">
                                        <span class="info-label">Application</span>
                                        <span class="info-value">Seed Distribution System</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Version</span>
                                        <span class="info-value">1.0.0</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Database</span>
                                        <span class="info-value">MySQL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h3>Data Management</h3>
                            </div>
                            <div class="card-body">
                                <button class="btn btn-secondary-outline" onclick="(async () => { await Pages.exportData(); })()">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                    Export All Data
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="settings-panel" id="allocations-panel">
                        <div class="card">
                            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                                <div>
                                    <h3 style="margin: 0;">Farmer Allocations by Year</h3>
                                    <p class="page-subtitle" style="margin: 3px 0 0 0; font-size: 13px; color: #64748b;">Select allocation year and specific seed/equipment type to view recipient farmers.</p>
                                </div>
                                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <label style="font-weight: 600; margin: 0; font-size: 13px; color: #1e293b;">Year:</label>
                                        <select id="allocation-year-select" class="form-control" style="width: auto; font-weight: bold; background-color: #f0fdf4; border-color: #22c55e; color: #15803d; padding: 6px 12px;" onchange="Pages.loadYearlyAllocations(this.value)">
                                            <option value="2026">2026 Allocation Year</option>
                                            <option value="2025">2025 Allocation Year</option>
                                            <option value="2024">2024 Allocation Year</option>
                                            <option value="all">All Years</option>
                                        </select>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <label style="font-weight: 600; margin: 0; font-size: 13px; color: #1e293b;">Seed / Item Type:</label>
                                        <select id="allocation-seed-select" class="form-control" style="width: auto; font-weight: 600; background-color: #eff6ff; border-color: #3b82f6; color: #1d4ed8; padding: 6px 12px;" onchange="Pages.filterYearlyAllocationsTable()">
                                            <option value="">All Seeds & Equipment</option>
                                            <option value="Equipment">Equipment</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="allocation-summary-bar" id="allocation-summary-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center;">
                                        <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Total Allocated Farmers</div>
                                        <div id="stat-year-farmers" style="font-size: 24px; font-weight: 700; color: #2E7D32; margin-top: 5px;">0</div>
                                    </div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center;">
                                        <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Total Seed Quantity (Units/Kg)</div>
                                        <div id="stat-year-seeds" style="font-size: 24px; font-weight: 700; color: #166534; margin-top: 5px;">0</div>
                                    </div>
                                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center;">
                                        <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Total Equipment (Units)</div>
                                        <div id="stat-year-equip" style="font-size: 24px; font-weight: 700; color: #d97706; margin-top: 5px;">0</div>
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                                    <div style="position: relative; width: 300px;">
                                        <input type="text" id="allocation-search-input" class="form-control" placeholder="Search farmer name or barangay..." oninput="Pages.filterYearlyAllocationsTable()">
                                    </div>
                                    <button class="btn btn-secondary-outline" onclick="Pages.exportYearlyAllocations()">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Export Report
                                    </button>
                                </div>

                                <div class="table-responsive" style="overflow-x: auto;">
                                    <table class="data-table" id="yearly-allocations-table" style="width: 100%;">
                                        <thead>
                                            <tr>
                                                <th>Farmer Name</th>
                                                <th>RSBSA No.</th>
                                                <th>Barangay</th>
                                                <th>Farm Size</th>
                                                <th>Seeds Allocated</th>
                                                <th>Equipment Allocated</th>
                                                <th>Date Received</th>
                                            </tr>
                                        </thead>
                                        <tbody id="yearly-allocations-tbody">
                                            <tr><td colspan="7" style="text-align: center; padding: 20px;">Loading allocations...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    currentAvatarData: null,

    renderProfileAvatarPreview() {
        const previewBox = document.getElementById('profile-avatar-preview-box');
        const removeBtn = document.getElementById('profile-avatar-remove-btn');
        const headerAvatar = document.querySelector('#user-info .user-avatar');

        if (this.currentAvatarData) {
            if (previewBox) {
                previewBox.innerHTML = `<img src="${this.currentAvatarData}" class="profile-avatar-img" alt="Avatar Preview" style="width: 88px; height: 88px; max-width: 88px; max-height: 88px; object-fit: cover; border-radius: 50%; display: block;">`;
            }
            if (removeBtn) removeBtn.style.display = 'inline-flex';
            if (headerAvatar) {
                headerAvatar.innerHTML = `<img src="${this.currentAvatarData}" class="user-avatar-img" alt="Avatar" style="width: 36px; height: 36px; max-width: 36px; max-height: 36px; object-fit: cover; border-radius: 50%; display: block;">`;
            }
        } else {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const initial = (user.full_name || user.username || 'U').charAt(0).toUpperCase();
            if (previewBox) {
                previewBox.innerHTML = `<span id="profile-avatar-fallback-initial">${initial}</span>`;
            }
            if (removeBtn) removeBtn.style.display = 'none';
            if (headerAvatar) {
                headerAvatar.innerHTML = `<span id="user-initial">${initial}</span>`;
            }
        }
    },

    removeProfileAvatar() {
        this.currentAvatarData = null;
        this.renderProfileAvatarPreview();
        const fileInput = document.getElementById('profile-avatar-input');
        if (fileInput) fileInput.value = '';
    },

    initSettings() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const uEl = document.getElementById('setting-username');
        if (uEl) uEl.value = user.username ? `@${user.username}` : '';
        const fEl = document.getElementById('setting-fullname');
        if (fEl) fEl.value = user.full_name || '';
        const eEl = document.getElementById('setting-email');
        if (eEl) eEl.value = user.email || '';
        const rEl = document.getElementById('setting-role');
        if (rEl) {
            const roleName = user.role === 'admin' ? 'System Administrator' : (user.role === 'farmer' ? 'Farmer Representative' : 'Agricultural Staff');
            rEl.value = roleName;
        }

        this.currentAvatarData = user.avatar || null;
        this.renderProfileAvatarPreview();

        const avatarInput = document.getElementById('profile-avatar-input');
        if (avatarInput) {
            avatarInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    Utils.showToast('error', 'Invalid File', 'Please select an image file (JPG, PNG, WebP)');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    Utils.showToast('error', 'File Too Large', 'Please select an image smaller than 5MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (re) => {
                    const img = new Image();
                    img.onload = () => {
                        // Downscale/compress image on canvas to max 400x400 for speed and optimal database storage
                        const maxDim = 400;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                            if (width > maxDim) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                            }
                        } else {
                            if (height > maxDim) {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

                        Pages.currentAvatarData = optimizedDataUrl;
                        Pages.renderProfileAvatarPreview();
                    };
                    img.src = re.target.result;
                };
                reader.readAsDataURL(file);
            };
        }
        
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.settings-tab');
                if (!targetBtn) return;

                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                
                targetBtn.classList.add('active');
                const tabId = targetBtn.dataset.tab;
                const panel = document.getElementById(tabId + '-panel');
                if (panel) panel.classList.add('active');

                if (tabId === 'allocations') {
                    Pages.loadYearlyAllocations();
                } else if (tabId === 'users') {
                    Pages.loadUserStats();
                    Pages.loadUsersList();
                    Pages.loadLoginLogs();
                }
            });
        });
    },

    yearlyAllocationsData: [],
    
    async loadYearlyAllocations(year = null) {
        var tbody = document.getElementById('yearly-allocations-tbody');
        var yearSelect = document.getElementById('allocation-year-select');
        var seedSelect = document.getElementById('allocation-seed-select');
        
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading allocations...</td></tr>';
        }

        if (!year && yearSelect && yearSelect.value) {
            year = yearSelect.value;
        }
        
        var savedYear = localStorage.getItem('selectedAllocationYear') || new Date().getFullYear();
        var targetYear = year || savedYear;
        if (targetYear) {
            localStorage.setItem('selectedAllocationYear', targetYear);
        }
        
        try {
            var res = await API.getDistributionsByYear({ year: targetYear === 'all' ? '' : targetYear });
            if (res && res.success) {
                this.yearlyAllocationsData = res.data || [];
                
                if (yearSelect && res.available_years && res.available_years.length > 0) {
                    var currentSel = yearSelect.value || targetYear;
                    var opts = '<option value="all"' + (currentSel === 'all' ? ' selected' : '') + '>All Years</option>';
                    res.available_years.forEach(function(y) {
                        var isSel = (String(y) === String(currentSel)) ? ' selected' : '';
                        opts += `<option value="${y}"${isSel}>${y} Allocation Year</option>`;
                    });
                    yearSelect.innerHTML = opts;
                }

                if (seedSelect) {
                    var prevSeedSel = seedSelect.value || '';
                    var seedOpts = '<option value="">All Seeds & Equipment</option>';
                    seedOpts += '<option value="Equipment"' + (prevSeedSel.toLowerCase() === 'equipment' ? ' selected' : '') + '>Equipment</option>';
                    var rawSeedTypes = res.available_seed_types || [];

                    // Also extract from current dataset if needed
                    if (rawSeedTypes.length === 0 && this.yearlyAllocationsData.length > 0) {
                        var typesSet = new Set();
                        this.yearlyAllocationsData.forEach(function(d) {
                            if (d.items && Array.isArray(d.items)) {
                                d.items.forEach(function(it) {
                                    if (it.seed_crop_type) typesSet.add(it.seed_crop_type);
                                    if (it.seed_variety) typesSet.add(it.seed_variety);
                                    if (it.equip_name) typesSet.add(it.equip_name);
                                    if (it.equip_category) typesSet.add(it.equip_category);
                                });
                            }
                        });
                        rawSeedTypes = Array.from(typesSet);
                    }

                    // Clean and deduplicate seedTypes, removing any compound formats with parentheses like "Vegetable (Sitaw)" and generic "Equipment"
                    var cleanSet = new Set();
                    rawSeedTypes.forEach(function(st) {
                        if (!st || typeof st !== 'string') return;
                        var trimmed = st.trim();
                        if (trimmed.toLowerCase() === 'equipment' || trimmed.toLowerCase() === 'all equipment') {
                            return; // Already added as top option
                        }
                        if (trimmed.includes('(') && trimmed.includes(')')) {
                            var match = trimmed.match(/^([^\(]+)\s*\((.+)\)$/);
                            if (match) {
                                if (match[1] && match[1].trim() && match[1].trim().toLowerCase() !== 'equipment') cleanSet.add(match[1].trim());
                                if (match[2] && match[2].trim() && match[2].trim().toLowerCase() !== 'equipment') cleanSet.add(match[2].trim());
                            }
                            return;
                        }
                        if (trimmed) cleanSet.add(trimmed);
                    });

                    var sortedSeedTypes = Array.from(cleanSet).sort(function(a, b) {
                        return a.localeCompare(b, undefined, { sensitivity: 'base' });
                    });

                    sortedSeedTypes.forEach(function(st) {
                        var isSel = (st.toLowerCase() === prevSeedSel.toLowerCase()) ? ' selected' : '';
                        seedOpts += `<option value="${st}"${isSel}>${st}</option>`;
                    });
                    seedSelect.innerHTML = seedOpts;
                }
                
                this.filterYearlyAllocationsTable();
            }
        } catch (err) {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">Failed to load allocation data.</td></tr>';
            }
        }
    },
    
    renderYearlyAllocationsTable(data, activeSeedFilter = '') {
        var tbody = document.getElementById('yearly-allocations-tbody');
        var farmersCountEl = document.getElementById('stat-year-farmers');
        var seedsCountEl = document.getElementById('stat-year-seeds');
        var equipCountEl = document.getElementById('stat-year-equip');
        
        if (!tbody) return;
        
        var filterLower = (activeSeedFilter || '').toLowerCase().trim();
        var hideSeedsColumn = false;
        var hideEquipColumn = false;

        var checkItemMatch = function(it, fLower) {
            if (!fLower) return true;
            if (fLower === 'equipment' || fLower === 'all equipment') {
                return it.item_type === 'equipment' || !!it.equip_name || !!it.equip_category;
            }
            if (fLower === 'seeds' || fLower === 'all seeds') {
                return it.item_type === 'seed' || !!it.seed_crop_type || !!it.seed_variety;
            }
            var cType = (it.seed_crop_type || '').toLowerCase();
            var cVar = (it.seed_variety || '').toLowerCase();
            var eName = (it.equip_name || '').toLowerCase();
            var eCat = (it.equip_category || '').toLowerCase();
            var fullSeed = cVar ? (cType + ' (' + cVar + ')') : cType;
            var searchStr = (cType + ' ' + cVar + ' ' + fullSeed + ' ' + eName + ' ' + eCat).toLowerCase();
            
            if (searchStr.includes(fLower)) return true;
            var words = fLower.replace(/[^a-z0-9\s]/gi, '').split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                var cleanSearch = searchStr.replace(/[^a-z0-9\s]/gi, '');
                return words.every(function(w) { return cleanSearch.includes(w); });
            }
            return false;
        };

        if (filterLower) {
            if (filterLower === 'equipment' || filterLower === 'all equipment') {
                hideSeedsColumn = true;
                hideEquipColumn = false;
            } else if (filterLower === 'seeds' || filterLower === 'all seeds') {
                hideSeedsColumn = false;
                hideEquipColumn = true;
            } else {
                var isMatchSeed = false;
                var isMatchEquip = false;
                (this.yearlyAllocationsData || []).forEach(function(d) {
                    if (d.items && Array.isArray(d.items)) {
                        d.items.forEach(function(it) {
                            var cType = (it.seed_crop_type || '').toLowerCase();
                            var eName = (it.equip_name || '').toLowerCase();
                            var eCat = (it.equip_category || '').toLowerCase();
                            if (cType && cType.includes(filterLower)) isMatchSeed = true;
                            if ((eName && eName.includes(filterLower)) || (eCat && eCat.includes(filterLower))) isMatchEquip = true;
                            if (it.item_type === 'equipment' && checkItemMatch(it, filterLower)) isMatchEquip = true;
                            if (it.item_type === 'seed' && checkItemMatch(it, filterLower)) isMatchSeed = true;
                        });
                    }
                });

                if (isMatchEquip && !isMatchSeed) {
                    hideSeedsColumn = true;
                } else if (isMatchSeed && !isMatchEquip) {
                    hideEquipColumn = true;
                }
            }
        }

        // Dynamically update Table Headers
        var table = document.getElementById('yearly-allocations-table');
        if (table) {
            var thead = table.querySelector('thead');
            if (thead) {
                thead.innerHTML = '<tr>' +
                    '<th>Farmer Name</th>' +
                    '<th>RSBSA No.</th>' +
                    '<th>Barangay</th>' +
                    '<th>Farm Size</th>' +
                    (hideSeedsColumn ? '' : '<th>Seeds Allocated</th>') +
                    (hideEquipColumn ? '' : '<th>Equipment Allocated</th>') +
                    '<th>Date Received</th>' +
                    '</tr>';
            }
        }

        var totalCols = 7 - (hideSeedsColumn ? 1 : 0) - (hideEquipColumn ? 1 : 0);

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + totalCols + '" style="text-align: center; padding: 25px; color: #666;">No farmer allocations recorded matching the selected filter.</td></tr>';
            if (farmersCountEl) farmersCountEl.textContent = '0';
            if (seedsCountEl) seedsCountEl.textContent = '0';
            if (equipCountEl) equipCountEl.textContent = '0';
            return;
        }

        var uniqueFarmers = new Set();
        var seedCount = 0;
        var equipCount = 0;

        var html = data.map(function(dist) {
            if (dist.farmer_id) uniqueFarmers.add(dist.farmer_id);
            
            var seedsText = dist.seeds_summary || '-';
            var equipText = dist.equip_summary || '-';
            
            if (dist.items && Array.isArray(dist.items)) {
                dist.items.forEach(function(it) {
                    var isMatch = checkItemMatch(it, filterLower);

                    if (isMatch) {
                        if (it.item_type === 'seed' || it.seed_crop_type) {
                            seedCount += (parseFloat(it.quantity) || 0);
                        } else {
                            equipCount += (parseFloat(it.quantity) || 0);
                        }
                    }
                });
            }

            var formattedDate = dist.distribution_date ? new Date(dist.distribution_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

            var farmSizeDisplay = '-';
            var fSizeVal = parseFloat(dist.farm_size || dist.calculated_farm_size || 0);
            if (fSizeVal > 0) {
                var unitStr = (dist.farm_size_unit || 'ha').toLowerCase();
                if (unitStr === 'hectares' || unitStr === 'hectare') unitStr = 'ha';
                farmSizeDisplay = fSizeVal.toFixed(2).replace(/\.00$/, '') + ' ' + unitStr;
            }

            return `
                <tr>
                    <td><strong>${dist.farmer_name || 'N/A'}</strong></td>
                    <td>${dist.rsbsa_number || '-'}</td>
                    <td>${dist.barangay || '-'}</td>
                    <td><span style="font-weight: 600; color: #1e293b;">${farmSizeDisplay}</span></td>
                    ${hideSeedsColumn ? '' : `<td><span style="color: #166534; font-weight: 500;">${seedsText}</span></td>`}
                    ${hideEquipColumn ? '' : `<td><span style="color: #d97706; font-weight: 500;">${equipText}</span></td>`}
                    <td>${formattedDate}</td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
        
        if (farmersCountEl) farmersCountEl.textContent = uniqueFarmers.size.toString();
        if (seedsCountEl) seedsCountEl.textContent = Math.round(seedCount).toString();
        if (equipCountEl) equipCountEl.textContent = Math.round(equipCount).toString();
    },
    
    filterYearlyAllocationsTable() {
        var searchInput = document.getElementById('allocation-search-input');
        var seedSelect = document.getElementById('allocation-seed-select');
        
        var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        var seedFilter = seedSelect ? seedSelect.value.toLowerCase().trim() : '';

        var checkItemMatch = function(it, fLower) {
            if (!fLower) return true;
            if (fLower === 'equipment' || fLower === 'all equipment') {
                return it.item_type === 'equipment' || !!it.equip_name || !!it.equip_category;
            }
            if (fLower === 'seeds' || fLower === 'all seeds') {
                return it.item_type === 'seed' || !!it.seed_crop_type || !!it.seed_variety;
            }
            var cType = (it.seed_crop_type || '').toLowerCase();
            var cVar = (it.seed_variety || '').toLowerCase();
            var eName = (it.equip_name || '').toLowerCase();
            var eCat = (it.equip_category || '').toLowerCase();
            var fullSeed = cVar ? (cType + ' (' + cVar + ')') : cType;
            var searchStr = (cType + ' ' + cVar + ' ' + fullSeed + ' ' + eName + ' ' + eCat).toLowerCase();
            
            if (searchStr.includes(fLower)) return true;
            var words = fLower.replace(/[^a-z0-9\s]/gi, '').split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                var cleanSearch = searchStr.replace(/[^a-z0-9\s]/gi, '');
                return words.every(function(w) { return cleanSearch.includes(w); });
            }
            return false;
        };
        
        var filtered = (this.yearlyAllocationsData || []).filter(function(d) {
            var name = (d.farmer_name || '').toLowerCase();
            var rsbsa = (d.rsbsa_number || '').toLowerCase();
            var barangay = (d.barangay || '').toLowerCase();
            var seeds = (d.seeds_summary || '').toLowerCase();
            var equip = (d.equip_summary || '').toLowerCase();
            
            var matchesQuery = !query || name.includes(query) || rsbsa.includes(query) || barangay.includes(query) || seeds.includes(query) || equip.includes(query);
            
            var matchesSeed = !seedFilter;
            if (!matchesSeed) {
                if (seedFilter === 'equipment' || seedFilter === 'all equipment') {
                    matchesSeed = (equip && equip !== '-' && equip.trim().length > 0) || 
                                  (d.items && Array.isArray(d.items) && d.items.some(function(it) { return it.item_type === 'equipment' || !!it.equip_name; }));
                } else if (seedFilter === 'seeds' || seedFilter === 'all seeds') {
                    matchesSeed = (seeds && seeds !== '-' && seeds.trim().length > 0) || 
                                  (d.items && Array.isArray(d.items) && d.items.some(function(it) { return it.item_type === 'seed' || !!it.seed_crop_type; }));
                } else if (seeds.includes(seedFilter) || equip.includes(seedFilter)) {
                    matchesSeed = true;
                } else if (d.items && Array.isArray(d.items)) {
                    matchesSeed = d.items.some(function(it) {
                        return checkItemMatch(it, seedFilter);
                    });
                }
            }
            
            return matchesQuery && matchesSeed;
        });
        
        this.renderYearlyAllocationsTable(filtered, seedFilter);
    },
    
    exportYearlyAllocations() {
        var searchInput = document.getElementById('allocation-search-input');
        var seedSelect = document.getElementById('allocation-seed-select');
        var yearSelect = document.getElementById('allocation-year-select');

        var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        var seedFilter = seedSelect ? seedSelect.value.toLowerCase().trim() : '';
        var selectedYear = yearSelect ? yearSelect.value : 'all';

        var checkItemMatch = function(it, fLower) {
            if (!fLower) return true;
            if (fLower === 'equipment' || fLower === 'all equipment') {
                return it.item_type === 'equipment' || !!it.equip_name || !!it.equip_category;
            }
            if (fLower === 'seeds' || fLower === 'all seeds') {
                return it.item_type === 'seed' || !!it.seed_crop_type || !!it.seed_variety;
            }
            var cType = (it.seed_crop_type || '').toLowerCase();
            var cVar = (it.seed_variety || '').toLowerCase();
            var eName = (it.equip_name || '').toLowerCase();
            var eCat = (it.equip_category || '').toLowerCase();
            var fullSeed = cVar ? (cType + ' (' + cVar + ')') : cType;
            var searchStr = (cType + ' ' + cVar + ' ' + fullSeed + ' ' + eName + ' ' + eCat).toLowerCase();
            
            if (searchStr.includes(fLower)) return true;
            var words = fLower.replace(/[^a-z0-9\s]/gi, '').split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                var cleanSearch = searchStr.replace(/[^a-z0-9\s]/gi, '');
                return words.every(function(w) { return cleanSearch.includes(w); });
            }
            return false;
        };

        var exportData = (this.yearlyAllocationsData || []).filter(function(d) {
            var name = (d.farmer_name || '').toLowerCase();
            var rsbsa = (d.rsbsa_number || '').toLowerCase();
            var barangay = (d.barangay || '').toLowerCase();
            var seeds = (d.seeds_summary || '').toLowerCase();
            var equip = (d.equip_summary || '').toLowerCase();
            
            var matchesQuery = !query || name.includes(query) || rsbsa.includes(query) || barangay.includes(query) || seeds.includes(query) || equip.includes(query);
            
            var matchesSeed = !seedFilter;
            if (!matchesSeed) {
                if (seedFilter === 'equipment' || seedFilter === 'all equipment') {
                    matchesSeed = (equip && equip !== '-' && equip.trim().length > 0) || 
                                  (d.items && Array.isArray(d.items) && d.items.some(function(it) { return it.item_type === 'equipment' || !!it.equip_name; }));
                } else if (seedFilter === 'seeds' || seedFilter === 'all seeds') {
                    matchesSeed = (seeds && seeds !== '-' && seeds.trim().length > 0) || 
                                  (d.items && Array.isArray(d.items) && d.items.some(function(it) { return it.item_type === 'seed' || !!it.seed_crop_type; }));
                } else if (seeds.includes(seedFilter) || equip.includes(seedFilter)) {
                    matchesSeed = true;
                } else if (d.items && Array.isArray(d.items)) {
                    matchesSeed = d.items.some(function(it) {
                        return checkItemMatch(it, seedFilter);
                    });
                }
            }
            return matchesQuery && matchesSeed;
        });

        if (!exportData || exportData.length === 0) {
            Utils.showToast('warning', 'Notice', 'No allocation data available matching current filter to export.');
            return;
        }

        var hideSeedsColumn = false;
        var hideEquipColumn = false;
        if (seedFilter) {
            if (seedFilter === 'equipment' || seedFilter === 'all equipment') {
                hideSeedsColumn = true;
                hideEquipColumn = false;
            } else if (seedFilter === 'seeds' || seedFilter === 'all seeds') {
                hideSeedsColumn = false;
                hideEquipColumn = true;
            } else {
                var isMatchSeed = false;
                var isMatchEquip = false;
                (this.yearlyAllocationsData || []).forEach(function(d) {
                    if (d.items && Array.isArray(d.items)) {
                        d.items.forEach(function(it) {
                            var cType = (it.seed_crop_type || '').toLowerCase();
                            var eName = (it.equip_name || '').toLowerCase();
                            var eCat = (it.equip_category || '').toLowerCase();
                            if (cType && cType.includes(seedFilter)) isMatchSeed = true;
                            if ((eName && eName.includes(seedFilter)) || (eCat && eCat.includes(seedFilter))) isMatchEquip = true;
                            if (it.item_type === 'equipment' && checkItemMatch(it, seedFilter)) isMatchEquip = true;
                            if (it.item_type === 'seed' && checkItemMatch(it, seedFilter)) isMatchSeed = true;
                        });
                    }
                });
                hideSeedsColumn = isMatchEquip && !isMatchSeed;
                hideEquipColumn = isMatchSeed && !isMatchEquip;
            }
        }

        var headerRow = ['Farmer Name', 'RSBSA Number', 'Barangay', 'Farm Size'];
        if (!hideSeedsColumn) headerRow.push('Seeds Allocated');
        if (!hideEquipColumn) headerRow.push('Equipment Allocated');
        headerRow.push('Distribution Date');
        var csv = headerRow.join(',') + '\n';
        
        exportData.forEach(function(d) {
            var fSizeVal = parseFloat(d.farm_size || d.calculated_farm_size || 0);
            var farmSizeCsv = fSizeVal > 0 ? (fSizeVal.toFixed(2).replace(/\.00$/, '') + ' ha') : '';

            var row = [
                '"' + (d.farmer_name || '') + '"',
                '"' + (d.rsbsa_number || '') + '"',
                '"' + (d.barangay || '') + '"',
                '"' + farmSizeCsv + '"'
            ];
            if (!hideSeedsColumn) row.push('"' + (d.seeds_summary || '').replace(/"/g, '""') + '"');
            if (!hideEquipColumn) row.push('"' + (d.equip_summary || '').replace(/"/g, '""') + '"');
            row.push('"' + (d.distribution_date || '') + '"');

            csv += row.join(',') + '\n';
        });
        
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.setAttribute('href', url);
        var filterFileName = seedSelect && seedSelect.value ? '_' + seedSelect.value.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
        link.setAttribute('download', 'farmer_allocations_' + selectedYear + filterFileName + '.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Utils.showToast('success', 'Success', 'Farmer allocations exported to CSV');
    },

    // User Management & Access Tracking Functions
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    usersData: [],
    filteredUsersData: [],
    loginLogsData: [],
    filteredLogsData: [],
    userStatsData: {},
    activeUserSubtab: 'users-list',

    switchUserSubtab(subtab) {
        this.activeUserSubtab = subtab;
        const btnUsers = document.getElementById('btn-subtab-users');
        const btnHistory = document.getElementById('btn-subtab-history');
        const panelUsers = document.getElementById('user-subpanel-users-list');
        const panelHistory = document.getElementById('user-subpanel-login-history');

        if (btnUsers) btnUsers.classList.toggle('active', subtab === 'users-list');
        if (btnHistory) btnHistory.classList.toggle('active', subtab === 'login-history');
        if (panelUsers) panelUsers.style.display = subtab === 'users-list' ? 'block' : 'none';
        if (panelHistory) panelHistory.style.display = subtab === 'login-history' ? 'block' : 'none';

        if (subtab === 'users-list') {
            this.loadUsersList();
        } else {
            this.loadLoginLogs();
        }
    },

    async loadUserStats() {
        try {
            const res = await API.getUserStats();
            if (res && res.data) {
                this.userStatsData = res.data;
                const tu = document.getElementById('stat-total-users');
                const au = document.getElementById('stat-active-users');
                const uu = document.getElementById('stat-unused-users');
                const lu = document.getElementById('stat-today-logins');
                const ad = document.getElementById('stat-admin-users');
                if (tu) tu.textContent = res.data.total_users || 0;
                if (au) au.textContent = res.data.active_users || 0;
                if (uu) uu.textContent = res.data.unused_count || 0;
                if (lu) lu.textContent = res.data.today_logins || 0;
                if (ad) ad.textContent = res.data.admin_count || 0;
            }
        } catch (e) {
            console.error('Failed to load user stats:', e);
        }
    },

    async loadUsersList() {
        const tbody = document.getElementById('users-management-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">Loading user accounts...</td></tr>';
        }
        try {
            const res = await API.getUsers();
            this.usersData = res.data || [];
            this.filterUsersTable();
        } catch (e) {
            console.error('Failed to load users:', e);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #ef4444;">Error loading users: ${e.message}</td></tr>`;
            }
        }
    },

    filterUsersTable() {
        const searchInput = document.getElementById('user-search-input');
        const roleFilter = document.getElementById('user-role-filter');
        const statusFilter = document.getElementById('user-status-filter');
        
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const role = roleFilter ? roleFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';

        this.filteredUsersData = this.usersData.filter(u => {
            const matchQuery = !query || 
                (u.full_name && u.full_name.toLowerCase().includes(query)) ||
                (u.username && u.username.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query));
            const matchRole = !role || u.role === role;
            const isUnused = (!u.last_login || u.last_login === '0000-00-00 00:00:00' || u.is_unused);
            const matchStatus = !status || (status === 'unused' ? isUnused : (u.status || 'active') === status);
            return matchQuery && matchRole && matchStatus;
        });

        this.renderUsersTable(this.filteredUsersData);
    },

    renderUsersTable(users) {
        const tbody = document.getElementById('users-management-tbody');
        if (!tbody) return;

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
                        <div style="font-size: 28px; margin-bottom: 6px;">👥</div>
                        <div style="font-weight: 500;">No user accounts found matching your filters</div>
                    </td>
                </tr>
            `;
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const canManage = currentUser.role === 'admin' || currentUser.role === 'staff';
        const isAdmin = currentUser.role === 'admin';

        tbody.innerHTML = users.map(u => {
            const initial = (u.full_name || u.username || 'U').charAt(0).toUpperCase();
            const roleClass = u.role || 'staff';
            const statusClass = (u.status || 'active') === 'active' ? 'active' : 'inactive';
            const statusLabel = statusClass === 'active' ? 'Active' : 'Inactive';
            const isSelf = currentUser.id === u.id;
            const isUnused = !u.last_login || u.last_login === '0000-00-00 00:00:00' || u.is_unused;
            const isTargetAdmin = u.role === 'admin';
            
            const lastLoginFormatted = isUnused ? 
                '<span style="display: inline-flex; align-items: center; gap: 4px; color: #e11d48; font-weight: 500; font-size: 12px; background: #fff1f2; padding: 2px 8px; border-radius: 6px; border: 1px solid #fecdd3;"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Never logged in</span>' : 
                (u.last_login || '-');
            const createdFormatted = u.created_at ? (Utils.formatDate ? Utils.formatDate(u.created_at) : u.created_at) : '-';

            // Allow delete if admin OR if current user is staff and target is unused/non-admin (and not self)
            const canDeleteThisUser = !isSelf && (isAdmin || isUnused || !isTargetAdmin);
            // Allow editing/password reset if admin or target is non-admin or self
            const canEditThisUser = isAdmin || isSelf || !isTargetAdmin;

            const avatarHtml = u.avatar ?
                `<div class="user-cell-avatar" style="overflow: hidden; padding: 0;"><img src="${u.avatar}" class="user-cell-avatar-img" alt="${this.escapeHtml(u.username)}"></div>` :
                `<div class="user-cell-avatar ${roleClass}">${initial}</div>`;

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            ${avatarHtml}
                            <div class="user-cell-info">
                                <span class="user-cell-name">
                                    ${this.escapeHtml(u.full_name || u.username)}
                                    ${isSelf ? '<span style="font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 1px 6px; border-radius: 10px; margin-left: 4px;">You</span>' : ''}
                                    ${isUnused ? '<span style="font-size: 10.5px; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; padding: 1px 5px; border-radius: 4px; margin-left: 4px; font-weight: 600;">Unused</span>' : ''}
                                </span>
                                <span class="user-cell-username">@${this.escapeHtml(u.username)}</span>
                                <div class="user-cell-email" style="font-size: 11.5px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 4px;" title="Email: ${this.escapeHtml(u.email || 'No email registered')}">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11" style="color: #94a3b8; flex-shrink: 0;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                                    <span>${this.escapeHtml(u.email || 'No email registered')}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="role-badge ${roleClass}">${u.role || 'Staff'}</span>
                    </td>
                    <td>
                        <span class="status-pill ${statusClass}">${statusLabel}</span>
                    </td>
                    <td style="font-size: 13px; color: #475569;">
                        ${lastLoginFormatted}
                    </td>
                    <td style="font-size: 13px; color: #64748b;">
                        ${createdFormatted}
                    </td>
                    <td>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${canManage ? `
                                ${canEditThisUser ? `
                                    <button class="action-icon-btn btn-edit" title="Edit User" onclick="Pages.showEditUserModal(${u.id})">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                    </button>
                                    <button class="action-icon-btn btn-pwd" title="Reset Password" onclick="Pages.showResetUserPasswordModal(${u.id}, '${this.escapeHtml(u.username)}')">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                                    </button>
                                ` : ''}
                                ${u.role === 'admin' ? `
                                    ${!isSelf ? `
                                        <button class="action-icon-btn btn-remove-admin" title="Remove Admin Access (Demote to Staff)" onclick="Pages.toggleAdminStatus(${u.id}, '${this.escapeHtml(u.username)}', false)">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm7 11H5V6.3l7-3.11v8.81z"/></svg>
                                        </button>
                                    ` : `
                                        <span title="Your Admin Account" style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; background: #ede9fe; color: #7c3aed; font-size: 13px;">👑</span>
                                    `}
                                ` : `
                                    <button class="action-icon-btn btn-make-admin" title="Make Admin (Grant Administrator Privileges)" onclick="Pages.toggleAdminStatus(${u.id}, '${this.escapeHtml(u.username)}', true)">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                                    </button>
                                `}
                                ${!isSelf && (isAdmin || !isTargetAdmin) ? `
                                    <button class="action-icon-btn btn-toggle" title="${statusClass === 'active' ? 'Deactivate User' : 'Activate User'}" onclick="Pages.toggleUserStatus(${u.id}, '${statusClass}')">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6z"/></svg>
                                    </button>
                                ` : ''}
                                ${canDeleteThisUser ? `
                                    <button class="action-icon-btn btn-delete" title="${isUnused ? 'Delete Unused Account' : 'Delete User'}" onclick="Pages.deleteUser(${u.id}, '${this.escapeHtml(u.username)}', ${isUnused ? 'true' : 'false'})">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                    </button>
                                ` : ''}
                            ` : `
                                <span style="font-size: 12px; color: #94a3b8;">View Only</span>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async loadLoginLogs() {
        const tbody = document.getElementById('login-history-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">Loading activity logs...</td></tr>';
        }
        try {
            const res = await API.getLoginLogs({ limit: 100 });
            this.loginLogsData = res.data || [];
            this.filterLoginLogsTable();
        } catch (e) {
            console.error('Failed to load login logs:', e);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #ef4444;">Error loading logs: ${e.message}</td></tr>`;
            }
        }
    },

    filterLoginLogsTable() {
        const searchInput = document.getElementById('login-log-search');
        const statusFilter = document.getElementById('login-status-filter');
        
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const status = statusFilter ? statusFilter.value : '';

        this.filteredLogsData = this.loginLogsData.filter(l => {
            const matchQuery = !query || 
                (l.username && l.username.toLowerCase().includes(query)) ||
                (l.full_name && l.full_name.toLowerCase().includes(query)) ||
                (l.ip_address && l.ip_address.toLowerCase().includes(query));
            const matchStatus = !status || l.status === status;
            return matchQuery && matchStatus;
        });

        this.renderLoginLogsTable(this.filteredLogsData);
    },

    renderLoginLogsTable(logs) {
        const tbody = document.getElementById('login-history-tbody');
        if (!tbody) return;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
                        <div style="font-size: 28px; margin-bottom: 6px;">📋</div>
                        <div style="font-weight: 500;">No login activity records found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            const isSuccess = l.status === 'success';
            const statusBadge = isSuccess ? 
                '<span class="login-status-badge success"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Successful</span>' : 
                `<span class="login-status-badge failed" title="${this.escapeHtml(l.failure_reason || 'Failed')}"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Failed</span>`;
            
            const uaSummary = l.user_agent ? (l.user_agent.includes('Windows') ? 'Windows' : (l.user_agent.includes('Mac') ? 'MacOS' : (l.user_agent.includes('Android') ? 'Android' : (l.user_agent.includes('iPhone') ? 'iOS' : 'Web Client')))) : 'Web Browser';

            return `
                <tr>
                    <td style="font-size: 13px; font-weight: 500; color: #1e293b; white-space: nowrap;">
                        ${l.login_time || '-'}
                    </td>
                    <td>
                        <div style="font-weight: 600; color: #0f172a; font-size: 13.5px;">${this.escapeHtml(l.full_name || l.username)}</div>
                        <div style="font-size: 12px; color: #64748b;">@${this.escapeHtml(l.username)}</div>
                    </td>
                    <td>
                        <span class="role-badge ${l.role || 'staff'}">${l.role || 'User'}</span>
                    </td>
                    <td style="font-family: monospace; font-size: 12px; color: #475569;">
                        ${this.escapeHtml(l.ip_address || '127.0.0.1')}
                    </td>
                    <td style="font-size: 12.5px; color: #64748b;" title="${this.escapeHtml(l.user_agent || '')}">
                        ${uaSummary}
                    </td>
                    <td>
                        ${statusBadge}
                        ${l.failure_reason ? `<div style="font-size: 11px; color: #dc2626; margin-top: 2px;">${this.escapeHtml(l.failure_reason)}</div>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },

    showAddUserModal() {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const canCreate = currentUser.role === 'admin' || currentUser.role === 'staff';
        if (!canCreate) {
            Utils.showToast('warning', 'Permission Denied', 'You do not have permission to create user accounts');
            return;
        }

        document.getElementById('modal-title').textContent = 'Add New User Account';
        document.getElementById('modal-body').innerHTML = `
            <form id="add-user-modal-form" class="app-form" onsubmit="event.preventDefault(); Pages.submitAddUser();">
                <div class="form-group">
                    <label style="font-weight: 600;">Full Name <span style="color: #ef4444;">*</span></label>
                    <input type="text" class="form-control" id="new-user-fullname" placeholder="e.g. Maria Santos" required autocomplete="off">
                </div>
                <div class="form-group">
                    <label style="font-weight: 600;">Email Address <span style="color: #ef4444;">*</span></label>
                    <input type="email" class="form-control" id="new-user-email" placeholder="e.g. maria.santos@agri.gov.ph" required autocomplete="email">
                    <small style="color: #64748b; font-size: 12px;">Used for login identification and official system communications.</small>
                </div>
                <div class="form-group">
                    <label style="font-weight: 600;">Username <span style="color: #ef4444;">*</span></label>
                    <input type="text" class="form-control" id="new-user-username" placeholder="e.g. msantos" required autocomplete="off">
                    <small style="color: #64748b; font-size: 12px;">Used by the user to log into the distribution system.</small>
                </div>
                <div class="form-group">
                    <label style="font-weight: 600;">Password <span style="color: #ef4444;">*</span></label>
                    <input type="password" class="form-control" id="new-user-password" placeholder="Minimum 6 characters" required autocomplete="new-password">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div class="form-group">
                        <label style="font-weight: 600;">System Role <span style="color: #ef4444;">*</span></label>
                        <select class="form-control" id="new-user-role">
                            <option value="staff" selected>Agricultural Staff</option>
                            <option value="farmer">Farmer Representative</option>
                        </select>
                        <small style="color: #64748b; font-size: 11.5px; display: block; margin-top: 4px;">To grant Admin access, click "Make Admin" on their row after creation.</small>
                    </div>
                    <div class="form-group">
                        <label style="font-weight: 600;">Account Status</label>
                        <select class="form-control" id="new-user-status">
                            <option value="active" selected>Active (Can login)</option>
                            <option value="inactive">Inactive (Deactivated)</option>
                        </select>
                    </div>
                </div>
            </form>
        `;
        document.getElementById('modal-footer').innerHTML = `
            <button type="button" class="btn btn-secondary-outline" onclick="App.closeModal()">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="Pages.submitAddUser()">Create User</button>
        `;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    async submitAddUser() {
        const fullName = (document.getElementById('new-user-fullname')?.value || '').trim();
        const email = (document.getElementById('new-user-email')?.value || '').trim();
        const username = (document.getElementById('new-user-username')?.value || '').trim();
        const password = (document.getElementById('new-user-password')?.value || '').trim();
        const role = document.getElementById('new-user-role')?.value || 'staff';
        const status = document.getElementById('new-user-status')?.value || 'active';

        if (!fullName || !email || !username || !password) {
            Utils.showToast('error', 'Validation Error', 'Please fill in all required fields (including email)');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Utils.showToast('error', 'Validation Error', 'Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            Utils.showToast('error', 'Validation Error', 'Password must be at least 6 characters');
            return;
        }

        try {
            await API.createUser({
                full_name: fullName,
                email: email,
                username: username,
                password: password,
                role: role,
                status: status
            });

            Utils.showToast('success', 'User Created', `Account for ${fullName} (@${username}) created successfully`);
            App.closeModal();
            this.loadUserStats();
            this.loadUsersList();
        } catch (e) {
            Utils.showToast('error', 'Failed to Create User', e.message);
        }
    },

    async showEditUserModal(userId) {
        let user = this.usersData.find(u => u.id === userId);
        if (!user) {
            try {
                const res = await API.getUser(userId);
                user = res.data;
            } catch (e) {
                Utils.showToast('error', 'Error', 'Failed to find user');
                return;
            }
        }

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isSelf = currentUser.id === user.id;

        const isAdmin = currentUser.role === 'admin';

        document.getElementById('modal-title').textContent = `Edit User: ${user.username}`;
        document.getElementById('modal-body').innerHTML = `
            <form id="edit-user-modal-form" class="app-form" onsubmit="event.preventDefault(); Pages.submitEditUser(${user.id});">
                <div class="form-group">
                    <label style="font-weight: 600;">Full Name <span style="color: #ef4444;">*</span></label>
                    <input type="text" class="form-control" id="edit-user-fullname" value="${this.escapeHtml(user.full_name || '')}" required>
                </div>
                <div class="form-group">
                    <label style="font-weight: 600;">Email Address</label>
                    <input type="email" class="form-control" id="edit-user-email" value="${this.escapeHtml(user.email || '')}" placeholder="e.g. maria.santos@agri.gov.ph" autocomplete="email">
                </div>
                <div class="form-group">
                    <label style="font-weight: 600;">Username <span style="color: #ef4444;">*</span></label>
                    <input type="text" class="form-control" id="edit-user-username" value="${this.escapeHtml(user.username || '')}" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div class="form-group">
                        <label style="font-weight: 600;">System Role</label>
                        <select class="form-control" id="edit-user-role" ${user.role === 'admin' ? 'disabled title="Use the Make/Remove Admin button on the user list to adjust admin status"' : ''}>
                            <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Agricultural Staff</option>
                            <option value="farmer" ${user.role === 'farmer' ? 'selected' : ''}>Farmer Representative</option>
                            ${user.role === 'admin' ? '<option value="admin" selected>System Administrator</option>' : ''}
                        </select>
                        <small style="color: #64748b; font-size: 11.5px; display: block; margin-top: 4px;">To grant or remove Admin privileges, use the 'Make Admin' action button.</small>
                    </div>
                    <div class="form-group">
                        <label style="font-weight: 600;">Account Status</label>
                        <select class="form-control" id="edit-user-status" ${isSelf ? 'disabled title="You cannot deactivate your own account"' : ''}>
                            <option value="active" ${(user.status || 'active') === 'active' ? 'selected' : ''}>Active (Can login)</option>
                            <option value="inactive" ${(user.status || 'active') === 'inactive' ? 'selected' : ''}>Inactive (Deactivated)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                    <label style="font-weight: 600;">Optional New Password</label>
                    <input type="password" class="form-control" id="edit-user-password" placeholder="Leave blank to keep existing password" autocomplete="new-password">
                    <small style="color: #64748b; font-size: 12px;">Only fill this if you want to change this user's password now.</small>
                </div>
            </form>
        `;
        document.getElementById('modal-footer').innerHTML = `
            <button type="button" class="btn btn-secondary-outline" onclick="App.closeModal()">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="Pages.submitEditUser(${user.id})">Save Changes</button>
        `;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    async submitEditUser(userId) {
        const fullName = (document.getElementById('edit-user-fullname')?.value || '').trim();
        const email = (document.getElementById('edit-user-email')?.value || '').trim();
        const username = (document.getElementById('edit-user-username')?.value || '').trim();
        const role = document.getElementById('edit-user-role')?.value;
        const status = document.getElementById('edit-user-status')?.value;
        const password = (document.getElementById('edit-user-password')?.value || '').trim();

        if (!fullName || !username) {
            Utils.showToast('error', 'Validation Error', 'Full Name and Username are required');
            return;
        }

        const updateData = { full_name: fullName, username: username };
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Utils.showToast('error', 'Validation Error', 'Please enter a valid email address');
                return;
            }
            updateData.email = email;
        } else {
            updateData.email = '';
        }

        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (password) {
            if (password.length < 6) {
                Utils.showToast('error', 'Validation Error', 'Password must be at least 6 characters');
                return;
            }
            updateData.password = password;
        }

        try {
            await API.updateUser(userId, updateData);
            Utils.showToast('success', 'User Updated', 'User account updated successfully');
            App.closeModal();
            this.loadUserStats();
            this.loadUsersList();
        } catch (e) {
            Utils.showToast('error', 'Update Failed', e.message);
        }
    },

    showResetUserPasswordModal(userId, username) {
        document.getElementById('modal-title').textContent = `Reset Password for @${this.escapeHtml(username)}`;
        document.getElementById('modal-body').innerHTML = `
            <form id="reset-user-password-form" class="app-form" onsubmit="event.preventDefault(); Pages.submitResetUserPassword(${userId});">
                <div class="form-group">
                    <label style="font-weight: 600;">New Password <span style="color: #ef4444;">*</span></label>
                    <input type="password" class="form-control" id="reset-pwd-new" placeholder="At least 6 characters" required autocomplete="new-password">
                </div>
                <div class="form-group">
                    <label style="font-weight: 600;">Confirm New Password <span style="color: #ef4444;">*</span></label>
                    <input type="password" class="form-control" id="reset-pwd-confirm" placeholder="Re-type new password" required autocomplete="new-password">
                </div>
            </form>
        `;
        document.getElementById('modal-footer').innerHTML = `
            <button type="button" class="btn btn-secondary-outline" onclick="App.closeModal()">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="Pages.submitResetUserPassword(${userId})">Reset Password</button>
        `;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    async submitResetUserPassword(userId) {
        const newPass = document.getElementById('reset-pwd-new')?.value || '';
        const confirmPass = document.getElementById('reset-pwd-confirm')?.value || '';

        if (!newPass || !confirmPass) {
            Utils.showToast('error', 'Validation Error', 'Both password fields are required');
            return;
        }

        if (newPass !== confirmPass) {
            Utils.showToast('error', 'Validation Error', 'Passwords do not match');
            return;
        }

        if (newPass.length < 6) {
            Utils.showToast('error', 'Validation Error', 'Password must be at least 6 characters');
            return;
        }

        try {
            await API.changePassword(userId, newPass);
            Utils.showToast('success', 'Success', 'Password has been reset successfully');
            App.closeModal();
        } catch (e) {
            Utils.showToast('error', 'Error', e.message);
        }
    },

    async toggleUserStatus(userId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const actionName = newStatus === 'active' ? 'activate' : 'deactivate';
        
        if (!confirm(`Are you sure you want to ${actionName} this user account?`)) {
            return;
        }

        try {
            await API.toggleUserStatus(userId, newStatus);
            Utils.showToast('success', 'Status Updated', `User account is now ${newStatus}`);
            this.loadUserStats();
            this.loadUsersList();
        } catch (e) {
            Utils.showToast('error', 'Status Update Failed', e.message);
        }
    },

    async deleteUser(userId, username, isUnused = false) {
        const msg = isUnused ? 
            `Are you sure you want to permanently delete unused account '@${username}'? This action cannot be undone.` : 
            `Are you sure you want to permanently delete user account '@${username}'? This action cannot be undone.`;

        if (!confirm(msg)) {
            return;
        }

        try {
            await API.deleteUser(userId);
            Utils.showToast('success', 'User Deleted', `User account '@${username}' was deleted successfully`);
            this.loadUserStats();
            this.loadUsersList();
        } catch (e) {
            Utils.showToast('error', 'Delete Failed', e.message || 'Failed to delete user');
        }
    },

    deleteUnusedUsersPrompt() {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const canManage = currentUser.role === 'admin' || currentUser.role === 'staff';
        if (!canManage) {
            Utils.showToast('warning', 'Permission Denied', 'You do not have permission to delete user accounts');
            return;
        }

        const unusedUsers = this.usersData.filter(u => (!u.last_login || u.last_login === '0000-00-00 00:00:00' || u.is_unused) && u.id !== currentUser.id);
        const unusedCount = unusedUsers.length;

        if (unusedCount === 0) {
            Utils.showToast('info', 'No Unused Accounts', 'There are no unused user accounts to delete. All registered accounts have active login activity.');
            return;
        }

        document.getElementById('modal-title').textContent = 'Clean Up Unused Accounts';
        document.getElementById('modal-body').innerHTML = `
            <div style="text-align: center; padding: 10px 0;">
                <div style="width: 54px; height: 54px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </div>
                <h4 style="color: #0f172a; margin-bottom: 8px; font-weight: 700; font-size: 17px;">Delete Unused Accounts</h4>
                <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                    Found <strong>${unusedCount} unused account(s)</strong> that have never logged into the system.
                </p>
                <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; font-size: 13px; color: #9f1239; text-align: left; margin-bottom: 10px;">
                    <strong>Notice:</strong> This will permanently delete all accounts with zero login activity. This action cannot be reversed.
                </div>
                <div style="max-height: 130px; overflow-y: auto; text-align: left; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; background: #fafafa; font-size: 12.5px; color: #334155;">
                    <strong style="display: block; margin-bottom: 4px; color: #64748b;">Accounts to be deleted:</strong>
                    ${unusedUsers.map(u => `<div>• <strong>${this.escapeHtml(u.full_name || u.username)}</strong> (@${this.escapeHtml(u.username)}) - <span style="color: #64748b;">${u.role || 'staff'}</span></div>`).join('')}
                </div>
            </div>
        `;
        document.getElementById('modal-footer').innerHTML = `
            <button type="button" class="btn btn-secondary-outline" onclick="App.closeModal()">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirm-delete-unused-btn" onclick="Pages.confirmDeleteUnusedUsers()" style="background: #dc2626; border-color: #dc2626; color: white; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                Delete ${unusedCount} Unused Account${unusedCount > 1 ? 's' : ''}
            </button>
        `;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    async confirmDeleteUnusedUsers() {
        const btn = document.getElementById('confirm-delete-unused-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinning" style="display: inline-block;">⏳</span> Deleting accounts...';
        }
        try {
            const res = await API.deleteUnusedUsers();
            App.closeModal();
            Utils.showToast('success', 'Accounts Deleted', res.message || 'Unused accounts deleted successfully');
            this.loadUserStats();
            this.loadUsersList();
        } catch (e) {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Retry Deletion';
            }
            Utils.showToast('error', 'Deletion Failed', e.message || 'Failed to delete unused accounts');
        }
    },

    toggleAdminStatus(userId, username, makeAdmin = true) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const canManage = currentUser.role === 'admin' || currentUser.role === 'staff';
        if (!canManage) {
            Utils.showToast('warning', 'Permission Denied', 'You do not have permission to manage user roles');
            return;
        }

        const actionTitle = makeAdmin ? 'Make Admin' : 'Remove Admin Privileges';
        const actionPrompt = makeAdmin ? 
            `Are you sure you want to promote <strong>@${this.escapeHtml(username)}</strong> to <strong>System Administrator</strong>?<br><br>They will be granted full administrative control and management permissions.` : 
            `Are you sure you want to remove Administrator privileges from <strong>@${this.escapeHtml(username)}</strong> and set their role back to <strong>Agricultural Staff</strong>?`;
        const iconBg = makeAdmin ? '#ede9fe' : '#fef3c7';
        const iconColor = makeAdmin ? '#7c3aed' : '#b45309';

        document.getElementById('modal-title').textContent = actionTitle;
        document.getElementById('modal-body').innerHTML = `
            <div style="text-align: center; padding: 10px 0;">
                <div style="width: 54px; height: 54px; border-radius: 50%; background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                </div>
                <h4 style="color: #0f172a; margin-bottom: 8px; font-weight: 700; font-size: 17px;">${actionTitle}</h4>
                <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                    ${actionPrompt}
                </p>
                <div style="background: ${makeAdmin ? '#f5f3ff' : '#fffbeb'}; border: 1px solid ${makeAdmin ? '#ddd6fe' : '#fde68a'}; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: ${makeAdmin ? '#6d28d9' : '#92400e'}; text-align: left;">
                    ${makeAdmin ? '👑 <strong>Admin Role:</strong> User will gain full access to configure settings, manage users, and export logs.' : 'ℹ️ <strong>Staff Role:</strong> User will retain access to daily operations, farmer management, and distributions.'}
                </div>
            </div>
        `;
        document.getElementById('modal-footer').innerHTML = `
            <button type="button" class="btn btn-secondary-outline" onclick="App.closeModal()">Cancel</button>
            <button type="button" class="btn btn-primary" id="confirm-toggle-admin-btn" onclick="Pages.confirmToggleAdmin(${userId}, '${makeAdmin ? 'admin' : 'staff'}', '${this.escapeHtml(username)}')" style="${makeAdmin ? 'background: #7c3aed; border-color: #7c3aed;' : 'background: #d97706; border-color: #d97706;'} color: white;">
                ${makeAdmin ? '👑 Confirm Make Admin' : 'Confirm Set to Staff'}
            </button>
        `;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    async confirmToggleAdmin(userId, targetRole, username) {
        const btn = document.getElementById('confirm-toggle-admin-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Updating role...';
        }
        try {
            const res = await API.makeUserAdmin(userId, targetRole);
            App.closeModal();
            Utils.showToast('success', 'Role Updated', res.message || `User @${username} role has been updated`);
            this.loadUserStats();
            this.loadUsersList();
        } catch (e) {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Retry';
            }
            Utils.showToast('error', 'Update Failed', e.message || 'Failed to update user role');
        }
    },

    exportLoginLogs() {
        const logs = this.filteredLogsData.length > 0 ? this.filteredLogsData : this.loginLogsData;
        if (!logs || logs.length === 0) {
            Utils.showToast('warning', 'Export', 'No login log data to export');
            return;
        }

        let csv = 'Login Time,Username,Full Name,Role,IP Address,Status,Failure Reason\n';
        logs.forEach(l => {
            csv += `"${l.login_time || ''}","${l.username || ''}","${l.full_name || ''}","${l.role || ''}","${l.ip_address || ''}","${l.status || ''}","${(l.failure_reason || '').replace(/"/g, '""')}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `login_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Utils.showToast('success', 'Success', 'Login activity logs exported to CSV');
    },
    
    async saveProfile() {
        const fullName = (document.getElementById('setting-fullname')?.value || '').trim();
        const email = (document.getElementById('setting-email')?.value || '').trim();
        const saveBtn = document.getElementById('save-profile-btn');

        if (!fullName) {
            Utils.showToast('error', 'Validation Error', 'Full name cannot be empty');
            return;
        }

        if (!email) {
            Utils.showToast('error', 'Validation Error', 'Email address is required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Utils.showToast('error', 'Validation Error', 'Please enter a valid email address');
            return;
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinning" style="display:inline-block; margin-right: 6px;">↻</span> Saving...';
        }

        try {
            const res = await API.updateProfile({
                full_name: fullName,
                email: email,
                avatar: this.currentAvatarData
            });

            if (res && res.user) {
                const updatedUser = res.user;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                if (window.App) {
                    App.user = updatedUser;
                    App.updateUserInfo();
                }
                this.currentAvatarData = updatedUser.avatar || null;
                this.renderProfileAvatarPreview();
            }

            Utils.showToast('success', 'Profile Updated', 'Your profile details and photo have been updated successfully');
        } catch (e) {
            Utils.showToast('error', 'Update Failed', e.message || 'Failed to update profile');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                    Save Profile Changes
                `;
            }
        }
    },
    
    async changePassword() {
        const form = document.getElementById('password-form');
        const newPass = form.new_password.value;
        const confirmPass = form.confirm_password.value;
        
        if (newPass !== confirmPass) {
            Utils.showToast('error', 'Error', 'Passwords do not match');
            return;
        }
        
        if (newPass.length < 6) {
            Utils.showToast('error', 'Error', 'Password must be at least 6 characters');
            return;
        }
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const token = localStorage.getItem('authToken');
        
        try {
            const response = await fetch('api/auth.php?action=change_password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ user_id: user.id, new_password: newPass })
            });
            
            const raw = await response.text();
            const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
            let si = -1;
            for (let i = 0; i < clean.length; i++) {
                if (clean[i] === '{' || clean[i] === '[') { si = i; break; }
            }
            if (si === -1) throw new Error(clean.substring(0, 200) || 'Server returned no response');
            
            const data = JSON.parse(clean.substring(si));
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update password');
            }
            
            Utils.showToast('success', 'Success', 'Password updated successfully');
            form.reset();
        } catch (error) {
            console.error('Password change error:', error);
            Utils.showToast('error', 'Error', error.message || 'Failed to update password');
        }
    },
    
    async exportData() {
        try {
            Utils.showToast('info', 'Export', 'Preparing all data...');
            console.log('Starting export...');
            
            const farmers = await API.getFarmers({ limit: 1000 });
            console.log('Farmers:', farmers);
            
            const farms = await API.getFarms({ limit: 1000 });
            console.log('Farms:', farms);
            
            const distributions = await API.getDistributions({ limit: 1000 });
            console.log('Distributions:', distributions);
            
            const seeds = await API.getSeeds({ limit: 1000 });
            console.log('Seeds:', seeds);
            
            const equipment = await API.getEquipment({ limit: 1000 });
            console.log('Equipment:', equipment);
            
            let csvContent = 'DATA EXPORT\n';
            csvContent += 'Generated:, ' + new Date().toLocaleString() + '\n\n';
            
            csvContent += '=== FARMERS ===\n';
            csvContent += 'ID,RSBSA Number,Name,Contact,Barangay,Municipality,Status\n';
            (farmers.data || []).forEach(f => {
                csvContent += `${f.id},${f.rsbsa_number || ''},${f.name || ''},${f.contact || ''},${f.barangay || ''},${f.municipality || ''},${f.status || ''}\n`;
            });
            
            csvContent += '\n=== FARMS ===\n';
            csvContent += 'ID,Farmer Name,Barangay,Municipality,Farm Size,Crop Type,Status\n';
            (farms.data || []).forEach(f => {
                csvContent += `${f.id},${f.farmer_name || ''},${f.barangay || ''},${f.municipality || ''},${f.farm_size || ''},${f.crop_type || ''},${f.status || ''}\n`;
            });
            
            csvContent += '\n=== DISTRIBUTIONS ===\n';
            csvContent += 'ID,Date,Farmer,Items,Season,Status\n';
            (distributions.data || []).forEach(d => {
                csvContent += `${d.id},${d.distribution_date || ''},${d.farmer_name || ''},${d.total_items || 0},${d.season || ''},${d.status || ''}\n`;
            });
            
            csvContent += '\n=== SEEDS INVENTORY ===\n';
            csvContent += 'ID,Crop Type,Variety,Quantity,Unit,Date Added\n';
            (seeds.data || []).forEach(s => {
                csvContent += `${s.id},${s.crop_type || ''},${s.variety || ''},${s.quantity || 0},${s.unit || ''},${s.date_added || ''}\n`;
            });
            
            csvContent += '\n=== EQUIPMENT INVENTORY ===\n';
            csvContent += 'ID,Name,Category,Quantity,Unit,Date Added\n';
            (equipment.data || []).forEach(e => {
                csvContent += `${e.id},${e.name || ''},${e.category || ''},${e.quantity || 0},${e.unit || ''},${e.date_added || ''}\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'distribution_system_export_' + new Date().toISOString().split('T')[0] + '.csv';
            link.click();
            
            Utils.showToast('success', 'Export Complete', 'All data has been exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            Utils.showToast('error', 'Export Failed', 'Failed to export data');
        }
    }
};

var Reports = {
    showDistributionReport: function(filterParams) {
        document.getElementById('report-result').innerHTML = '<div class="text-center">Loading...</div>';
        API.getDistributions({ limit: 1000 }).then(function(res) {
            var data = res.data || [];
            
            if (filterParams) {
                data = this.applyDateFilter(data, filterParams);
                
                if (filterParams.item) {
                    var itemFilter = filterParams.item;
                    data = data.filter(function(d) {
                        if (!d.items || d.items.length === 0) return false;
                        return d.items.some(function(i) {
                            if (itemFilter.startsWith('seed_')) {
                                var seedType = itemFilter.replace('seed_', '').toLowerCase();
                                return (i.seed_variety || '').toLowerCase().includes(seedType) || 
                                       (i.item_type === 'seed' && (i.seed_variety || '').toLowerCase().includes(seedType));
                            } else if (itemFilter.startsWith('equip_')) {
                                var equipType = itemFilter.replace('equip_', '').toLowerCase();
                                return (i.equip_name || '').toLowerCase().includes(equipType) ||
                                       (i.equip_category || '').toLowerCase().includes(equipType) ||
                                       (i.item_type === 'equipment' && (i.equip_name || '').toLowerCase().includes(equipType));
                            }
                            return false;
                        });
                    });
                }
            }
            
            this.currentDistributionData = data;
            
            var html = '<div class="report-result" id="print-area"><h3>Distribution Report</h3>';
            html += this.getFilterSummary(filterParams);
            html += '<div style="margin-bottom: 16px;"><button class="btn btn-green" onclick="Reports.printReport()">Print</button> <button class="btn btn-green" onclick="Reports.exportReport()">Export</button></div>';
            html += '<table class="report-table"><thead><tr><th>Date</th><th>Farmer</th><th>Items</th><th>Quantity</th><th>Season</th></tr></thead><tbody>';
            if (data.length === 0) {
                html += '<tr><td colspan="5" class="text-center">No records found</td></tr>';
            } else {
                data.forEach(function(d) {
                    var itemsHtml = '';
                    var qtyHtml = '';
                    if (d.items && d.items.length > 0) {
                        var items = d.items.map(function(i) {
                            if (i.item_type === 'seed') {
                                return i.seed_variety || i.item_name;
                            } else if (i.item_type === 'equipment') {
                                return i.equip_name || i.equip_category || i.item_name;
                            }
                            return i.item_name || 'Item';
                        });
                        var quantities = d.items.map(function(i) { return i.quantity; });
                        itemsHtml = items.join(', ');
                        qtyHtml = quantities.join(', ');
                    } else {
                        itemsHtml = '-';
                        qtyHtml = d.total_items || 0;
                    }
                    html += '<tr><td>' + (d.distribution_date || '-') + '</td><td>' + (d.farmer_name || 'Farmer #' + d.farmer_id) + '</td><td>' + itemsHtml + '</td><td>' + qtyHtml + '</td><td>' + (d.season || '-') + '</td></tr>';
                });
            }
            html += '</tbody></table></div>';
            document.getElementById('report-result').innerHTML = html;
        }.bind(this));
    },
    
    showFarmerReport: function(filterParams) {
        document.getElementById('report-result').innerHTML = '<div class="text-center">Loading...</div>';
        
        var self = this;
        var itemFilter = filterParams && filterParams.item;
        
        var renderFarmerTable = function(farmers) {
            var data = farmers || [];
            var html = '<div class="report-result" id="print-area"><h3>Farmer Records Report</h3>';
            html += self.getFilterSummary(filterParams);
            html += '<div style="margin-bottom: 16px;"><button class="btn btn-green" onclick="Reports.printReport()">Print</button> <button class="btn btn-green" onclick="Reports.exportReport()">Export</button></div>';
            html += '<table class="report-table"><thead><tr><th>RSBSA Number</th><th>Farmer Name</th><th>Contact Number</th><th>Sex</th><th>Birthdate</th><th>Barangay</th><th>Municipality</th><th>Province</th><th>Farm Size</th><th>Status</th></tr></thead><tbody>';
            if (data.length === 0) {
                html += '<tr><td colspan="10" class="text-center">No records found</td></tr>';
            } else {
                data.forEach(function(f) {
                    var bdate = (f.birthdate && f.birthdate !== '0000-00-00') ? f.birthdate : '-';
                    var sizeVal = (f.total_farm_size || f.farm_size);
                    var sizeStr = sizeVal ? (sizeVal + ' ' + (f.farm_size_unit || 'ha')) : '-';
                    html += '<tr>' +
                        '<td>' + (f.rsbsa_number || '-') + '</td>' +
                        '<td>' + (f.name || '-') + '</td>' +
                        '<td>' + (f.phone || f.contact || '-') + '</td>' +
                        '<td>' + (f.sex || '-') + '</td>' +
                        '<td>' + bdate + '</td>' +
                        '<td>' + (f.barangay || '-') + '</td>' +
                        '<td>' + (f.municipality || '-') + '</td>' +
                        '<td>' + (f.province || '-') + '</td>' +
                        '<td>' + sizeStr + '</td>' +
                        '<td>' + (f.status || 'active') + '</td>' +
                    '</tr>';
                });
            }
            html += '</tbody></table></div>';
            document.getElementById('report-result').innerHTML = html;
        };
        
        if (itemFilter) {
            API.getDistributions({ limit: 1000 }).then(function(distRes) {
                var distributions = distRes.data || [];
                
                distributions = distributions.filter(function(d) {
                    if (!d.items || d.items.length === 0) return false;
                    return d.items.some(function(i) {
                        if (itemFilter.startsWith('seed_')) {
                            var seedType = itemFilter.replace('seed_', '').toLowerCase();
                            return (i.seed_variety || '').toLowerCase().includes(seedType);
                        } else if (itemFilter.startsWith('equip_')) {
                            var equipType = itemFilter.replace('equip_', '').toLowerCase();
                            return (i.equip_name || '').toLowerCase().includes(equipType) ||
                                   (i.equip_category || '').toLowerCase().includes(equipType);
                        }
                        return false;
                    });
                });
                
                var farmerIds = distributions.map(function(d) { return d.farmer_id; });
                var uniqueFarmerIds = [...new Set(farmerIds)];
                
                API.getFarmers({ limit: 1000 }).then(function(farmerRes) {
                    var data = farmerRes.data || [];
                    data = data.filter(function(f) { return uniqueFarmerIds.indexOf(f.id) !== -1; });
                    renderFarmerTable(data);
                });
            });
        } else {
            API.getFarmers({ limit: 1000 }).then(function(res) {
                renderFarmerTable(res.data || []);
            });
        }
    },
    
    showFarmReport: function(filterParams) {
        document.getElementById('report-result').innerHTML = '<div class="text-center">Loading...</div>';
        API.getFarms({ limit: 1000 }).then(function(res) {
            var data = res.data || [];
            var html = '<div class="report-result" id="print-area"><h3>Farm Details Report</h3>';
            html += this.getFilterSummary(filterParams);
            html += '<div style="margin-bottom: 16px;"><button class="btn btn-green" onclick="Reports.printReport()">Print</button> <button class="btn btn-green" onclick="Reports.exportReport()">Export</button></div>';
            html += '<table class="report-table"><thead><tr><th>Farmer</th><th>Location</th><th>Size</th><th>Crop Type</th></tr></thead><tbody>';
            if (data.length === 0) {
                html += '<tr><td colspan="4" class="text-center">No records found</td></tr>';
            } else {
                data.forEach(function(f) {
                    var farmer = f.farm_name || f.farmer_name || '-';
                    var location = f.location || [f.barangay, f.municipality].filter(Boolean).join(', ') || '-';
                    var size = f.size ? f.size + ' ' + (f.size_unit || 'ha') : '-';
                    html += '<tr><td>' + farmer + '</td><td>' + location + '</td><td>' + size + '</td><td>' + (f.crop_type || '-') + '</td></tr>';
                });
            }
            html += '</tbody></table></div>';
            document.getElementById('report-result').innerHTML = html;
        }.bind(this));
    },
    
    showStockReport: function(filterParams) {
        document.getElementById('report-result').innerHTML = '<div class="text-center">Loading...</div>';
        Promise.all([API.getSeeds({ limit: 1000 }), API.getEquipment({ limit: 1000 })]).then(function(results) {
            var seeds = results[0].data || [];
            var equipment = results[1].data || [];
            var html = '<div class="report-result" id="print-area"><h3>Seed & Equipment Stock Report</h3>';
            html += this.getFilterSummary(filterParams);
            html += '<div style="margin-bottom: 16px;"><button class="btn btn-green" onclick="Reports.printReport()">Print</button> <button class="btn btn-green" onclick="Reports.exportReport()">Export</button></div>';
            html += '<h4>Seeds</h4><table class="report-table"><thead><tr><th>Crop Type</th><th>Variety</th><th>Quantity</th><th>Status</th></tr></thead><tbody>';
            if (seeds.length === 0) {
                html += '<tr><td colspan="4" class="text-center">No records found</td></tr>';
            } else {
                seeds.forEach(function(s) {
                    html += '<tr><td>' + s.crop_type + '</td><td>' + (s.variety || '-') + '</td><td>' + s.quantity + ' ' + s.unit + '</td><td>' + (s.status || '-') + '</td></tr>';
                });
            }
            html += '</tbody></table>';
            html += '<h4>Equipment</h4><table class="report-table"><thead><tr><th>Name</th><th>Category</th><th>Quantity</th><th>Condition</th></tr></thead><tbody>';
            if (equipment.length === 0) {
                html += '<tr><td colspan="4" class="text-center">No records found</td></tr>';
            } else {
                equipment.forEach(function(e) {
                    html += '<tr><td>' + e.name + '</td><td>' + (e.category || '-') + '</td><td>' + e.quantity + '</td><td>' + (e.condition || '-') + '</td></tr>';
                });
            }
            html += '</tbody></table></div>';
            document.getElementById('report-result').innerHTML = html;
        }.bind(this));
    },
    
    printReport: function() {
        var printArea = document.getElementById('print-area');
        if (!printArea) return;
        
        var titleEl = printArea.querySelector('h3');
        var reportTitle = titleEl ? titleEl.textContent.trim() : 'Distribution Report';
        
        var iframe = document.getElementById('report-print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'report-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = '0px';
            document.body.appendChild(iframe);
        }
        
        var win = iframe.contentWindow || iframe.contentDocument.defaultView;
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        
        doc.open();
        doc.write('<!DOCTYPE html>');
        doc.write('<html><head><title>' + reportTitle + '</title>');
        win.document.write('<style>');
        win.document.write('@page { size: landscape; margin: 5mm 8mm; }');
        win.document.write('html, body { height: 100%; max-height: 100vh; margin: 0; padding: 4px 8px; box-sizing: border-box; font-family: Arial, sans-serif; font-size: 10px; overflow: hidden; }');
        win.document.write('body { display: flex; flex-direction: column; justify-content: space-between; }');
        win.document.write('table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: avoid; }');
        win.document.write('th, td { border: 1px solid #000; padding: 3px 4px; text-align: center; font-size: 8.5px; vertical-align: middle; height: 18px; }');
        win.document.write('th { background: #f0f0f0; font-weight: bold; }');
        win.document.write('td { text-align: left; }');
        win.document.write('.header-cell { background: #fff; border: none; text-align: left; font-size: 10px; line-height: 1.3; padding: 0 0 5px 0; }');
        win.document.write('.header-cell div { margin: 0; }');
        win.document.write('.header-cell .dept { font-weight: bold; font-size: 10px; }');
        win.document.write('.header-cell .title { font-size: 11px; font-weight: bold; margin-top: 2px; }');
        win.document.write('.col-no { width: 2.5%; }');
        win.document.write('.col-name { width: 7%; }');
        win.document.write('.col-first { width: 6%; }');
        win.document.write('.col-middle { width: 6%; }');
        win.document.write('.col-bdate { width: 5%; }');
        win.document.write('.col-gender { width: 2.5%; }');
        win.document.write('.col-assoc { width: 7%; }');
        win.document.write('.col-seeds { width: 9%; }');
        win.document.write('.col-address { width: 12%; }');
        win.document.write('.col-qty { width: 5%; }');
        win.document.write('.col-area { width: 5%; }');
        win.document.write('.col-contact { width: 6%; }');
        win.document.write('.col-sig { width: 7%; }');
        win.document.write('.footer { margin-top: 15px; margin-bottom: 5px; display: flex; justify-content: space-around; page-break-inside: avoid; page-break-before: avoid; }');
        win.document.write('.footer-left, .footer-right { text-align: center; }');
        win.document.write('.sig-line { margin-top: 25px; border-top: 1px solid #000; width: 180px; }');
        win.document.write('.btn, .filter-summary { display: none; }');
        win.document.write('@media print { html, body { height: 100%; max-height: 100%; overflow: hidden; page-break-after: avoid; page-break-inside: avoid; } table, tr, td, th, div { page-break-inside: avoid; } }');
        win.document.write('</style>');
        win.document.write('</head><body><div>');
        
        var maxRows = 10;
        
        if (reportTitle.toLowerCase().includes('distribution')) {
            var distData = this.currentDistributionData;
            
            var tableHtml = '<table>';
            tableHtml += '<thead>';
            tableHtml += '<tr>';
            tableHtml += '<th class="header-cell" colspan="13" style="text-align: left; border: none; padding-bottom: 0;">';
            tableHtml += '<div class="dept" style="font-weight: bold;">DEPARTMENT OF AGRICULTURE</div>';
            tableHtml += '<div>REGIONAL OFFFICE VII</div>';
            tableHtml += '<div>KANHURAW HILL, TACLOBAN CITY</div>';
            tableHtml += '<div style="font-weight: bold; margin-top: 4px;">High Value Crops Development Program</div>';
            tableHtml += '<div style="font-weight: bold;">VEGETABLE SEEDS</div>';
            tableHtml += '<div style="margin-top: 4px;">Municipality: ZUMARRAGA, SAMAR</div>';
            tableHtml += '<div>Province: SAMAR</div>';
            tableHtml += '</th>';
            tableHtml += '</tr>';
            tableHtml += '<tr><th colspan="13" style="height: 15px; border: none;"></th></tr>';
            tableHtml += '<tr>';
            tableHtml += '<th class="col-no">No.</th>';
            tableHtml += '<th class="col-name">Surname</th>';
            tableHtml += '<th class="col-first">First Name</th>';
            tableHtml += '<th class="col-middle">Middle Name</th>';
            tableHtml += '<th class="col-bdate">Birthdate</th>';
            tableHtml += '<th class="col-gender">Gender (M/F)</th>';
            tableHtml += '<th class="col-assoc">Association/ Organization</th>';
            tableHtml += '<th class="col-seeds">Vegetable Seeds</th>';
            tableHtml += '<th class="col-address">Complete Address</th>';
            tableHtml += '<th class="col-qty">Quantity Received (pcs)</th>';
            tableHtml += '<th class="col-area">Area Planted (ha)</th>';
            tableHtml += '<th class="col-contact">Contact Number</th>';
            tableHtml += '<th class="col-sig">Signature</th>';
            tableHtml += '</tr>';
            tableHtml += '</thead><tbody>';
            
            var displayRowsCount = distData ? distData.length : 0;
            if (!distData && printArea) {
                var table = printArea.querySelector('table');
                if (table) {
                    var rows = table.querySelectorAll('tbody tr');
                    displayRowsCount = rows.length;
                }
            }
            
            var actualRowsCount = Math.min(displayRowsCount, maxRows);
            
            for (var i = 0; i < actualRowsCount; i++) {
                var surname = '', firstName = '', middleName = '', bdate = '', gender = '', assoc = '', items = '', address = '', qty = '', area = '', contact = '';
                
                if (distData && distData[i]) {
                    var d = distData[i];
                    var nameParts = this.parseFullName(d.farmer_name, d);
                    surname = nameParts.surname || '';
                    firstName = nameParts.firstName || '';
                    middleName = nameParts.middleName || '';
                    
                    bdate = (d.birthdate && d.birthdate !== '0000-00-00') ? d.birthdate : '';
                    
                    if (d.sex) {
                        var s = String(d.sex).trim().toUpperCase();
                        if (s.startsWith('M')) gender = 'M';
                        else if (s.startsWith('F')) gender = 'F';
                        else gender = d.sex;
                    }
                    
                    assoc = d.association || d.organization || d.crop_type || '';
                    
                    if (d.items && d.items.length > 0) {
                        var itemNames = d.items.map(function(it) {
                            if (it.item_type === 'seed') {
                                return it.seed_variety || it.seed_crop_type || it.item_name;
                            } else if (it.item_type === 'equipment') {
                                return it.equip_name || it.equip_category || it.item_name;
                            }
                            return it.item_name || 'Item';
                        });
                        var itemQtys = d.items.map(function(it) { return it.quantity; });
                        items = itemNames.join(', ');
                        qty = itemQtys.join(', ');
                    } else {
                        items = '-';
                        qty = d.total_items || 0;
                    }
                    
                    var addrParts = [d.address, d.barangay, d.municipality, d.province].filter(Boolean);
                    var uniqueAddr = [];
                    addrParts.forEach(function(ap) {
                        if (uniqueAddr.indexOf(ap) === -1) uniqueAddr.push(ap);
                    });
                    address = uniqueAddr.join(', ');
                    
                    var fSize = parseFloat(d.calculated_farm_size || d.farm_size || 0);
                    area = fSize > 0 ? fSize.toFixed(2).replace(/\.00$/, '') : '';
                    
                    contact = d.phone || d.farmer_phone || '';
                } else if (printArea) {
                    var table = printArea.querySelector('table');
                    if (table) {
                        var rows = table.querySelectorAll('tbody tr');
                        var row = rows[i];
                        if (row) {
                            var cells = row.querySelectorAll('td');
                            if (!(cells.length === 1 && cells[0].classList.contains('text-center'))) {
                                var fName = cells.length > 1 ? cells[1].textContent.trim() : '';
                                var nParts = this.parseFullName(fName);
                                surname = nParts.surname;
                                firstName = nParts.firstName;
                                middleName = nParts.middleName;
                                items = cells.length > 2 ? cells[2].textContent.trim() : '';
                                qty = cells.length > 3 ? cells[3].textContent.trim() : '';
                            }
                        }
                    }
                }
                
                tableHtml += '<tr>';
                tableHtml += '<td class="col-no">' + (i + 1) + '</td>';
                tableHtml += '<td class="col-name">' + surname + '</td>';
                tableHtml += '<td class="col-first">' + firstName + '</td>';
                tableHtml += '<td class="col-middle">' + middleName + '</td>';
                tableHtml += '<td class="col-bdate">' + bdate + '</td>';
                tableHtml += '<td class="col-gender">' + gender + '</td>';
                tableHtml += '<td class="col-assoc">' + assoc + '</td>';
                tableHtml += '<td class="col-seeds">' + items + '</td>';
                tableHtml += '<td class="col-address">' + address + '</td>';
                tableHtml += '<td class="col-qty">' + qty + '</td>';
                tableHtml += '<td class="col-area">' + area + '</td>';
                tableHtml += '<td class="col-contact">' + contact + '</td>';
                tableHtml += '<td class="col-sig"></td>';
                tableHtml += '</tr>';
            }
            
            for (var j = actualRowsCount; j < maxRows; j++) {
                tableHtml += '<tr>';
                tableHtml += '<td class="col-no">' + (j + 1) + '</td>';
                for (var k = 0; k < 12; k++) {
                    tableHtml += '<td></td>';
                }
                tableHtml += '</tr>';
            }
            
            tableHtml += '</tbody></table>';
            win.document.write(tableHtml);
        } else {
            var headerHtml = '<div style="margin-bottom: 10px;">';
            headerHtml += '<div style="font-weight: bold; font-size: 11px;">DEPARTMENT OF AGRICULTURE</div>';
            headerHtml += '<div style="font-size: 10px;">REGIONAL OFFICE VII</div>';
            headerHtml += '<div style="font-size: 10px;">KANHURAW HILL, TACLOBAN CITY</div>';
            headerHtml += '<div style="font-weight: bold; font-size: 12px; margin-top: 6px; color: #166534;">' + reportTitle + '</div>';
            headerHtml += '<div style="font-size: 9px; color: #555; margin-top: 2px;">Municipality: ZUMARRAGA, SAMAR | Province: SAMAR</div>';
            headerHtml += '</div>';
            win.document.write(headerHtml);

            var tables = printArea.querySelectorAll('table');
            tables.forEach(function(tbl) {
                var cloneTbl = tbl.cloneNode(true);
                var rows = cloneTbl.querySelectorAll('tbody tr');
                if (rows.length > maxRows) {
                    for (var r = maxRows; r < rows.length; r++) {
                        rows[r].remove();
                    }
                }
                win.document.write(cloneTbl.outerHTML);
            });
        }
        
        win.document.write('</div>');
        win.document.write('<div class="footer">');
        win.document.write('<div class="footer-left">');
        win.document.write('<div class="sig-line"></div>');
        win.document.write('<div style="font-weight: 500; font-size: 9px; margin-top: 2px;">Agri Technologist</div>');
        win.document.write('</div>');
        win.document.write('<div class="footer-right">');
        win.document.write('<div class="sig-line"></div>');
        win.document.write('<div style="font-weight: 500; font-size: 9px; margin-top: 2px;">MA/MO</div>');
        win.document.write('</div>');
        win.document.write('</div>');
        
        win.document.write('</body></html>');
        doc.close();
        
        setTimeout(function() {
            win.focus();
            win.print();
        }, 300);
    },
    
    parseFullName: function(fullName, farmerObj) {
        if (farmerObj && (farmerObj.last_name || farmerObj.first_name)) {
            return {
                surname: (farmerObj.last_name || '').trim(),
                firstName: (farmerObj.first_name || '').trim(),
                middleName: (farmerObj.middle_name || '').trim()
            };
        }
        
        if (!fullName || fullName === '-') {
            return { surname: '', firstName: '', middleName: '' };
        }
        
        var nameStr = fullName.trim();
        if (nameStr.includes(',')) {
            var parts = nameStr.split(',');
            var surname = parts[0].trim();
            var rest = parts.slice(1).join(' ').trim().split(/\s+/);
            var firstName = rest[0] || '';
            var middleName = rest.slice(1).join(' ');
            return { surname: surname, firstName: firstName, middleName: middleName };
        } else {
            var parts = nameStr.split(/\s+/);
            return {
                surname: parts[0] || '',
                firstName: parts[1] || '',
                middleName: parts.slice(2).join(' ')
            };
        }
    },
    
    exportReport: function() {
        var printArea = document.getElementById('print-area');
        if (!printArea) return;
        
        var table = printArea.querySelector('table');
        if (!table) return;
        
        var csv = [];
        
        // Add header
        csv.push('DEPARTMENT OF AGRICULTURE');
        csv.push('REGIONAL OFFFICE VII');
        csv.push('KANHURAW HILL, TACLOBAN CITY');
        csv.push('High Value Crops Development Program');
        csv.push('VEGETABLE SEEDS');
        csv.push('Municipality: ZUMARRAGA, SAMAR');
        csv.push('Province: SAMAR');
        csv.push('');
        
        var rows = table.querySelectorAll('tr');
        rows.forEach(function(row) {
            var cols = row.querySelectorAll('th, td');
            var rowData = [];
            cols.forEach(function(col) {
                rowData.push(col.innerText);
            });
            csv.push(rowData.join(','));
        });
        
        var csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(csvFile);
        link.download = 'report_' + new Date().toISOString().split('T')[0] + '.csv';
        link.click();
    },
    
    generateFromFilter: function() {
        var type = document.getElementById('report-type-filter').value;
        var period = document.getElementById('report-period-filter').value;
        var item = document.getElementById('report-item-filter').value;
        var filterParams = null;
        
        if (period === 'day') {
            filterParams = {
                type: 'day',
                date: document.getElementById('report-day-input').value
            };
        } else if (period === 'monthly') {
            filterParams = {
                type: 'monthly',
                month: parseInt(document.getElementById('report-month-select').value),
                year: parseInt(document.getElementById('report-year-select').value)
            };
        }
        
        if (item) {
            if (!filterParams) filterParams = {};
            filterParams.item = item;
        }
        
        if (type === 'distribution') {
            this.showDistributionReport(filterParams);
        } else if (type === 'farmer') {
            this.showFarmerReport(filterParams);
        } else if (type === 'farm') {
            this.showFarmReport(filterParams);
        } else if (type === 'stock') {
            this.showStockReport(filterParams);
        } else {
            alert('Please select a report type');
        }
        
        if (filterParams) {
            this.updateAnalyticsWithFilter(filterParams);
        } else {
            this.loadAnalytics();
        }
    },
    
    updateAnalyticsWithFilter: function(filterParams) {
        API.getDistributions({ limit: 1000 }).then(function(res) {
            var distData = res.data || [];
            var filteredData = this.applyDateFilter(distData, filterParams);
            
            document.getElementById('stat-total-dist').textContent = filteredData.length;
            
            var totalItems = 0;
            filteredData.forEach(function(d) {
                if (d.items) {
                    d.items.forEach(function(item) {
                        totalItems += parseFloat(item.quantity) || 0;
                    });
                }
            });
            
            var itemCounts = {};
            filteredData.forEach(function(d) {
                if (d.items) {
                    d.items.forEach(function(item) {
                        var name = item.item_type === 'seed' 
                            ? (item.seed_variety || item.item_name) 
                            : (item.equip_name || item.equip_category || item.item_name);
                        if (!name) name = 'Unknown';
                        itemCounts[name] = (itemCounts[name] || 0) + parseFloat(item.quantity);
                    });
                }
            });
            
            var farmerCounts = {};
            filteredData.forEach(function(d) {
                var name = d.farmer_name || 'Farmer #' + d.farmer_id;
                farmerCounts[name] = (farmerCounts[name] || 0) + (d.total_items || 0);
            });
            
            var seedCounts = {};
            filteredData.forEach(function(d) {
                if (d.items) {
                    d.items.forEach(function(item) {
                        if (item.item_type === 'seed') {
                            var name = item.seed_variety || item.item_name || 'Unknown';
                            seedCounts[name] = (seedCounts[name] || 0) + parseFloat(item.quantity);
                        }
                    });
                }
            });
            
            this.renderAnalyticsCharts(itemCounts, farmerCounts, seedCounts, filterParams);
        }.bind(this));
    },
    
    renderAnalyticsCharts: function(itemCounts, farmerCounts, seedCounts, filterParams) {
        var summaryText = '';
        if (filterParams.type === 'day') {
            summaryText = ' (Filtered: ' + filterParams.date + ')';
        } else if (filterParams.type === 'monthly') {
            var monthNames = {1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'};
            summaryText = ' (Filtered: ' + monthNames[filterParams.month] + ' ' + filterParams.year + ')';
        }
        
        var trendCanvas = document.getElementById('dist-trend-chart');
        if (trendCanvas) {
            var ctx = trendCanvas.getContext('2d');
            var existingChart = Chart.getChart(trendCanvas);
            if (existingChart) existingChart.destroy();
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Distribution Data' + summaryText],
                    datasets: [{
                        label: 'Distributions',
                        data: [1],
                        borderColor: '#22C55E',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
        
        var itemsChart = document.getElementById('items-chart');
        if (itemsChart) {
            var itemsCtx = itemsChart.getContext('2d');
            var existingItemsChart = Chart.getChart(itemsChart);
            if (existingItemsChart) existingItemsChart.destroy();
            
            var sortedItems = Object.keys(itemCounts).map(function(k) {
                return { name: k, qty: itemCounts[k] };
            }).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 5);
            
            new Chart(itemsCtx, {
                type: 'bar',
                data: {
                    labels: sortedItems.map(function(i) { return i.name; }),
                    datasets: [{
                        label: 'Quantity',
                        data: sortedItems.map(function(i) { return i.qty; }),
                        backgroundColor: '#3B82F6'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
            });
        }
        
        var topFarmersChart = document.getElementById('top-farmers-chart');
        if (topFarmersChart) {
            var farmersCtx = topFarmersChart.getContext('2d');
            var existingFarmersChart = Chart.getChart(topFarmersChart);
            if (existingFarmersChart) existingFarmersChart.destroy();
            
            var sortedFarmers = Object.keys(farmerCounts).map(function(k) {
                return { name: k, qty: farmerCounts[k] };
            }).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 5);
            
            new Chart(farmersCtx, {
                type: 'bar',
                data: {
                    labels: sortedFarmers.map(function(f) { return f.name; }),
                    datasets: [{
                        label: 'Items Received',
                        data: sortedFarmers.map(function(f) { return f.qty; }),
                        backgroundColor: '#F59E0B'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        
        var seedTypesChart = document.getElementById('seed-types-chart');
        if (seedTypesChart) {
            var seedCtx = seedTypesChart.getContext('2d');
            var existingSeedChart = Chart.getChart(seedTypesChart);
            if (existingSeedChart) existingSeedChart.destroy();
            
            var sortedSeeds = Object.keys(seedCounts).map(function(k) {
                return { name: k, qty: seedCounts[k] };
            }).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 5);
            
            new Chart(seedCtx, {
                type: 'doughnut',
                data: {
                    labels: sortedSeeds.map(function(s) { return s.name; }),
                    datasets: [{
                        data: sortedSeeds.map(function(s) { return s.qty; }),
                        backgroundColor: ['#22C55E', '#16A34A', '#4ADE80', '#86EFAC', '#166534']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    },
    
    applyDateFilter: function(data, filterParams) {
        if (!filterParams) return data;
        
        return data.filter(function(item) {
            var itemDate = item.distribution_date || item.date || item.created_at;
            if (!itemDate) return false;
            
            var date = new Date(itemDate);
            if (isNaN(date.getTime())) return false;
            
            if (filterParams.type === 'day') {
                var filterDate = new Date(filterParams.date);
                return date.toDateString() === filterDate.toDateString();
            } else if (filterParams.type === 'monthly') {
                return date.getMonth() + 1 === filterParams.month && date.getFullYear() === filterParams.year;
            }
            return true;
        });
    },
    
    getFilterSummary: function(filterParams) {
        if (!filterParams) return '';
        
        var summary = '<div style="margin-bottom: 12px; padding: 10px; background: #F0FDF4; border-radius: 6px; font-size: 13px; color: #166534;">';
        
        if (filterParams.type === 'day') {
            summary += '<strong>Filtered by:</strong> ' + filterParams.date;
        } else if (filterParams.type === 'monthly') {
            var monthNames = {1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'};
            summary += '<strong>Filtered by:</strong> ' + monthNames[filterParams.month] + ' ' + filterParams.year;
        }
        
        summary += '</div>';
        return summary;
    },
    
    loadAnalytics: function() {
        Promise.all([
            API.getDistributions({ limit: 1000 }),
            API.getFarmers({ limit: 1000 }),
            API.getFarms({ limit: 1000 }),
            API.getSeeds({ limit: 1000 }),
            API.getEquipment({ limit: 1000 }),
            API.getDistributionTrends('monthly', 6)
        ]).then(function(results) {
            var distData = results[0].data || [];
            var farmerData = results[1].data || [];
            var farmData = results[2].data || [];
            var seedData = results[3].data || [];
            var equipData = results[4].data || [];
            var trendsData = results[5].data || [];
            
            document.getElementById('stat-total-dist').textContent = distData.length;
            document.getElementById('stat-total-farmers').textContent = farmerData.length;
            document.getElementById('stat-total-farms').textContent = farmData.length;
            
            var totalSeeds = 0;
            seedData.forEach(function(s) { totalSeeds += parseFloat(s.quantity) || 0; });
            var totalEquip = 0;
            equipData.forEach(function(e) { totalEquip += parseInt(e.quantity) || 0; });
            document.getElementById('stat-total-seeds').textContent = (totalSeeds + totalEquip).toFixed(0);
            
            // Distribution Trends Chart
            var trendCanvas = document.getElementById('dist-trend-chart');
            if (trendCanvas && trendsData.length > 0) {
                var ctx = trendCanvas.getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: trendsData.map(function(d) { return d.month_label || d.date; }),
                        datasets: [{
                            label: 'Distributions',
                            data: trendsData.map(function(d) { return parseInt(d.distributions) || 0; }),
                            borderColor: '#22C55E',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
            
            // Most Distributed Items Chart
            var itemsChart = document.getElementById('items-chart');
            if (itemsChart) {
                var itemsCtx = itemsChart.getContext('2d');
                var itemCounts = {};
                distData.forEach(function(d) {
                    if (d.items) {
                        d.items.forEach(function(item) {
                            var name = item.item_type === 'seed' 
                                ? (item.seed_variety || item.item_name) 
                                : (item.equip_name || item.equip_category || item.item_name);
                            if (!name) name = 'Unknown';
                            itemCounts[name] = (itemCounts[name] || 0) + parseFloat(item.quantity);
                        });
                    }
                });
                var sortedItems = Object.keys(itemCounts).map(function(k) {
                    return { name: k, qty: itemCounts[k] };
                }).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 5);
                
                new Chart(itemsCtx, {
                    type: 'bar',
                    data: {
                        labels: sortedItems.map(function(i) { return i.name; }),
                        datasets: [{
                            label: 'Quantity',
                            data: sortedItems.map(function(i) { return i.qty; }),
                            backgroundColor: '#3B82F6'
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
                });
            }
            
            // Top Farmers by Resources Received
            var topFarmersChart = document.getElementById('top-farmers-chart');
            if (topFarmersChart) {
                var farmersCtx = topFarmersChart.getContext('2d');
                var farmerCounts = {};
                distData.forEach(function(d) {
                    var name = d.farmer_name || 'Farmer #' + d.farmer_id;
                    farmerCounts[name] = (farmerCounts[name] || 0) + (d.total_items || 0);
                });
                var sortedFarmers = Object.keys(farmerCounts).map(function(k) {
                    return { name: k, qty: farmerCounts[k] };
                }).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 5);
                
                new Chart(farmersCtx, {
                    type: 'bar',
                    data: {
                        labels: sortedFarmers.map(function(f) { return f.name; }),
                        datasets: [{
                            label: 'Items Received',
                            data: sortedFarmers.map(function(f) { return f.qty; }),
                            backgroundColor: '#F59E0B'
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
            
            // Most Distributed Seed Types
            var seedTypesChart = document.getElementById('seed-types-chart');
            if (seedTypesChart) {
                var seedCtx = seedTypesChart.getContext('2d');
                var seedCounts = {};
                distData.forEach(function(d) {
                    if (d.items) {
                        d.items.forEach(function(item) {
                            if (item.item_type === 'seed') {
                                var name = item.seed_variety || item.item_name || 'Unknown';
                                seedCounts[name] = (seedCounts[name] || 0) + parseFloat(item.quantity);
                            }
                        });
                    }
                });
                var sortedSeeds = Object.keys(seedCounts).map(function(k) {
                    return { name: k, qty: seedCounts[k] };
                }).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 5);
                
                new Chart(seedCtx, {
                    type: 'doughnut',
                    data: {
                        labels: sortedSeeds.map(function(s) { return s.name; }),
                        datasets: [{
                            data: sortedSeeds.map(function(s) { return s.qty; }),
                            backgroundColor: ['#22C55E', '#16A34A', '#4ADE80', '#86EFAC', '#166534']
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        });
    }
};

window.Pages = Pages;
