const { log, styles, askQuestion } = require('../core/utils');
const { t } = require('../core/i18n');
const { saveConfig } = require('../core/config');
const { initI18n } = require('../core/i18n'); // Needed to reload language

async function changeLanguage(config) {
    const ans = await askQuestion(t('prompt_lang_select'));
    let newLang = null;
    if (ans.trim() === '1') newLang = 'en';
    if (ans.trim() === '2') newLang = 'ko';

    if (newLang) {
        config.lang = newLang;
        saveConfig(config);
        initI18n(newLang);
        log(t('success_config_set', { key: 'lang', value: newLang }), styles.green);
    } else {
        log(t('error_invalid_choice'), styles.red);
    }
}

async function interactiveConfigMenu(config) {
    let running = true;
    while (running) {
        console.log('');
        log(t('config_menu_header'), styles.bright);
        console.log(`1. ${t('config_menu_lang')}`);
        console.log(`2. ${t('config_menu_view')}`);
        console.log(`3. ${t('config_menu_exit')}`);
        console.log('');

        const choice = await askQuestion(t('prompt_choice'));

        switch (choice.trim()) {
            case '1':
                await changeLanguage(config);
                break;
            case '2':
                log(t('info_current_config'), styles.cyan);
                console.log(JSON.stringify(config, null, 2));
                break;
            case '3':
            case 'exit':
            case 'q':
                running = false;
                break;
            default:
                log(t('error_invalid_choice'), styles.red);
        }

        if (running) {
            await askQuestion(t('press_enter_to_continue'));
        }
    }
}

async function execute(args, config) {
    const key = args[0];
    const value = args[1];

    if (!key) {
        // Show usage first
        console.log(`\n${styles.bright}${t('usage_config')}${styles.reset}`);
        // Then interactive menu
        await interactiveConfigMenu(config);
        return;
    }

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
        // Direct display if some random key argument is passed, though mostly unused logic currently
        console.log(JSON.stringify(config, null, 2));
    }
}

module.exports = { execute };
