import fs from 'fs';
import { log, styles, ensureDir, ciOutput, getJSONMode } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { CONFIG_FILE, DEFAULT_CONFIG, saveConfig, SOURCES_DIR } from '../core/config.js';

export async function execute() {
    let created = false;

    if (!getJSONMode()) {
        console.log(`\n   ${styles.bright}${t('header_title')}${styles.reset}\n`);
        log(t('init_msg'), styles.bright);
    }

    ensureDir(SOURCES_DIR);

    if (!fs.existsSync(CONFIG_FILE)) {
        saveConfig(DEFAULT_CONFIG);
        created = true;
        log(t('config_created', { path: CONFIG_FILE }), styles.green);
    } else {
        log(t('config_exists', { path: CONFIG_FILE }), styles.green);
    }

    if (getJSONMode()) {
        ciOutput({ created, configFile: CONFIG_FILE, sourcesDir: SOURCES_DIR });
        return;
    }

    log(t('next_steps'), styles.cyan);
    log(t('cmd_clone'));
    log(t('cmd_import'));
    log(t('cmd_use'));
}
