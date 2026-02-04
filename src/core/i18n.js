const fs = require('fs');
const path = require('path');

let messages = {};

function initI18n(preferredLang) {
    try {
        // Assume locales folder is one level up from core or handle path carefully
        // index.js is in src, config/i18n in src/core. locales in src/locales ?
        // Based on original structure: src/index.js, src/locales
        // New structure: src/core/i18n.js. Locales probably still in src/locales or move to src/core/locales?
        // Let's keep src/locales for now.
        const localeDir = path.join(__dirname, '..', 'locales');

        // Handle case where this might be called from a different context
        if (!fs.existsSync(localeDir) && fs.existsSync(path.join(__dirname, '..', '..', 'locales'))) {
            // Fallback if needed, but standard should be src/locales
        }

        let lang = preferredLang;

        if (!lang) {
            lang = 'en'; // Default fallback
            const sysLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
            if (sysLocale.startsWith('ko') || (process.env.LANG && process.env.LANG.includes('KR'))) {
                lang = 'ko';
            }
            if (process.env.ASC_LANG) lang = process.env.ASC_LANG;
        }

        const localePath = path.join(localeDir, `${lang}.json`);
        const defaultPath = path.join(localeDir, 'en.json');

        if (fs.existsSync(localePath)) {
            messages = require(localePath);
        } else {
            messages = require(defaultPath);
        }
    } catch (e) {
        console.error("i18n init error:", e);
        messages = {};
    }
}

function t(key, params = {}) {
    let msg = messages[key] || key;
    for (const k of Object.keys(params)) {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    }
    return msg;
}

module.exports = {
    initI18n,
    t
};
