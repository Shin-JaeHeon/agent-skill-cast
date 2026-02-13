const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

// --- CI Mode ---
let _ciMode = false;
let _jsonMode = false;

function setCIMode(ci, json = false) {
    _ciMode = ci;
    _jsonMode = json;
    if (ci) disableColors();
}

function getCIMode() { return _ciMode; }
function getJSONMode() { return _jsonMode; }

// --- 스타일 유틸리티 ---
const styles = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
};

function disableColors() {
    for (const key of Object.keys(styles)) {
        styles[key] = '';
    }
}

function log(msg, style = styles.reset) {
    console.log(`${style}${msg}${styles.reset}`);
}

function runCmd(command, cwd = process.cwd(), ignoreError = false) {
    try {
        return execSync(command, { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
    } catch (error) {
        if (!ignoreError) throw error;
        return null;
    }
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

const HOME_DIR = os.homedir();

function resolveHome(filepath) {
    if (filepath.startsWith('~')) {
        return path.join(HOME_DIR, filepath.slice(1));
    }
    return path.resolve(filepath);
}

function askQuestion(query) {
    if (_ciMode) {
        console.error(`[CI Error] Interactive prompt not available in CI mode: ${query.trim()}`);
        process.exit(2);
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// --- CI Output Helpers ---
function ciOutput(data) {
    if (_jsonMode) {
        console.log(JSON.stringify({ ok: true, data }, null, 2));
    }
}

function ciError(error, message) {
    if (_jsonMode) {
        console.log(JSON.stringify({ ok: false, error, message }, null, 2));
    } else if (_ciMode) {
        console.error(`[Error] ${message}`);
    }
}

module.exports = {
    styles,
    log,
    runCmd,
    ensureDir,
    resolveHome,
    askQuestion,
    HOME_DIR,
    setCIMode,
    getCIMode,
    getJSONMode,
    ciOutput,
    ciError
};
