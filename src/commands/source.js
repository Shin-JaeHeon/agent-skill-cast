const { log, styles, askQuestion, t } = require('../core/utils');
// utils exports styles, log, etc. Wait, I should import t from i18n
const { t: tFunc } = require('../core/i18n'); // Renaming to avoid conflict or just use t
const { loadConfig, saveConfig, SOURCES_DIR } = require('../core/config');
const { cloneSource, importSource } = require('../core/sources');
const { runCmd } = require('../core/utils');
const fs = require('fs');
const path = require('path');

// Fix import because I made a mistake in the previous line 
// t is in i18n.js, utils.js does NOT export t.
// Let's correct this.

async function listSources(config) {
    log(tFunc('header_registered_sources'), styles.bright);
    const sourceNames = Object.keys(config.sources);
    if (sourceNames.length === 0) {
        log(tFunc('warn_no_registered_sources'), styles.yellow);
    } else {
        for (const [name, info] of Object.entries(config.sources)) {
            const typeIcon = info.type === 'git' ? '🌐' : '📁';
            const sourcePath = info.type === 'git' ? info.url : info.path;
            console.log(`   ${typeIcon} ${styles.bright}${name}${styles.reset} ${styles.blue}(${sourcePath})${styles.reset}`);
        }
    }
}

async function addSource(args, config) {
    let input = args[0];
    if (!input) {
        input = await askQuestion(tFunc('prompt_source'));
    }
    if (!input) return log(tFunc('error_no_input'), styles.red);

    const target = input.trim();
    const isGit = target.startsWith('http') || target.startsWith('git@') || target.endsWith('.git');

    if (isGit) {
        await cloneSource(target, config);
    } else {
        await importSource(target, config);
    }
}

async function removeSource(args, config) {
    let sourceName = args[0];
    if (!sourceName) {
        const sourceNames = Object.keys(config.sources);
        if (sourceNames.length === 0) {
            return log(tFunc('error_no_sources'), styles.red);
        }
        log(tFunc('header_remove_source'), styles.bright);
        sourceNames.forEach((name, i) => {
            const info = config.sources[name];
            const typeIcon = info.type === 'git' ? '🌐' : '📁';
            console.log(`  [${i + 1}] ${typeIcon} ${name}`);
        });
        const idx = await askQuestion(tFunc('prompt_number'));
        sourceName = sourceNames[parseInt(idx) - 1];
    }

    if (!sourceName || !config.sources[sourceName]) {
        return log(tFunc('error_source_not_found'), styles.red);
    }

    log(tFunc('info_removing_source', { sourceName }), styles.cyan);

    // We need getActiveSkills to remove linked skills. 
    // Circular dependency risk if we just import skills.js? 
    // implementation plan said commands are separate.
    const { getActiveSkills, CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR } = require('../core/skills');

    const prefix = `${sourceName}/`;
    const activeSkills = getActiveSkills().filter(a => a.key.startsWith(prefix));

    if (activeSkills.length > 0) {
        log(tFunc('info_removing_skills_count', { count: activeSkills.length }), styles.yellow);
        for (const skill of activeSkills) {
            const agentDir = skill.agent === 'claude' ? CLAUDE_SKILLS_DIR :
                skill.agent === 'gemini' ? GEMINI_SKILLS_DIR : CODEX_SKILLS_DIR;
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
            log(tFunc('warn_remove_error', { message: e.message }), styles.yellow);
        }
    }

    log(tFunc('success_source_removed', { sourceName }), styles.green);
}

async function syncSources(config) {
    // This logic handles pulling git repos
    log(tFunc('info_syncing'), styles.bright);

    for (const [name, info] of Object.entries(config.sources)) {
        const sourceDir = path.join(SOURCES_DIR, name);
        if (info.type === 'git' && fs.existsSync(sourceDir)) {
            log(tFunc('info_updating', { name }), styles.cyan);
            try {
                runCmd('git pull', sourceDir, true);
            } catch (e) {
                log(tFunc('warn_update_fail', { name }), styles.yellow);
            }
        }
    }

    // Also re-link skills? The original code did re-link in sync()
    const { getActiveSkills, linkOrCopy, CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR } = require('../core/skills');
    const activeSkills = getActiveSkills();
    let linkCount = activeSkills.length;

    for (const skill of activeSkills) {
        const sourcePath = skill.path;
        if (!fs.existsSync(sourcePath)) {
            log(tFunc('warn_source_missing', { key: skill.key }), styles.yellow);
            linkCount--;
            continue;
        }

        const agentDir = skill.agent === 'claude' ? CLAUDE_SKILLS_DIR :
            skill.agent === 'gemini' ? GEMINI_SKILLS_DIR : CODEX_SKILLS_DIR;
        const destPath = path.join(agentDir, skill.name);

        linkOrCopy(sourcePath, destPath, true);
    }

    log(tFunc('success_sync_done', { count: linkCount }), styles.green);
}

async function execute(subCommand, args, config) {
    if (subCommand === 'add') {
        await addSource(args, config);
    } else if (subCommand === 'remove' || subCommand === 'rm') {
        await removeSource(args, config);
    } else if (subCommand === 'sync') {
        await syncSources(config);
    } else if (subCommand === 'list' || subCommand === 'ls') {
        await listSources(config);
    } else {
        console.log(`\n${styles.bright}${tFunc('usage_source_header')}${styles.reset}
${tFunc('usage_source_add')}
${tFunc('usage_source_list')}`);
    }
}

module.exports = { execute };
