import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME_DIR = process.env.ASC_HOME || os.homedir();

export const CONFIG_FILE = path.join(HOME_DIR, '.asc-config.json');
export const SOURCES_DIR = process.env.ASC_SOURCES_DIR || path.join(HOME_DIR, '.asc_sources');

export const DEFAULT_CONFIG = { sources: {} };

export function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (config.active) delete config.active;
        if (!config.sources || typeof config.sources !== 'object') config.sources = {};
        return config;
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

export function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
