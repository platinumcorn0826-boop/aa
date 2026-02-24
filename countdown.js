/**
 * countdown.js — カウントダウン計算ロジック
 * 5つのモード: Life / Year / Month / Week / Day
 * 可処分時間フィルタ対応
 */

const Countdown = (() => {
    'use strict';

    /**
     * 指定モードの残り時間（ミリ秒）と経過率を計算
     * @param {string} mode - 'life' | 'year' | 'month' | 'week' | 'day'
     * @param {object} settings - ユーザー設定
     * @param {boolean} useDisposable - 可処分時間フィルタを使用するか
     * @returns {{ remainingMs: number, elapsedRatio: number, totalMs: number, contextText: string }}
     */
    function calculate(mode, settings, useDisposable = false) {
        const now = new Date();

        let result;
        switch (mode) {
            case 'life': result = calcLife(now, settings); break;
            case 'year': result = calcYear(now); break;
            case 'month': result = calcMonth(now); break;
            case 'week': result = calcWeek(now); break;
            case 'day': result = calcDay(now, settings); break;
            case 'goal': result = calcGoal(now, settings); break;
            default: result = calcDay(now, settings);
        }

        // 可処分時間フィルタ適用
        if (useDisposable) {
            result = applyDisposableFilter(result, mode, settings, now);
        }

        return result;
    }

    // --- Life ---
    function calcLife(now, settings) {
        const birthday = settings.birthday ? new Date(settings.birthday) : new Date('1990-01-01');
        const lifeExpectancy = settings.lifeExpectancy || 80;

        const deathDate = new Date(birthday);
        deathDate.setFullYear(deathDate.getFullYear() + lifeExpectancy);

        const totalMs = deathDate.getTime() - birthday.getTime();
        const elapsedMs = now.getTime() - birthday.getTime();
        const remainingMs = Math.max(0, deathDate.getTime() - now.getTime());

        const age = Math.floor(elapsedMs / (365.25 * 24 * 60 * 60 * 1000));

        return {
            remainingMs,
            elapsedRatio: Math.min(1, elapsedMs / totalMs),
            totalMs,
            contextText: `${age}歳 → ${lifeExpectancy}歳まで`
        };
    }

    // --- Year ---
    function calcYear(now) {
        const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        const totalMs = yearEnd.getTime() - yearStart.getTime();
        const elapsedMs = now.getTime() - yearStart.getTime();
        const remainingMs = Math.max(0, yearEnd.getTime() - now.getTime());

        return {
            remainingMs,
            elapsedRatio: Math.min(1, elapsedMs / totalMs),
            totalMs,
            contextText: `${now.getFullYear()}年 12月31日まで`
        };
    }

    // --- Month ---
    function calcMonth(now) {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59, 999);

        const totalMs = monthEnd.getTime() - monthStart.getTime();
        const elapsedMs = now.getTime() - monthStart.getTime();
        const remainingMs = Math.max(0, monthEnd.getTime() - now.getTime());

        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'];

        return {
            remainingMs,
            elapsedRatio: Math.min(1, elapsedMs / totalMs),
            totalMs,
            contextText: `${monthNames[now.getMonth()]} ${lastDay}日まで`
        };
    }

    // --- Week ---
    function calcWeek(now) {
        const dayOfWeek = now.getDay(); // 0=Sun
        // 月曜を週の開始とする
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const totalMs = weekEnd.getTime() - weekStart.getTime();
        const elapsedMs = now.getTime() - weekStart.getTime();
        const remainingMs = Math.max(0, weekEnd.getTime() - now.getTime());

        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

        return {
            remainingMs,
            elapsedRatio: Math.min(1, elapsedMs / totalMs),
            totalMs,
            contextText: `今週（${dayNames[now.getDay()]}曜日）→ 日曜まで`
        };
    }

    // --- Day ---
    function calcDay(now, settings) {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);

        let dayEnd;
        if (settings.bedtime) {
            const [h, m] = settings.bedtime.split(':').map(Number);
            dayEnd = new Date(now);
            dayEnd.setHours(h, m, 0, 0);
            // 就寝時刻を過ぎている場合は翌日の就寝時刻
            if (now >= dayEnd) {
                dayEnd.setDate(dayEnd.getDate() + 1);
            }
        } else {
            dayEnd = new Date(now);
            dayEnd.setHours(23, 59, 59, 999);
        }

        const totalMs = dayEnd.getTime() - dayStart.getTime();
        const elapsedMs = now.getTime() - dayStart.getTime();
        const remainingMs = Math.max(0, dayEnd.getTime() - now.getTime());

        const endLabel = settings.bedtime ? `就寝 ${settings.bedtime}` : '23:59';

        return {
            remainingMs,
            elapsedRatio: Math.min(1, elapsedMs / totalMs),
            totalMs,
            contextText: `今日 → ${endLabel} まで`
        };
    }

    // --- Goal ---
    function calcGoal(now, settings) {
        const goalDate = settings.goalDate ? new Date(settings.goalDate + 'T23:59:59') : null;
        if (!goalDate || isNaN(goalDate.getTime())) {
            return {
                remainingMs: 0,
                elapsedRatio: 0,
                totalMs: 1,
                contextText: '設定から目標日を設定してください'
            };
        }

        const goalName = settings.goalName || '目標日';
        const remainingMs = Math.max(0, goalDate.getTime() - now.getTime());

        // 開始日を「今日」とするのではなく、設定された時点からの経過を見る
        // 簡易的に、目標日までの全期間を「今日の始まり〜目標日」とする
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const totalMs = goalDate.getTime() - todayStart.getTime();
        const elapsedMs = now.getTime() - todayStart.getTime();

        const formatter = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

        return {
            remainingMs,
            elapsedRatio: totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0,
            totalMs,
            contextText: `${goalName} — ${formatter.format(goalDate)} まで`
        };
    }

    // --- 可処分時間フィルタ ---
    function applyDisposableFilter(result, mode, settings, now) {
        const sleepH = settings.sleepHours || 7;
        const workH = settings.workHours || 8;
        const choreH = settings.choreHours || 2;
        const commuteH = settings.commuteHours || 1;
        const fixedH = sleepH + workH + choreH + commuteH;
        const disposableH = Math.max(0, 24 - fixedH);
        const disposableRatio = disposableH / 24;

        // 残り時間に可処分時間比率を掛ける
        const filteredRemaining = result.remainingMs * disposableRatio;

        // 合計時間も調整
        const filteredTotal = result.totalMs * disposableRatio;
        const filteredElapsed = filteredTotal - filteredRemaining;

        return {
            remainingMs: filteredRemaining,
            elapsedRatio: filteredTotal > 0 ? Math.min(1, filteredElapsed / filteredTotal) : 0,
            totalMs: filteredTotal,
            contextText: result.contextText + `（自分の時間 ${disposableH}h/日）`
        };
    }

    /**
     * ミリ秒を指定単位に変換
     * @param {number} ms - ミリ秒
     * @param {string} unit - 'years' | 'days' | 'hours' | 'minutes' | 'seconds'
     * @returns {string} フォーマット済み数値
     */
    function convertToUnit(ms, unit) {
        if (ms <= 0) return '0';

        const seconds = ms / 1000;
        const minutes = seconds / 60;
        const hours = minutes / 60;
        const days = hours / 24;
        const years = days / 365.25;

        switch (unit) {
            case 'years': return years.toFixed(6);
            case 'days': return days.toFixed(4);
            case 'hours': return hours.toFixed(4);
            case 'minutes': return minutes.toFixed(2);
            case 'seconds': return Math.floor(seconds).toLocaleString();
            default: return Math.floor(seconds).toLocaleString();
        }
    }

    /**
     * ミリ秒を日・時・分・秒の分解に変換
     */
    function decompose(ms) {
        if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

        const totalSec = Math.floor(ms / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;

        return { days, hours, minutes, seconds };
    }

    /**
     * 経過率に基づいてアクセントカラーを決定
     * @param {number} elapsedRatio - 0.0 ~ 1.0
     * @returns {{ color: string, glow: string, gradient: string }}
     */
    function getColorForRatio(elapsedRatio) {
        // remainingRatio = 1 - elapsedRatio
        const remaining = 1 - elapsedRatio;

        if (remaining > 0.8) {
            return {
                color: '#00d4ff',
                glow: 'rgba(0, 212, 255, 0.15)',
                gradient: 'linear-gradient(135deg, #00d4ff, #0099ff)'
            };
        } else if (remaining > 0.5) {
            // Cyan → Green transition
            const t = (remaining - 0.5) / 0.3;
            return {
                color: lerpColor('#a0d911', '#00d4ff', t),
                glow: `rgba(160, 217, 17, ${0.15})`,
                gradient: 'linear-gradient(135deg, #a0d911, #52c41a)'
            };
        } else if (remaining > 0.2) {
            // Green → Orange transition
            const t = (remaining - 0.2) / 0.3;
            return {
                color: lerpColor('#ff9500', '#a0d911', t),
                glow: 'rgba(255, 149, 0, 0.15)',
                gradient: 'linear-gradient(135deg, #ff9500, #ff6a00)'
            };
        } else {
            // Orange → Red
            const t = remaining / 0.2;
            return {
                color: lerpColor('#ff3b5c', '#ff9500', t),
                glow: 'rgba(255, 59, 92, 0.2)',
                gradient: 'linear-gradient(135deg, #ff3b5c, #ff1744)'
            };
        }
    }

    function lerpColor(a, b, t) {
        const ah = parseInt(a.replace('#', ''), 16);
        const bh = parseInt(b.replace('#', ''), 16);
        const ar = (ah >> 16) & 0xFF, ag = (ah >> 8) & 0xFF, ab = ah & 0xFF;
        const br = (bh >> 16) & 0xFF, bg = (bh >> 8) & 0xFF, bb = bh & 0xFF;
        const rr = Math.round(ar + (br - ar) * t);
        const rg = Math.round(ag + (bg - ag) * t);
        const rb = Math.round(ab + (bb - ab) * t);
        return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
    }

    /**
     * 単位名（日本語）を取得
     */
    function getUnitLabel(unit) {
        const labels = {
            years: '年',
            days: '日',
            hours: '時間',
            minutes: '分',
            seconds: '秒'
        };
        return labels[unit] || '秒';
    }

    return {
        calculate,
        convertToUnit,
        decompose,
        getColorForRatio,
        getUnitLabel
    };
})();
