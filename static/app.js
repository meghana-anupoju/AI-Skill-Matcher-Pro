// Copied application logic from frontend/app.js to backend static so Flask-served app can run

// Global application state
let currentSection = 'landing';
let currentTheme = 'light';
let currentFontSize = 'medium';
let isVoiceEnabled = true;
let skillGapChart = null;
let salaryChart = null;
let voiceRecognition = null;
let currentRole = 'candidate';
let uploadProgress = 0;
let lastUploadedResumeId = null;
let realtimeEventSource = null;
let realtimeReconnectAttempts = 0;

function initApp() {
    console.log('AI Skill Matcher Pro - Initializing...');
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    initializeNavigation();
    initializeAccessibility();
    initializeUpload();
    initializeDashboard();
    initializeRoadmap();
    initializeInterview();
    initializeCollaboration();
    initializeProfile();
    initializeNotifications();
    showSection('landing');
    connectToRealtimeStream();
    const savedTheme = localStorage.getItem('appTheme');
    const savedSize = localStorage.getItem('appFontSize');
    if (savedTheme) switchTheme(savedTheme);
    else switchTheme(currentTheme);
    if (savedSize) switchFontSize(savedSize);
    console.log('Application initialized successfully');
    showNotification('AI Skill Matcher Pro loaded successfully!', 'success');
}

function connectToRealtimeStream() {
    if (realtimeEventSource) return;
    function createSource() {
        try {
            realtimeEventSource = new EventSource('/stream');
        } catch (err) {
            console.error('EventSource creation failed', err);
            scheduleReconnect();
            return;
        }
        realtimeEventSource.onopen = function() { realtimeReconnectAttempts = 0; showNotification('Real-time connection established', 'success'); };
        realtimeEventSource.onmessage = function(event) {
            let msg = event.data;
            try { msg = JSON.parse(msg.replace(/'/g, '"')); } catch (e) {}
            try {
                if (msg && msg.type === 'resume_uploaded') {
                    showNotification('New resume uploaded: ' + (msg.filename || 'file'), 'info');
                    const info = document.getElementById('uploaded-file-info');
                    if (info && msg.filename) info.textContent = msg.filename;
                    loadRecentUploads();
                } else {
                    showNotification('Real-time update: ' + (msg.update || JSON.stringify(msg)), 'info');
                }
            } catch (err) { showNotification('Real-time update received', 'info'); }
        };
        realtimeEventSource.onerror = function(e) {
            console.warn('Real-time connection error', e);
            showNotification('Real-time connection lost — attempting to reconnect...', 'warning');
            try { realtimeEventSource.close(); } catch (err) {}
            realtimeEventSource = null;
            scheduleReconnect();
        };
    }
    function scheduleReconnect() {
        realtimeReconnectAttempts = Math.min(6, realtimeReconnectAttempts + 1);
        const backoff = Math.pow(2, realtimeReconnectAttempts) * 1000;
        setTimeout(() => { if (!realtimeEventSource) createSource(); }, backoff);
    }
    createSource();
}

// Initialize after loader.js has finished loading all partials
window.addEventListener('load', () => {
    // Give a small delay to ensure all dynamic content is loaded
    setTimeout(initApp, 100);
});

// Navigation System
function initializeNavigation() {
    // Delegated handler: attach to document so dynamic injection still works
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('.nav-link');
        if (navBtn) {
            e.preventDefault();
            const section = navBtn.getAttribute('data-section');
            if (section) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                navBtn.classList.add('active');
                showSection(section);
            }
            return;
        }
        if (e.target.hasAttribute('data-section')) {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            if (section) showSection(section);
        }
        if (e.target.id === 'learn-more') { e.preventDefault(); scrollToFeatures(); }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1': showSection('landing'); e.preventDefault(); break;
                case '2': showSection('upload'); e.preventDefault(); break;
                case '3': showSection('dashboard'); e.preventDefault(); break;
                case '4': showSection('roadmap'); e.preventDefault(); break;
                case '5': showSection('interview'); e.preventDefault(); break;
                case '6': showSection('collaboration'); e.preventDefault(); break;
                case '7': showSection('profile'); e.preventDefault(); break;
            }
        }
    });
}

function showSection(sectionId) {
    console.log('Switching to section:', sectionId);
    
    // First, remove active class from all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = section.id === sectionId ? 'block' : 'none';
        if (section.id !== sectionId) {
            section.classList.remove('active');
        }
    });

    // Then activate the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        currentSection = sectionId;
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Update URL and scroll position
        window.location.hash = sectionId;
        window.scrollTo(0, 0);
        
        // Notify any listeners
        window.dispatchEvent(new CustomEvent('sectionChanged', { 
            detail: { section: sectionId }
        }));
        
        // Initialize section-specific features
        switch(sectionId) {
            case 'upload':
                initializeUpload();
                break;
            case 'dashboard':
                initializeDashboard();
                break;
            case 'roadmap':
                initializeRoadmap();
                break;
            case 'interview':
                initializeInterview();
                break;
            case 'collaboration':
                initializeCollaboration();
                break;
            case 'profile':
                initializeProfile();
                break;
        }
    }
}

function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) featuresSection.scrollIntoView({ behavior: 'smooth' });
}

/*
  The rest of the functions (initializeAccessibility, initializeUpload, initializeDashboard, etc.)
  are intentionally kept minimal/stubbed here to keep this file focused on navigation and wiring.
  The full frontend/app.js contains many helper functions; add them here if you need the full behavior.
*/

function initializeAccessibility() { /* minimal stub kept to avoid runtime errors */ }
function initializeUpload() {
    const resumeUpload = document.getElementById('resume-upload');
    const resumeFile = document.getElementById('resume-file');
    const resumeText = document.getElementById('resume-text');
    const jobUpload = document.getElementById('job-upload');
    const jobFile = document.getElementById('job-file');
    const jobText = document.getElementById('job-text');
    const analyzeBtn = document.getElementById('analyze-btn');
    const analyzeUploadedBtn = document.getElementById('analyze-uploaded-btn');
    const uploadProgress = document.getElementById('upload-progress');
    
    // Tab switching
    document.querySelectorAll('.upload-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.upload-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
        });
    });

    // Role selection
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRole = btn.dataset.role;
        });
    });

    // File upload handling
    if (resumeUpload && resumeFile) {
        resumeUpload.addEventListener('click', () => resumeFile.click());
        resumeUpload.addEventListener('dragover', e => {
            e.preventDefault();
            resumeUpload.classList.add('dragover');
        });
        resumeUpload.addEventListener('dragleave', () => {
            resumeUpload.classList.remove('dragover');
        });
        resumeUpload.addEventListener('drop', e => {
            e.preventDefault();
            resumeUpload.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) handleFileUpload(files[0]);
        });
        resumeFile.addEventListener('change', () => {
            if (resumeFile.files.length) handleFileUpload(resumeFile.files[0]);
        });
    }

    // Text area handling
    if (resumeText) {
        resumeText.addEventListener('input', () => {
            updateTextStats(resumeText);
            analyzeBtn.disabled = !resumeText.value.trim();
        });
    }

    if (jobText) {
        jobText.addEventListener('input', () => {
            updateTextStats(jobText);
            analyzeBtn.disabled = !jobText.value.trim();
        });
    }

    // Clear buttons
    document.getElementById('clear-resume-text')?.addEventListener('click', () => {
        if (resumeText) {
            resumeText.value = '';
            updateTextStats(resumeText);
            analyzeBtn.disabled = true;
        }
    });

    document.getElementById('clear-job-text')?.addEventListener('click', () => {
        if (jobText) {
            jobText.value = '';
            updateTextStats(jobText);
            analyzeBtn.disabled = true;
        }
    });

    // Analyze button handling
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', handleAnalysis);
    }

    if (analyzeUploadedBtn) {
        analyzeUploadedBtn.addEventListener('click', () => {
            if (lastUploadedResumeId) {
                fetch(`/api/resume/${lastUploadedResumeId}/analysis`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) {
                            showNotification(data.error, 'error');
                            return;
                        }
                        // Switch to dashboard and display results
                        window.analysisData = data;
                        showSection('dashboard');
                        updateDashboardWithAnalysis();
                    })
                    .catch(err => {
                        showNotification('Failed to analyze resume: ' + err.message, 'error');
                    });
            } else {
                showNotification('Please upload a resume first', 'warning');
            }
        });
    }
}

function handleFileUpload(file) {
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showNotification('File too large. Maximum size is 10MB.', 'error');
        return;
    }

    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Invalid file type. Please upload PDF or TXT files only.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Show upload progress
    const progressEl = document.getElementById('upload-progress');
    const progressFill = progressEl?.querySelector('.progress-fill');
    const progressPercent = progressEl?.querySelector('.progress-percentage');
    const progressSteps = progressEl?.querySelectorAll('.progress-steps .step');
    
    if (progressEl) progressEl.classList.remove('hidden');
    
    let currentStep = 0;
    const updateProgress = (percent, step) => {
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressPercent) progressPercent.textContent = percent + '%';
        if (progressSteps && step !== undefined) {
            progressSteps.forEach((s, i) => {
                if (i <= step) s.classList.add('active');
                else s.classList.remove('active');
            });
        }
    };

    // Simulate progress steps
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(95, progress + 5);
        updateProgress(progress);
    }, 100);

    fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        clearInterval(progressInterval);
        if (data.error) {
            showNotification(data.error, 'error');
            if (progressEl) progressEl.classList.add('hidden');
            return;
        }
        updateProgress(100, 3);
        showNotification('Resume uploaded successfully!', 'success');
        
        // Update UI
        const fileInfo = document.getElementById('uploaded-file-info');
        if (fileInfo) fileInfo.textContent = data.filename;
        
        lastUploadedResumeId = data.resume_id;
        
        // Enable analyze button
        const analyzeBtn = document.getElementById('analyze-uploaded-btn');
        if (analyzeBtn) analyzeBtn.disabled = false;

        // Auto-hide progress after success
        setTimeout(() => {
            if (progressEl) progressEl.classList.add('hidden');
        }, 2000);
    })
    .catch(err => {
        clearInterval(progressInterval);
        if (progressEl) progressEl.classList.add('hidden');
        showNotification('Upload failed: ' + err.message, 'error');
    });
}

function handleAnalysis() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;

    const isResume = activeTab.id === 'resume-tab';
    const text = document.getElementById(isResume ? 'resume-text' : 'job-text')?.value;
    
    if (!text?.trim()) {
        showNotification('Please enter some text to analyze', 'warning');
        return;
    }

    // Show progress
    const progressEl = document.getElementById('upload-progress');
    if (progressEl) {
        progressEl.classList.remove('hidden');
        const steps = progressEl.querySelectorAll('.progress-steps .step');
        steps.forEach((step, i) => {
            if (i === 0) step.classList.add('active');
            else step.classList.remove('active');
        });
    }

    // Prepare data
    const data = new FormData();
    const blob = new Blob([text], { type: 'text/plain' });
    data.append('file', blob, 'input.txt');

    // Submit for analysis
    fetch('/api/upload-resume', {
        method: 'POST',
        body: data
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        lastUploadedResumeId = data.resume_id;
        showNotification('Text analyzed successfully!', 'success');
        
        // Switch to dashboard with results
        return fetch(`/api/resume/${data.resume_id}/analysis`);
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        window.analysisData = data;
        showSection('dashboard');
        updateDashboardWithAnalysis();
    })
    .catch(err => {
        showNotification('Analysis failed: ' + err.message, 'error');
    })
    .finally(() => {
        if (progressEl) progressEl.classList.add('hidden');
    });
}

function updateTextStats(textarea) {
    if (!textarea) return;
    
    const text = textarea.value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    
    const container = textarea.closest('.upload-text-area');
    if (!container) return;
    
    const wordCount = container.querySelector('.word-count');
    const charCount = container.querySelector('.char-count');
    
    if (wordCount) wordCount.textContent = words + ' words';
    if (charCount) charCount.textContent = chars + ' characters';
}
function initializeDashboard() {
    // Initialize charts if we're on the dashboard section
    if (currentSection !== 'dashboard') return;

    // Skill Gap Chart
    const skillGapCtx = document.getElementById('skillGapChart')?.getContext('2d');
    if (skillGapCtx) {
        skillGapChart = new Chart(skillGapCtx, {
            type: 'radar',
            data: {
                labels: ['Programming', 'Database', 'Cloud', 'DevOps', 'Frontend', 'Backend'],
                datasets: [{
                    label: 'Your Skills',
                    data: [85, 75, 65, 70, 80, 85],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointRadius: 4
                }, {
                    label: 'Job Requirements',
                    data: [90, 80, 85, 75, 85, 90],
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Skills Comparison'
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }

    // Salary Chart
    const salaryCtx = document.getElementById('salaryChart')?.getContext('2d');
    if (salaryCtx) {
        salaryChart = new Chart(salaryCtx, {
            type: 'line',
            data: {
                labels: ['Entry Level', '2-3 Years', '4-6 Years', '7-9 Years', '10+ Years'],
                datasets: [{
                    label: 'Market Average',
                    data: [60000, 75000, 90000, 110000, 130000],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Your Potential',
                    data: [65000, 82000, 98000, 120000, 140000],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Salary Progression'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    // Handle view toggles
    document.getElementById('toggleSkillGapView')?.addEventListener('click', () => {
        if (!skillGapChart) return;
        const currentType = skillGapChart.config.type;
        skillGapChart.destroy();
        
        const ctx = document.getElementById('skillGapChart').getContext('2d');
        const newType = currentType === 'radar' ? 'bar' : 'radar';
        
        skillGapChart = new Chart(ctx, {
            type: newType,
            data: skillGapChart.data,
            options: {
                ...skillGapChart.options,
                indexAxis: newType === 'bar' ? 'y' : undefined
            }
        });
    });

    document.getElementById('toggleSalaryView')?.addEventListener('click', () => {
        if (!salaryChart) return;
        const currentType = salaryChart.config.type;
        salaryChart.destroy();
        
        const ctx = document.getElementById('salaryChart').getContext('2d');
        const newType = currentType === 'line' ? 'bar' : 'line';
        
        salaryChart = new Chart(ctx, {
            type: newType,
            data: salaryChart.data,
            options: salaryChart.options
        });
    });

    // If we already have analysisData (from an upload or previous action), use it to populate the dashboard.
    if (window.analysisData) {
        try {
            updateDashboardWithAnalysis();
        } catch (err) {
            console.warn('Failed to apply in-memory analysisData to dashboard', err);
        }
        return;
    }

    // Otherwise try to fetch the latest resume and its analysis from the server so the dashboard is dynamic
    fetch('/api/resumes')
        .then(r => r.json())
        .then(listResp => {
            const resumes = listResp && listResp.resumes ? listResp.resumes : [];
            if (!resumes.length) {
                // No resumes uploaded yet; keep charts with default demo data
                return;
            }
            const latest = resumes[0];
            if (!latest || !latest.id) return;
            // Save last uploaded id so other UI can use it
            lastUploadedResumeId = latest.id;
            return fetch(`/api/resume/${latest.id}/analysis`)
                .then(r => r.json())
                .then(analysis => {
                    if (analysis && !analysis.error) {
                        window.analysisData = analysis;
                        try { updateDashboardWithAnalysis(); } catch (err) { console.warn('Failed to update dashboard with server analysis', err); }
                    }
                })
                .catch(err => console.warn('Failed to fetch resume analysis', err));
        })
        .catch(err => console.warn('Failed to fetch resumes list', err));
}
function initializeRoadmap() { /* minimal stub kept to avoid runtime errors */ }
function initializeInterview() { /* minimal stub kept to avoid runtime errors */ }
function initializeCollaboration() { /* minimal stub kept to avoid runtime errors */ }
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
function initializeNotifications() { }
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    const closeBtn = document.createElement('span');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '\u00d7';
    closeBtn.onclick = () => { notification.remove(); };
    notification.appendChild(closeBtn);
    const notificationsContainer = document.getElementById('notification-container');
    if (notificationsContainer) {
        notificationsContainer.appendChild(notification);
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 5000);
    }
}

// Expose a few helpers for tests or console use
window.initApp = initApp;
window.showSection = showSection;
