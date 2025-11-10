// Minimal dashboard-modern.js stub (restored to safe default)
// This file intentionally keeps dashboard behavior minimal to preserve pre-edit state.

document.addEventListener('DOMContentLoaded', () => {
    // No-op: dashboard behavior is provided by app.js initializeDashboard
});

// Provide a no-op initializeDashboard so other code can call it safely
function initializeDashboard() {
    // intentionally empty
}

window.initializeDashboard = initializeDashboard;
