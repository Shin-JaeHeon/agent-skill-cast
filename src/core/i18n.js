import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let messages = {};

function loadLocaleFile(localePath) {
    return JSON.parse(fs.readFileSync(localePath, 'utf-8'));
}

export function initI18n(preferredLang) {
    try {
        const localeDir = path.join(__dirname, '..', 'locales');

        let lang = preferredLang;
        if (!lang) {
            lang = 'en';
            const sysLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
            if (sysLocale.startsWith('ko') || (process.env.LANG && process.env.LANG.includes('KR'))) {
                lang = 'ko';
            }
            if (process.env.ASC_LANG) lang = process.env.ASC_LANG;
        }

        const localePath = path.join(localeDir, `${lang}.json`);
        const defaultPath = path.join(localeDir, 'en.json');

        if (fs.existsSync(localePath)) {
            messages = loadLocaleFile(localePath);
        } else {
            messages = loadLocaleFile(defaultPath);
        }
    } catch (e) {
        console.error('i18n init error:', e);
        messages = {};
    }
}

export function t(key, params = {}) {
    let msg = messages[key] || key;
    for (const k of Object.keys(params)) {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    }
    return msg;
}
