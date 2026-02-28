import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { getCIMode, getJSONMode, jsonError, jsonSuccess, setRuntimeOptions } from './runtime.js';

// --- Style utilities ---
const defaultStyles = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m'
};

export const styles = { ...defaultStyles };

function disableColors() {
    for (const key of Object.keys(styles)) {
        styles[key] = '';
    }
}

function enableColors() {
    Object.assign(styles, defaultStyles);
}

export function setCIMode(ci, json = false) {
    setRuntimeOptions({ ci, json });
    if (getCIMode()) {
        disableColors();
    } else {
        enableColors();
    }
}

export function log(msg, style = styles.reset) {
    if (getJSONMode()) return;
    if (getCIMode()) {
        fs.writeSync(1, `${msg}\n`);
        return;
    }
    console.log(`${style}${msg}${styles.reset}`);
}

export function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export const HOME_DIR = os.homedir();

export function resolveHome(filepath) {
    if (filepath.startsWith('~')) {
        return path.join(HOME_DIR, filepath.slice(1));
    }
    return path.resolve(filepath);
}

export function askQuestion(query) {
    if (getCIMode() || getJSONMode()) {
        fs.writeSync(2, `[CI Error] Interactive prompt not available in CI/JSON mode: ${query.trim()}\n`);
        process.exit(2);
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

export function ciOutput(data) {
    if (getJSONMode()) {
        jsonSuccess(data);
    }
}

export function ciError(error, message) {
    if (getJSONMode()) {
        jsonError(error, message);
    } else if (getCIMode()) {
        fs.writeSync(2, `[Error] ${message}\n`);
    }
}

export { getCIMode, getJSONMode };
