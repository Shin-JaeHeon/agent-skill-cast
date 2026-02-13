const fs = require('fs');
const { log, styles, ensureDir } = require('../core/utils');
const { t } = require('../core/i18n');
const { CONFIG_FILE, DEFAULT_CONFIG, saveConfig, SOURCES_DIR } = require('../core/config');

async function execute() {
    console.log(`\n   ${styles.bright}${t('header_title')}${styles.reset}\n`);
    log(t('init_msg'), styles.bright);

    ensureDir(SOURCES_DIR);

    if (!fs.existsSync(CONFIG_FILE)) {
        saveConfig(DEFAULT_CONFIG);
        log(t('config_created', { path: CONFIG_FILE }), styles.green);
    } else {
        log(t('config_exists', { path: CONFIG_FILE }), styles.green);
    }

    log(t('next_steps'), styles.cyan);
    log(t('cmd_clone'));
    log(t('cmd_import'));
    log(t('cmd_use'));
}

module.exports = { execute };
