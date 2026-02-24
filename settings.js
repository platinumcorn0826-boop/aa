/**
 * settings.js — 設定管理
 * localStorage ベースの永続化
 */

const Settings = (() => {
    'use strict';

    const STORAGE_KEY = 'memento_settings';

    const DEFAULTS = {
        birthday: '1990-01-01',
        lifeExpectancy: 80,
        goalDate: '',
        goalName: '',
        theme: 'precision',
        bedtime: '23:00',
        sleepHours: 7,
        workHours: 8,
        choreHours: 2,
        commuteHours: 1
    };

    let _settings = { ...DEFAULTS };

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                _settings = { ...DEFAULTS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('設定の読み込みに失敗:', e);
            _settings = { ...DEFAULTS };
        }
        return _settings;
    }

    function save(newSettings) {
        _settings = { ...DEFAULTS, ...newSettings };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
        } catch (e) {
            console.warn('設定の保存に失敗:', e);
        }
        return _settings;
    }

    function get() {
        return { ..._settings };
    }

    function getDisposableHours() {
        const s = _settings;
        const fixed = (s.sleepHours || 0) + (s.workHours || 0) +
            (s.choreHours || 0) + (s.commuteHours || 0);
        return Math.max(0, 24 - fixed);
    }

    function getFixedHours() {
        const s = _settings;
        return (s.sleepHours || 0) + (s.workHours || 0) +
            (s.choreHours || 0) + (s.commuteHours || 0);
    }

    return { load, save, get, getDisposableHours, getFixedHours, DEFAULTS };
})();
