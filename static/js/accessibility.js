// Voice Input System
class VoiceInputSystem {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentTextArea = null;
        this.voiceStatus = document.getElementById('voice-status');
        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.setupRecognitionOptions();
            this.setupRecognitionEvents();
        } else {
            console.warn('Speech recognition not supported');
            document.querySelectorAll('.voice-btn').forEach(btn => {
                btn.disabled = true;
                btn.title = 'Speech recognition not supported in this browser';
            });
        }
    }

    setupRecognitionOptions() {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
    }

    setupRecognitionEvents() {
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceStatus(true);
            if (this.currentTextArea) {
                this.currentTextArea.classList.add('recording');
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceStatus(false);
            if (this.currentTextArea) {
                this.currentTextArea.classList.remove('recording');
            }
        };

        this.recognition.onresult = (event) => {
            if (!this.currentTextArea) return;

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                const currentValue = this.currentTextArea.value;
                const cursorPosition = this.currentTextArea.selectionStart;
                this.currentTextArea.value = 
                    currentValue.substring(0, cursorPosition) +
                    finalTranscript +
                    currentValue.substring(this.currentTextArea.selectionEnd);
                
                // Update cursor position
                this.currentTextArea.selectionStart = 
                    this.currentTextArea.selectionEnd = 
                    cursorPosition + finalTranscript.length;

                // Trigger input event for any listeners
                this.currentTextArea.dispatchEvent(new Event('input'));
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.updateVoiceStatus(false);
            showNotification(`Voice input error: ${event.error}`, 'error');
        };
    }

    updateVoiceStatus(isActive) {
        if (this.voiceStatus) {
            this.voiceStatus.classList.toggle('hidden', !isActive);
            const voiceText = this.voiceStatus.querySelector('.voice-text');
            if (voiceText) {
                voiceText.textContent = isActive ? 'Listening...' : '';
            }
        }
    }

    startListening(textArea) {
        if (!this.recognition) return;

        if (this.isListening) {
            this.stopListening();
            return;
        }

        this.currentTextArea = textArea;
        try {
            this.recognition.start();
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
            showNotification('Failed to start voice input', 'error');
        }
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;

        try {
            this.recognition.stop();
        } catch (e) {
            console.error('Failed to stop speech recognition:', e);
        }
        this.currentTextArea = null;
    }
}

// Accessibility System
class AccessibilitySystem {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.currentFontSize = localStorage.getItem('fontSize') || 'medium';
        this.init();
    }

    init() {
        this.setupThemeToggle();
        this.setupFontSizeControls();
        this.setupVoiceToggle();
        this.applyStoredPreferences();
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('toggle-theme');
        const themeIcon = document.getElementById('theme-icon');
        
        if (themeToggle && themeIcon) {
            themeToggle.addEventListener('click', () => {
                this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
                this.applyTheme();
                localStorage.setItem('theme', this.currentTheme);
            });
        }
    }

    setupFontSizeControls() {
        const increaseFont = document.getElementById('increase-font');
        const decreaseFont = document.getElementById('decrease-font');

        if (increaseFont) {
            increaseFont.addEventListener('click', () => {
                this.adjustFontSize('increase');
            });
        }

        if (decreaseFont) {
            decreaseFont.addEventListener('click', () => {
                this.adjustFontSize('decrease');
            });
        }
    }

    setupVoiceToggle() {
        const voiceToggle = document.getElementById('voice-toggle');
        if (voiceToggle) {
            voiceToggle.addEventListener('click', () => {
                const isEnabled = voiceToggle.classList.toggle('active');
                showNotification(
                    `Voice input ${isEnabled ? 'enabled' : 'disabled'}`,
                    'info'
                );
            });
        }
    }

    applyStoredPreferences() {
        this.applyTheme();
        this.applyFontSize();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }

    adjustFontSize(action) {
        const sizes = ['small', 'medium', 'large', 'x-large'];
        let currentIndex = sizes.indexOf(this.currentFontSize);
        
        if (action === 'increase' && currentIndex < sizes.length - 1) {
            currentIndex++;
        } else if (action === 'decrease' && currentIndex > 0) {
            currentIndex--;
        }

        this.currentFontSize = sizes[currentIndex];
        this.applyFontSize();
        localStorage.setItem('fontSize', this.currentFontSize);
        showNotification(`Font size set to ${this.currentFontSize}`, 'info');
    }

    applyFontSize() {
        document.documentElement.style.setProperty(
            '--base-font-size',
            this.getFontSizeValue()
        );
    }

    getFontSizeValue() {
        const sizemap = {
            'small': '14px',
            'medium': '16px',
            'large': '18px',
            'x-large': '20px'
        };
        return sizemap[this.currentFontSize] || '16px';
    }
}

// Initialize systems when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.voiceInput = new VoiceInputSystem();
    window.accessibility = new AccessibilitySystem();
});