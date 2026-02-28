import { log, styles, askQuestion, getCIMode, getJSONMode, ciError, ciOutput } from '../core/utils.js';
import { t, initI18n } from '../core/i18n.js';
import { saveConfig } from '../core/config.js';

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

export async function execute(args, config) {
    const key = args[0];
    const value = args[1];

    if (!key) {
        if (getCIMode() || getJSONMode()) {
            ciError('missing_subcommand', t('ci_error_config_requires_subcommand'));
            process.exit(2);
        }
        console.log(`\n${styles.bright}${t('usage_config')}${styles.reset}`);
        await interactiveConfigMenu(config);
        return;
    }

    if (key === 'lang') {
        if (!value) {
            ciError('missing_argument', t('ci_error_config_requires_subcommand'));
            process.exit(2);
        }
        if (['en', 'ko'].includes(value)) {
            config.lang = value;
            saveConfig(config);
            initI18n(value);
            if (getJSONMode()) {
                ciOutput({ key, value });
                return;
            }
            log(t('success_config_set', { key, value }), styles.green);
            return;
        }
        ciError('invalid_argument', t('error_config_invalid'));
        process.exit(2);
    }

    ciError('invalid_argument', t('error_config_invalid'));
    process.exit(2);
}
