const fs = require('fs');
const path = require('path');
const { HOME_DIR } = require('./utils');

const CONFIG_FILE = path.join(HOME_DIR, '.asc-config.json');
const SOURCES_DIR = path.join(HOME_DIR, '.asc_sources');

const DEFAULT_CONFIG = { sources: {} };

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (config.active) delete config.active; // Cleanup legacy
        return config;
    } catch (e) {
        return { ...DEFAULT_CONFIG };
    }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

module.exports = {
    CONFIG_FILE,
    SOURCES_DIR,
    DEFAULT_CONFIG,
    loadConfig,
    saveConfig
};
