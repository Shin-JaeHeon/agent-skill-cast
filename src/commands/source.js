import fs from 'fs';
import path from 'path';
import {
    log,
    styles,
    askQuestion,
    getCIMode,
    getJSONMode,
    ciOutput,
    ciError
} from '../core/utils.js';
import { t } from '../core/i18n.js';
import { loadConfig, saveConfig, SOURCES_DIR } from '../core/config.js';
import { cloneSource, importSource } from '../core/sources.js';
import { runGit } from '../core/process.js';
import {
    getActiveSkills,
    linkOrCopy,
    CLAUDE_SKILLS_DIR,
    GEMINI_SKILLS_DIR,
    CODEX_SKILLS_DIR
} from '../core/skills.js';

async function listSources(config) {
    if (getJSONMode()) {
        const sources = Object.entries(config.sources).map(([name, info]) => ({
            name,
            type: info.type,
            url: info.type === 'git' ? info.url : undefined,
            path: info.type === 'local' ? info.path : undefined
        }));
        ciOutput({ sources });
        return;
    }

    log(t('header_registered_sources'), styles.bright);
    const sourceNames = Object.keys(config.sources);
    if (sourceNames.length === 0) {
        log(t('warn_no_registered_sources'), styles.yellow);
        return;
    }

    for (const [name, info] of Object.entries(config.sources)) {
        const typeIcon = info.type === 'git' ? '🌐' : '📁';
        const sourcePath = info.type === 'git' ? info.url : info.path;
        console.log(`   ${typeIcon} ${styles.bright}${name}${styles.reset} ${styles.blue}(${sourcePath})${styles.reset}`);
    }
}

async function addSource(args, config) {
    let input = args[0];
    if (!input) {
        if (getCIMode() || getJSONMode()) {
            ciError('missing_argument', t('ci_error_source_add_requires_arg'));
            process.exit(2);
        }
        input = await askQuestion(t('prompt_source'));
    }
    if (!input) {
        ciError('missing_argument', t('error_no_input'));
        process.exit(2);
    }

    const target = input.trim();
    const isGit = target.startsWith('http') || target.startsWith('git@') || target.endsWith('.git');
    let result;

    if (isGit) {
        result = await cloneSource(target, config);
    } else {
        result = await importSource(target, config);
    }

    if (!result?.ok) {
        ciError(result?.error || 'execution_error', result?.message || t('error_clone_fail'));
        process.exit(1);
    }

    if (getJSONMode()) {
        ciOutput({
            input: result.input,
            name: result.name,
            type: result.type
        });
    }
}

async function removeSource(args, config) {
    let sourceName = args[0];
    if (!sourceName) {
        if (getCIMode() || getJSONMode()) {
            ciError('missing_argument', t('ci_error_source_remove_requires_arg'));
            process.exit(2);
        }
        const sourceNames = Object.keys(config.sources);
        if (sourceNames.length === 0) {
            return log(t('error_no_sources'), styles.red);
        }

        log(t('header_remove_source'), styles.bright);
        sourceNames.forEach((name, i) => {
            const info = config.sources[name];
            const typeIcon = info.type === 'git' ? '🌐' : '📁';
            console.log(`  [${i + 1}] ${typeIcon} ${name}`);
        });
        const idx = await askQuestion(t('prompt_number'));
        sourceName = sourceNames[parseInt(idx, 10) - 1];
    }

    if (!sourceName || !config.sources[sourceName]) {
        ciError('source_not_found', t('error_source_not_found'));
        process.exit(1);
    }

    log(t('info_removing_source', { sourceName }), styles.cyan);

    const prefix = `${sourceName}/`;
    const activeSkills = getActiveSkills().filter(a => a.key.startsWith(prefix));

    if (activeSkills.length > 0) {
        log(t('info_removing_skills_count', { count: activeSkills.length }), styles.yellow);
        for (const skill of activeSkills) {
            const agentDir = skill.agent === 'claude'
                ? CLAUDE_SKILLS_DIR
                : skill.agent === 'gemini'
                    ? GEMINI_SKILLS_DIR
                    : CODEX_SKILLS_DIR;
            const destPath = path.join(agentDir, skill.name);
            if (fs.existsSync(destPath)) {
                fs.rmSync(destPath, { recursive: true, force: true });
            }
        }
    }

    delete config.sources[sourceName];
    saveConfig(config);

    const sourcePath = path.join(SOURCES_DIR, sourceName);
    if (fs.existsSync(sourcePath)) {
        try {
            const stat = fs.lstatSync(sourcePath);
            if (stat.isSymbolicLink()) {
                fs.unlinkSync(sourcePath);
            } else {
                fs.rmSync(sourcePath, { recursive: true, force: true });
            }
        } catch (e) {
            log(t('warn_remove_error', { message: e.message }), styles.yellow);
        }
    }

    if (getJSONMode()) {
        ciOutput({ removed: sourceName, removedSkills: activeSkills.length });
        return;
    }

    log(t('success_source_removed', { sourceName }), styles.green);
}

async function syncSources(config) {
    log(t('info_syncing'), styles.bright);

    const syncResults = [];
    for (const [name, info] of Object.entries(config.sources)) {
        const sourceDir = path.join(SOURCES_DIR, name);
        if (info.type === 'git' && fs.existsSync(sourceDir)) {
            log(t('info_updating', { name }), styles.cyan);
            try {
                await runGit(['pull'], { cwd: sourceDir });
                syncResults.push({ name, status: 'updated' });
            } catch {
                log(t('warn_update_fail', { name }), styles.yellow);
                syncResults.push({ name, status: 'failed' });
            }
        } else if (info.type === 'local') {
            syncResults.push({ name, status: 'local' });
        }
    }

    const activeSkills = getActiveSkills();
    let linkCount = activeSkills.length;

    for (const skill of activeSkills) {
        const sourcePath = skill.path;
        if (!fs.existsSync(sourcePath)) {
            log(t('warn_source_missing', { key: skill.key }), styles.yellow);
            linkCount--;
            continue;
        }

        const agentDir = skill.agent === 'claude'
            ? CLAUDE_SKILLS_DIR
            : skill.agent === 'gemini'
                ? GEMINI_SKILLS_DIR
                : CODEX_SKILLS_DIR;
        const destPath = path.join(agentDir, skill.name);

        linkOrCopy(sourcePath, destPath, true);
    }

    if (getJSONMode()) {
        ciOutput({ sources: syncResults, skillCount: linkCount });
        return;
    }

    log(t('success_sync_done', { count: linkCount }), styles.green);
}

async function interactiveSourceMenu(config) {
    let running = true;
    while (running) {
        console.log('');
        log(t('source_menu_header'), styles.bright);
        console.log(`1. ${t('source_menu_list')}`);
        console.log(`2. ${t('source_menu_add')}`);
        console.log(`3. ${t('source_menu_remove')}`);
        console.log(`4. ${t('source_menu_sync')}`);
        console.log(`5. ${t('source_menu_exit')}`);
        console.log('');

        const choice = await askQuestion(t('prompt_choice'));

        switch (choice.trim()) {
            case '1':
                await listSources(config);
                break;
            case '2':
                await addSource([], config);
                break;
            case '3':
                await removeSource([], config);
                break;
            case '4':
                await syncSources(config);
                break;
            case '5':
            case 'exit':
            case 'q':
                running = false;
                break;
            default:
                log(t('error_invalid_choice'), styles.red);
        }

        if (running) {
            await askQuestion(t('press_enter_to_continue'));
            config = loadConfig();
        }
    }
}

export async function execute(subCommand, args, config) {
    if (subCommand === 'add') {
        await addSource(args, config);
    } else if (subCommand === 'remove' || subCommand === 'rm') {
        await removeSource(args, config);
    } else if (subCommand === 'sync') {
        await syncSources(config);
    } else if (subCommand === 'list' || subCommand === 'ls') {
        await listSources(config);
    } else if (!subCommand) {
        if (getCIMode() || getJSONMode()) {
            ciError('missing_subcommand', t('ci_error_source_requires_subcommand'));
            process.exit(2);
        }
        console.log(`\n${styles.bright}${t('usage_source_header')}${styles.reset}
${t('usage_source_add')}
${t('usage_source_list')}
${t('usage_source_remove')}
${t('usage_source_sync')}`);
        await interactiveSourceMenu(config);
    } else {
        ciError('invalid_subcommand', t('ci_error_source_requires_subcommand'));
        process.exit(2);
    }
}
