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
        if (amount === null || num === undefined) return 'KSh 0';
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
    
    showToast(type, title, message) {
        const container = document.getElementById('notifications-container');
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="#388E3C" width="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="#D32F2F" width="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="#F57C00" width="24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="#00897B" width="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
        };
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
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
                    val = `"${val}"`;
                }
                return val || '';
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    },
    
    printElement(elementId) {
        const content = document.getElementById(elementId).innerHTML;
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
        const printWindow = iframe.contentWindow || iframe.contentDocument.defaultView;
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Report</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #f5f5f5; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        doc.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
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
    }
};

window.Utils = Utils;