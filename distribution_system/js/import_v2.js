(function() {
    if (typeof Pages === 'undefined') return;

    Pages.importFarmers = function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;

            var maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('File is too large. Maximum size is 50MB.');
                return;
            }
            if (file.size === 0) {
                alert('The selected file is empty. Please choose a file with data.');
                return;
            }

            var ext = file.name.split('.').pop().toLowerCase();
            if (['csv', 'xlsx', 'xls'].indexOf(ext) === -1) {
                alert('Invalid file type. Please select a .csv, .xlsx, or .xls file.');
                return;
            }

            var fd = new FormData();
            fd.append('file', file);

            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'api/import_farmers.php?t=' + Date.now(), true);
            xhr.timeout = 120000;

            xhr.onload = function() {
                var raw = xhr.responseText || '';
                if (!raw || raw.trim().length === 0) {
                    alert('Import failed: Server returned an empty response (HTTP ' + xhr.status + ').');
                    return;
                }

                if (xhr.status < 200 || xhr.status >= 300) {
                    var clean = raw.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
                    alert('Import failed: Server error (' + xhr.status + ') - ' + (clean.substring(0, 300) || 'No details'));
                    return;
                }

                var clean = raw.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
                var si = -1;
                for (var i = 0; i < clean.length; i++) {
                    if (clean[i] === '{' || clean[i] === '[') { si = i; break; }
                }
                if (si === -1) {
                    alert('Import failed: Server returned non-JSON response:\n' + (clean.substring(0, 300) || 'Empty response'));
                    return;
                }

                try {
                    var result = JSON.parse(clean.substring(si));
                    if (result.success) {
                        var msg = 'Successfully imported ' + result.imported + ' of ' + result.total + ' farmers';
                        if (result.skipped > 0) msg += ' (' + result.skipped + ' skipped)';
                        if (result.errors && result.errors.length > 0) {
                            msg += '\n\nErrors:\n- ' + result.errors.slice(0, 5).join('\n- ');
                            if (result.errors.length > 5) msg += '\n...and ' + (result.errors.length - 5) + ' more';
                        }
                        alert(msg);
                        Pages._refreshFarmersTable();
                    } else {
                        alert('Import failed: ' + (result.error || 'Unknown error'));
                    }
                } catch (parseError) {
                    alert('Import failed: Invalid JSON from server:\n' + clean.substring(0, 300));
                }
            };

            xhr.onerror = function() {
                alert('Import failed: Network error - could not reach the server.');
            };

            xhr.ontimeout = function() {
                alert('Import failed: Server did not respond within 2 minutes.');
            };

            xhr.send(fd);
        };
        input.click();
    };

    Pages._refreshFarmersTable = function() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'api/farmers.php?action=list&page=1&limit=10&t=' + Date.now(), true);
        xhr.onload = function() {
            var raw = xhr.responseText || '';
            if (!raw) { Pages._showFarmersError(); return; }
            var clean = raw.replace(/<[^>]*>/g, ' ').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
            var si = -1;
            for (var i = 0; i < clean.length; i++) {
                if (clean[i] === '{') { si = i; break; }
            }
            if (si === -1) { Pages._showFarmersError(); return; }
            try {
                var result = JSON.parse(clean.substring(si));
                if (result.success && result.data) {
                    Pages.renderFarmersTable(result.data);
                    if (result.pagination) Pages.renderPagination(result.pagination);
                } else {
                    Pages._showFarmersError();
                }
            } catch(e) {
                Pages._showFarmersError();
            }
        };
        xhr.onerror = function() { Pages._showFarmersError(); };
        xhr.send();
    };

    Pages._showFarmersError = function() {
        var tbody = document.getElementById('farmers-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">Could not load farmers. <a href="#" onclick="Pages._refreshFarmersTable();return false;">Retry</a></td></tr>';
        }
    };
})();
