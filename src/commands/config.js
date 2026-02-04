const { log, styles } = require('../core/utils');
const { t } = require('../core/i18n');
const { saveConfig } = require('../core/config');
const { initI18n } = require('../core/i18n'); // Needed to reload language

async function execute(args, config) {
    const key = args[0];
    const value = args[1];

    if (key === 'lang') {
        if (['en', 'ko'].includes(value)) {
            config.lang = value;
            saveConfig(config);
            // 즉시 언어 변경 반영
            initI18n(value);
            log(t('success_config_set', { key, value }), styles.green);
        } else {
            log(t('error_config_invalid'), styles.red);
        }
    } else {
        console.log(JSON.stringify(config, null, 2));
    }
}

module.exports = { execute };
