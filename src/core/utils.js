const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

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
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

module.exports = {
    styles,
    log,
    runCmd,
    ensureDir,
    resolveHome,
    askQuestion,
    HOME_DIR
};
