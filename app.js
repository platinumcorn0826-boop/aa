/**
 * app.js — メインアプリケーション
 * 初期化、イベントバインド、描画ループ
 */

(() => {
    'use strict';

    // --- State ---
    let currentMode = 'day';
    let currentUnit = 'seconds';
    let isDisposableFilter = false;
    let settings = {};
    let animFrameId = null;
    let lastSecond = -1;
    let milestoneCheckInterval = null;

    // --- DOM Elements ---
    const els = {};

    function cacheDom() {
        els.modeTabs = document.getElementById('modeTabs');
        els.unitSelector = document.getElementById('unitSelector');
        els.countNumber = document.getElementById('countNumber');
        els.countdownUnit = document.getElementById('countdownUnit');
        els.countdownContext = document.getElementById('countdownContext');
        els.progressCircleFill = document.getElementById('progressCircleFill');
        els.progressPercent = document.getElementById('progressPercent');
        els.progressElapsed = document.getElementById('progressElapsed');
        els.progressRemaining = document.getElementById('progressRemaining');
        // Hourglass
        els.hourglassTopRect = document.getElementById('hourglassTopRect');
        els.hourglassBottomRect = document.getElementById('hourglassBottomRect');
        els.sandStream = document.getElementById('sandStream');

        els.disposableToggle = document.getElementById('disposableToggle');
        els.filterHint = document.getElementById('filterHint');
        els.statDays = document.getElementById('statDays');
        els.statHours = document.getElementById('statHours');
        els.statMinutes = document.getElementById('statMinutes');
        els.statSeconds = document.getElementById('statSeconds');
        els.messageText = document.getElementById('messageText');

        // Settings
        els.settingsBtn = document.getElementById('settingsBtn');
        els.settingsPanel = document.getElementById('settingsPanel');
        els.settingsOverlay = document.getElementById('settingsOverlay');
        els.closeSettings = document.getElementById('closeSettings');
        els.birthday = document.getElementById('birthday');
        els.goalDate = document.getElementById('goalDate');
        els.goalName = document.getElementById('goalName');
        els.lifeExpectancy = document.getElementById('lifeExpectancy');
        els.lifeExpValue = document.getElementById('lifeExpValue');
        els.bedtime = document.getElementById('bedtime');
        els.sleepHours = document.getElementById('sleepHours');
        els.sleepValue = document.getElementById('sleepValue');
        els.workHours = document.getElementById('workHours');
        els.workValue = document.getElementById('workValue');
        els.choreHours = document.getElementById('choreHours');
        els.choreValue = document.getElementById('choreValue');
        els.commuteHours = document.getElementById('commuteHours');
        els.commuteValue = document.getElementById('commuteValue');
        els.fixedTotal = document.getElementById('fixedTotal');
        els.disposableHours = document.getElementById('disposableHours');
        els.themeRadios = document.getElementsByName('theme');
    }

    // --- Event Binding ---
    function bindEvents() {
        // Mode tabs
        els.modeTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.mode-tab');
            if (!tab) return;

            const mode = tab.dataset.mode;
            if (mode === currentMode) return;

            currentMode = mode;
            updateModeUI();
            triggerPulse();
        });

        // Unit selector
        els.unitSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.unit-btn');
            if (!btn) return;

            const unit = btn.dataset.unit;
            if (unit === currentUnit) return;

            currentUnit = unit;
            updateUnitUI();
            triggerPulse();
        });

        // Disposable filter toggle
        els.disposableToggle.addEventListener('change', () => {
            isDisposableFilter = els.disposableToggle.checked;
            els.filterHint.textContent = isDisposableFilter ? '自由時間のみ' : '全時間';
            triggerPulse();
        });

        // Settings panel
        els.settingsBtn.addEventListener('click', openSettings);
        els.closeSettings.addEventListener('click', closeSettings);
        els.settingsOverlay.addEventListener('click', closeSettings);

        els.birthday.addEventListener('change', saveSettingsFromUI);
        els.bedtime.addEventListener('change', saveSettingsFromUI);
        els.goalDate.addEventListener('change', saveSettingsFromUI);
        els.goalName.addEventListener('input', saveSettingsFromUI);

        // Theme selection
        els.themeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                applyTheme(radio.value);
                saveSettingsFromUI();
            });
        });

        // Range sliders
        const rangeInputs = [
            { el: els.lifeExpectancy, display: els.lifeExpValue, key: 'lifeExpectancy' },
            { el: els.sleepHours, display: els.sleepValue, key: 'sleepHours' },
            { el: els.workHours, display: els.workValue, key: 'workHours' },
            { el: els.choreHours, display: els.choreValue, key: 'choreHours' },
            { el: els.commuteHours, display: els.commuteValue, key: 'commuteHours' }
        ];

        rangeInputs.forEach(({ el, display }) => {
            el.addEventListener('input', () => {
                display.textContent = el.value;
                updateDisposableSummary();
                saveSettingsFromUI();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const modes = ['day', 'week', 'month', 'year', 'life'];
            if (e.key >= '1' && e.key <= '5') {
                currentMode = modes[parseInt(e.key) - 1];
                updateModeUI();
                triggerPulse();
            }
        });
    }

    // --- Settings ---
    function openSettings() {
        els.settingsPanel.classList.add('active');
        els.settingsOverlay.classList.add('active');
    }

    function closeSettings() {
        els.settingsPanel.classList.remove('active');
        els.settingsOverlay.classList.remove('active');
    }

    function populateSettingsUI() {
        els.birthday.value = settings.birthday || Settings.DEFAULTS.birthday;
        els.goalDate.value = settings.goalDate || '';
        els.goalName.value = settings.goalName || '';
        els.lifeExpectancy.value = settings.lifeExpectancy || Settings.DEFAULTS.lifeExpectancy;
        els.lifeExpValue.textContent = settings.lifeExpectancy || Settings.DEFAULTS.lifeExpectancy;
        els.bedtime.value = settings.bedtime || Settings.DEFAULTS.bedtime;
        els.sleepHours.value = settings.sleepHours || Settings.DEFAULTS.sleepHours;
        els.sleepValue.textContent = settings.sleepHours || Settings.DEFAULTS.sleepHours;
        els.workHours.value = settings.workHours || Settings.DEFAULTS.workHours;
        els.workValue.textContent = settings.workHours || Settings.DEFAULTS.workHours;
        els.choreHours.value = settings.choreHours || Settings.DEFAULTS.choreHours;
        els.choreValue.textContent = settings.choreHours || Settings.DEFAULTS.choreHours;
        els.commuteHours.value = settings.commuteHours || Settings.DEFAULTS.commuteHours;
        els.commuteValue.textContent = settings.commuteHours || Settings.DEFAULTS.commuteHours;

        // Theme
        const theme = settings.theme || Settings.DEFAULTS.theme;
        els.themeRadios.forEach(radio => {
            radio.checked = (radio.value === theme);
        });

        updateDisposableSummary();
    }

    function applyTheme(themeName) {
        // Remove old theme classes
        document.body.classList.remove('theme-precision', 'theme-zen', 'theme-obsidian');
        // Add new one
        document.body.classList.add(`theme-${themeName}`);
    }

    function saveSettingsFromUI() {
        const selectedTheme = Array.from(els.themeRadios).find(r => r.checked)?.value || 'precision';

        settings = Settings.save({
            birthday: els.birthday.value,
            goalDate: els.goalDate.value,
            goalName: els.goalName.value,
            theme: selectedTheme,
            lifeExpectancy: parseInt(els.lifeExpectancy.value),
            bedtime: els.bedtime.value,
            sleepHours: parseFloat(els.sleepHours.value),
            workHours: parseFloat(els.workHours.value),
            choreHours: parseFloat(els.choreHours.value),
            commuteHours: parseFloat(els.commuteHours.value)
        });
    }

    function updateDisposableSummary() {
        const sleep = parseFloat(els.sleepHours.value) || 0;
        const work = parseFloat(els.workHours.value) || 0;
        const chore = parseFloat(els.choreHours.value) || 0;
        const commute = parseFloat(els.commuteHours.value) || 0;
        const fixed = sleep + work + chore + commute;
        const disposable = Math.max(0, 24 - fixed);

        els.fixedTotal.textContent = fixed;
        els.disposableHours.textContent = disposable;
    }

    // --- UI Updates ---
    function updateModeUI() {
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === currentMode);
        });
    }

    function updateUnitUI() {
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === currentUnit);
        });
    }

    function triggerPulse() {
        els.countNumber.classList.remove('pulse');
        // Force reflow
        void els.countNumber.offsetWidth;
        els.countNumber.classList.add('pulse');
    }

    // --- Render Loop ---
    function render() {
        const result = Countdown.calculate(currentMode, settings, isDisposableFilter);

        // Main number
        const displayValue = Countdown.convertToUnit(result.remainingMs, currentUnit);
        els.countNumber.textContent = displayValue;

        // Unit label
        els.countdownUnit.textContent = Countdown.getUnitLabel(currentUnit) + ' 残り';

        // Context text
        els.countdownContext.textContent = result.contextText;

        // Circular progress
        const elapsedPct = (result.elapsedRatio * 100).toFixed(1);
        const remainingPct = (100 - result.elapsedRatio * 100).toFixed(1);
        const circumference = 2 * Math.PI * 88; // r=88
        const remainingRatio = 1 - result.elapsedRatio;
        const dashOffset = circumference * (1 - remainingRatio);
        els.progressCircleFill.style.strokeDasharray = circumference;
        els.progressCircleFill.style.strokeDashoffset = dashOffset;
        els.progressPercent.textContent = `${remainingPct}%`;
        els.progressElapsed.textContent = `経過 ${elapsedPct}%`;
        els.progressRemaining.textContent = `残り ${remainingPct}%`;

        // Hourglass logic (only if Zen theme)
        if (settings.theme === 'zen') {
            const remainingRatio = 1 - result.elapsedRatio;
            // Top: 0 to 80 height
            const topHeight = remainingRatio * 75; // 75 is max height for one bulb
            els.hourglassTopRect.setAttribute('height', topHeight);
            els.hourglassTopRect.setAttribute('y', 80 - topHeight);

            // Bottom: 0 to 80 height
            const bottomHeight = result.elapsedRatio * 75;
            els.hourglassBottomRect.setAttribute('height', bottomHeight);
            els.hourglassBottomRect.setAttribute('y', 155 - bottomHeight);

            // Stream visibility
            els.sandStream.style.opacity = (remainingRatio > 0 && remainingRatio < 1) ? 0.6 : 0;
        }

        // Sub stats (decomposed)
        const decomposed = Countdown.decompose(result.remainingMs);
        els.statDays.textContent = decomposed.days.toLocaleString();
        els.statHours.textContent = decomposed.hours.toString().padStart(2, '0');
        els.statMinutes.textContent = decomposed.minutes.toString().padStart(2, '0');
        els.statSeconds.textContent = decomposed.seconds.toString().padStart(2, '0');

        // Dynamic colors
        const colors = Countdown.getColorForRatio(result.elapsedRatio);
        const root = document.documentElement;
        root.style.setProperty('--accent', colors.color);
        root.style.setProperty('--accent-glow', colors.glow);
        root.style.setProperty('--accent-gradient', colors.gradient);
        root.style.setProperty('--progress-color', colors.color);

        // Pulse on second change
        const currentSecond = Math.floor(result.remainingMs / 1000);
        if (currentSecond !== lastSecond) {
            lastSecond = currentSecond;
            // Subtle pulse only on minute boundaries in seconds mode
            if (currentUnit === 'seconds' && currentSecond % 60 === 0) {
                triggerPulse();
            }
        }

        // Motivational message
        updateMessage(result.elapsedRatio);

        animFrameId = requestAnimationFrame(render);
    }

    function updateMessage(elapsedRatio) {
        const remaining = 1 - elapsedRatio;
        const messages = {
            high: [
                'まだ時間はある。しかし、それは無限ではない。',
                '今日できることを明日に延ばすな。',
                '一歩を踏み出すなら、今。'
            ],
            mid: [
                '折り返し地点。ここからが本番。',
                '残り半分。密度を上げよう。',
                'まだ挽回できる。集中せよ。'
            ],
            low: [
                '残りわずか。本当に大切なことに集中を。',
                '時間は待ってくれない。今、動け。',
                '残された時間で何ができるか。'
            ],
            critical: [
                '秒を刻む音が聞こえるか。',
                'あと少し。最後まで全力で。',
                '時間は資源。最後の一滴まで使い切れ。'
            ]
        };

        let pool;
        if (remaining > 0.7) pool = messages.high;
        else if (remaining > 0.4) pool = messages.mid;
        else if (remaining > 0.15) pool = messages.low;
        else pool = messages.critical;

        // Change message every 30 seconds
        const idx = Math.floor(Date.now() / 30000) % pool.length;
        els.messageText.textContent = pool[idx];
    }

    // --- Milestones Check ---
    function checkMilestones() {
        const result = Countdown.calculate(currentMode, settings, isDisposableFilter);
        const notifications = Milestones.check(currentMode, result, settings);

        notifications.forEach(notif => {
            Milestones.markShown(notif.id);
            Milestones.showToast(notif.icon, notif.message);
        });
    }

    // --- Init ---
    function init() {
        cacheDom();

        // Load settings
        settings = Settings.load();

        // Load milestones
        Milestones.load();

        // Populate settings UI
        populateSettingsUI();

        // Apply initial theme
        applyTheme(settings.theme || Settings.DEFAULTS.theme);

        // Bind events
        bindEvents();

        // Update UI state
        updateModeUI();
        updateUnitUI();

        // Start render loop
        render();

        // Check milestones every 60 seconds
        checkMilestones();
        milestoneCheckInterval = setInterval(checkMilestones, 60000);

        // PWA: URLパラメータでモードを初期設定
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        if (modeParam && ['day', 'week', 'month', 'year', 'life', 'goal'].includes(modeParam)) {
            currentMode = modeParam;
            updateModeUI();
        }

        // PWA: Service Worker登録
        registerServiceWorker();

        console.log('MEMENTO initialized');
    }

    // --- Service Worker & 通知 ---
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register('/js/sw.js', { scope: '/' })
            .then((reg) => {
                console.log('SW registered:', reg.scope);
                schedulePeriodicSync(reg);
            })
            .catch((err) => console.warn('SW registration failed:', err));
    }

    async function schedulePeriodicSync(reg) {
        if (!('periodicSync' in reg)) return;
        try {
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (status.state === 'granted') {
                await reg.periodicSync.register('daily-reminder', { minInterval: 24 * 60 * 60 * 1000 });
            }
        } catch (e) { /* not supported */ }
    }

    function requestNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') return;
        if (Notification.permission === 'denied') return;

        // 初回起動から5秒後に許可を求める
        setTimeout(() => {
            Notification.requestPermission().then((perm) => {
                if (perm === 'granted') {
                    new Notification('MEMENTO 通知を許可しました', {
                        body: 'マイルストーン到達時にお知らせします。',
                        icon: '/icons/icon-192.png',
                        tag: 'welcome'
                    });
                }
            });
        }, 5000);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
