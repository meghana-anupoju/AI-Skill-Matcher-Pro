// Profile Management
function initializeProfile() {
    // Wire profile settings tabs
    const tabButtons = document.querySelectorAll('.settings-tabs .tab-btn');
    if (tabButtons.length) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = btn.dataset.tab;
                if (!tab) return;

                // Update active state on buttons
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show corresponding tab content
                document.querySelectorAll('.profile-main .tab-content').forEach(tc => {
                    tc.classList.remove('active');
                });
                const target = document.getElementById(`${tab}-tab`);
                if (target) {
                    target.classList.add('active');
                }
            });
        });
    }

    // Wire up quick action buttons
    document.querySelectorAll('.quick-actions-grid .action-btn-large').forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });

    // Initialize API key copy functionality
    document.querySelectorAll('.api-key-item .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const keyValue = btn.closest('.api-key-item').querySelector('.api-key-value');
            if (keyValue) {
                navigator.clipboard.writeText(keyValue.textContent)
                    .then(() => showNotification('API key copied to clipboard!', 'success'))
                    .catch(() => showNotification('Failed to copy API key', 'error'));
            }
        });
    });

    // Initialize integration sync buttons
    document.querySelectorAll('.integration-actions .btn').forEach(btn => {
        btn.addEventListener('click', handleIntegrationAction);
    });

    console.log('Profile system initialized');
}

function handleQuickAction(e) {
    const action = e.currentTarget.querySelector('span').textContent;
    switch(action) {
        case 'Export Resume':
            showNotification('Preparing resume for export...', 'info');
            // Implement resume export logic
            break;
        case 'Share Profile':
            showNotification('Opening profile sharing options...', 'info');
            // Implement profile sharing logic
            break;
        case 'Update Skills':
            showNotification('Initiating skill assessment update...', 'info');
            // Implement skills update logic
            break;
        case 'Privacy Check':
            // Switch to privacy tab
            document.querySelector('.settings-tabs [data-tab="privacy"]').click();
            break;
        case 'Get Certified':
            showNotification('Loading certification options...', 'info');
            // Implement certification logic
            break;
        case 'View Analytics':
            showNotification('Loading profile analytics...', 'info');
            // Implement analytics view logic
            break;
    }
}

function handleIntegrationAction(e) {
    const btn = e.currentTarget;
    const action = btn.querySelector('i').classList.contains('fa-sync') ? 'sync' : 'disconnect';
    const integration = btn.closest('.integration-item');
    const platform = integration.querySelector('h4').textContent;

    if (action === 'sync') {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        // Simulate sync
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync"></i> Sync Now';
            showNotification(`${platform} sync completed!`, 'success');
            // Update last sync time
            const stats = integration.querySelector('.integration-stats');
            if (stats) {
                stats.querySelector('span').textContent = 'Last sync: Just now';
            }
        }, 2000);
    } else if (action === 'disconnect') {
        if (confirm(`Are you sure you want to disconnect ${platform}?`)) {
            integration.classList.remove('connected');
            showNotification(`${platform} disconnected successfully`, 'info');
        }
    }
}