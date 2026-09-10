const Utils = {
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },
    
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return new Intl.NumberFormat('en-GB').format(num);
    },
    
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return 'KSh 0';
        return 'KSh ' + new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2 }).format(amount);
    },
    
    getStatusClass(status) {
        const classes = {
            'active': 'active',
            'inactive': 'inactive',
            'available': 'available',
            'low_stock': 'low_stock',
            'out_of_stock': 'out_of_stock',
            'scheduled': 'scheduled',
            'completed': 'completed',
            'cancelled': 'inactive'
        };
        return classes[status] || '';
    },
    
    truncate(str, length = 30) {
        if (!str) return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
    },
    
    showToast(type, title, message, duration = 3500) {
        let container = document.getElementById('notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            document.body.appendChild(container);
        }
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="#22C55E" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="#DC2626" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="#F59E0B" width="22" height="22"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="#3B82F6" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close notification">&times;</button>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast && toast.parentElement) {
                toast.classList.add('toast-fadeout');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    getMonthName(month) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || '';
    },
    
    generateCSV(data, filename = 'export.csv') {
        if (!data || !data.length) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                let val = row[h];
                if (typeof val === 'string' && val.includes(',')) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val !== null && val !== undefined ? val : '';
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    },
    
    printElement(elementId) {
        const target = document.getElementById(elementId);
        if (!target) return;
        const content = target.innerHTML;
        let iframe = document.getElementById('utils-print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'utils-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = '0px';
            document.body.appendChild(iframe);
        }
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Report</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1e293b; }
                    table { border-collapse: collapse; width: 100%; margin-top: 15px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
                    th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 11px; }
                    h1, h2, h3 { color: #0f172a; margin-top: 0; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        doc.close();
        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
        }, 300);
    },

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // ==========================================
    // Network & Device Adaptation Utilities
    // ==========================================
    
    getConnectionInfo() {
        const isOnline = navigator.onLine !== false;
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        let effectiveType = '4g';
        let downlink = null;
        let rtt = null;
        let saveData = false;
        
        if (conn) {
            effectiveType = conn.effectiveType || '4g';
            downlink = conn.downlink || null;
            rtt = conn.rtt || null;
            saveData = !!conn.saveData;
        }

        const isSlow = !isOnline || effectiveType === '2g' || effectiveType === 'slow-2g' || (rtt !== null && rtt > 1000);
        
        let label = 'Online';
        let badgeClass = 'online-fast';
        let icon = 'fa-wifi';

        if (!isOnline) {
            label = 'Offline';
            badgeClass = 'offline';
            icon = 'fa-plane-slash';
        } else if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            label = '2G (Slow)';
            badgeClass = 'online-slow';
            icon = 'fa-signal';
        } else if (effectiveType === '3g') {
            label = '3G';
            badgeClass = 'online-medium';
            icon = 'fa-signal';
        } else if (saveData) {
            label = 'Data Saver';
            badgeClass = 'online-saver';
            icon = 'fa-gauge-simple-low';
        } else {
            label = 'Online (Fast)';
            badgeClass = 'online-fast';
            icon = 'fa-bolt';
        }

        return {
            isOnline,
            isSlow,
            effectiveType,
            downlink,
            rtt,
            saveData,
            label,
            badgeClass,
            icon
        };
    },

    // ==========================================
    // Offline Data Cache & Sync Queue
    // ==========================================

    cacheData(key, data) {
        try {
            const payload = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem('dts_cache_' + key, JSON.stringify(payload));
        } catch (e) {
            console.warn('[Cache] LocalStorage write failed:', e);
        }
    },

    getCachedData(key) {
        try {
            const raw = localStorage.getItem('dts_cache_' + key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed ? parsed.data : null;
        } catch (e) {
            return null;
        }
    },

    getOfflineQueue() {
        try {
            const raw = localStorage.getItem('dts_offline_queue');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    addToOfflineQueue(operation) {
        try {
            const queue = this.getOfflineQueue();
            const item = {
                id: 'local_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                table_name: operation.table_name,
                operation: operation.operation, // 'INSERT', 'UPDATE', 'DELETE'
                record_id: operation.record_id || null,
                data_json: typeof operation.data === 'string' ? operation.data : JSON.stringify(operation.data || {}),
                created_at: new Date().toISOString()
            };
            queue.push(item);
            localStorage.setItem('dts_offline_queue', JSON.stringify(queue));
            return item;
        } catch (e) {
            console.error('[Queue] Failed to add item to offline queue:', e);
            return null;
        }
    },

    removeOfflineQueueItem(id) {
        try {
            let queue = this.getOfflineQueue();
            queue = queue.filter(item => item.id !== id);
            localStorage.setItem('dts_offline_queue', JSON.stringify(queue));
        } catch (e) {
            console.error('[Queue] Failed to remove item from offline queue:', e);
        }
    },

    clearOfflineQueue() {
        try {
            localStorage.removeItem('dts_offline_queue');
        } catch (e) {}
    },

    getOfflineQueueCount() {
        return this.getOfflineQueue().length;
    }
};

window.Utils = Utils;