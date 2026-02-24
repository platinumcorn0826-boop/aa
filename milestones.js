/**
 * milestones.js — マイルストーン通知
 * 定期的な振り返りを促すプッシュ通知風トースト
 */

const Milestones = (() => {
    'use strict';

    const STORAGE_KEY = 'memento_milestones_shown';

    // 表示済み通知を管理
    let _shownIds = new Set();

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                _shownIds = new Set(JSON.parse(saved));
            }
        } catch (e) {
            _shownIds = new Set();
        }
        // 日付が変わったらリセット（日次通知のため）
        const today = new Date().toISOString().split('T')[0];
        const lastDate = localStorage.getItem('memento_milestone_date');
        if (lastDate !== today) {
            _shownIds = new Set();
            localStorage.setItem('memento_milestone_date', today);
            saveShown();
        }
    }

    function saveShown() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([..._shownIds]));
        } catch (e) { /* ignore */ }
    }

    function wasShown(id) {
        return _shownIds.has(id);
    }

    function markShown(id) {
        _shownIds.add(id);
        saveShown();
    }

    /**
     * 現在のカウントダウン結果を元にマイルストーンをチェック
     * @param {string} mode
     * @param {object} countdownResult
     * @param {object} settings
     * @returns {Array<{id: string, icon: string, message: string}>}
     */
    function check(mode, countdownResult, settings) {
        const notifications = [];
        const { elapsedRatio } = countdownResult;
        const percent = Math.floor(elapsedRatio * 100);

        // パーセンテージマイルストーン
        const percentMilestones = [25, 50, 75, 90, 95];
        for (const p of percentMilestones) {
            const id = `${mode}_${p}pct`;
            if (percent >= p && !wasShown(id)) {
                const modeLabels = {
                    life: '人生', year: '今年', month: '今月', week: '今週', day: '今日'
                };
                notifications.push({
                    id,
                    icon: p >= 90 ? '🔥' : p >= 75 ? '⚡' : '📊',
                    message: `${modeLabels[mode]}の ${p}% が経過しました。残り ${100 - p}%。`
                });
            }
        }

        // 人生モード特有のマイルストーン
        if (mode === 'life' && settings.birthday) {
            const birthday = new Date(settings.birthday);
            const now = new Date();
            const ageMs = now.getTime() - birthday.getTime();
            const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

            // 1000日ごと
            const thousandDays = Math.floor(ageDays / 1000) * 1000;
            if (thousandDays > 0) {
                const id = `life_${thousandDays}days`;
                if (!wasShown(id)) {
                    notifications.push({
                        id,
                        icon: '🎯',
                        message: `人生の ${thousandDays.toLocaleString()} 日が過ぎました。一日一日を大切に。`
                    });
                }
            }

            // 10歳ごとの節目
            const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
            const decadeAge = Math.floor(ageYears / 10) * 10;
            if (decadeAge >= 20) {
                const id = `life_${decadeAge}age`;
                if (!wasShown(id)) {
                    notifications.push({
                        id,
                        icon: '🏆',
                        message: `${decadeAge}代。次の10年をどう過ごしますか？`
                    });
                }
            }
        }

        return notifications;
    }

    /**
     * トースト通知を表示
     * @param {string} icon
     * @param {string} message
     * @param {number} duration - ms
     */
    function showToast(icon, message, duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return { load, check, markShown, showToast };
})();
