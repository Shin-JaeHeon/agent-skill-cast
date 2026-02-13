const { log, styles, askQuestion, getCIMode, getJSONMode, ciOutput, ciError } = require('../core/utils');
const { t } = require('../core/i18n');
const { SOURCES_DIR } = require('../core/config');
const { findSkills, activateSkill } = require('../core/skills');
const path = require('path');

async function execute(args, config, options = {}) {
    // args: [query]
    const query = args[0];
    const sourceNames = Object.keys(config.sources);

    if (sourceNames.length === 0) {
        if (getCIMode()) {
            ciError('no_sources', t('error_no_sources'));
            process.exit(1);
        }
        log(t('error_no_sources'), styles.red);
        return;
    }

    let sourceName, skillName;

    if (options.all) {
        // --all mode: install all skills from a source
        sourceName = query;

        if (!sourceName) {
            if (getCIMode()) {
                ciError('missing_argument', t('ci_error_use_all_requires_source'));
                process.exit(2);
            }
            // Interactive: select source first
            log(t('header_source_list'), styles.bright);
            sourceNames.forEach((name, i) => {
                const info = config.sources[name];
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                console.log(`  [${i + 1}] ${typeIcon} ${name}`);
            });

            const sourceIdx = await askQuestion(t('prompt_source_select'));
            sourceName = sourceNames[parseInt(sourceIdx) - 1];

            if (!sourceName) {
                return log(t('error_invalid_choice'), styles.red);
            }
        }

        if (!config.sources[sourceName]) {
            return log(t('error_source_not_found'), styles.red);
        }

        const sourceDir = path.join(SOURCES_DIR, sourceName);
        log(t('info_all_scanning', { sourceName }), styles.cyan);
        const skills = findSkills(sourceDir);

        if (skills.length === 0) {
            return log(t('warn_no_skills', { sourceName }), styles.yellow);
        }

        log(t('info_all_found', { sourceName, count: skills.length }), styles.bright);
        skills.forEach((skill, i) => {
            const labelColor = skill.location === 'claude' ? styles.cyan :
                skill.location === 'gemini' ? styles.yellow :
                    skill.location === 'codex' ? styles.magenta : styles.bright;
            const locationTag = labelColor + `[${skill.location}]`;
            console.log(`  [${i + 1}] 📁 ${skill.name} ${locationTag}${styles.reset}`);
        });

        if (!getCIMode()) {
            const confirm = await askQuestion(t('prompt_all_confirm', { count: skills.length }));
            if (confirm.toLowerCase() !== 'y') {
                return;
            }
        }

        let installedCount = 0;
        for (const skill of skills) {
            await activateSkill(sourceName, skill.name, skill.path, options);
            installedCount++;
        }

        const summary = { sourceName, installed: installedCount, total: skills.length };
        if (getJSONMode()) {
            ciOutput(summary);
        } else {
            log(t('success_all_done', summary), styles.green);
        }
        return;
    }

    if (query && query.includes('/')) {
        const parts = query.split('/');
        sourceName = parts[0];
        skillName = parts.slice(1).join('/');
    } else if (getCIMode()) {
        // CI mode requires explicit source/skill argument
        ciError('missing_argument', t('ci_error_use_requires_arg'));
        process.exit(2);
    } else {
        // Interactive
        log(t('header_source_list'), styles.bright);
        sourceNames.forEach((name, i) => {
            const info = config.sources[name];
            const typeIcon = info.type === 'git' ? '🌐' : '📁';
            console.log(`  [${i + 1}] ${typeIcon} ${name}`);
        });

        const sourceIdx = await askQuestion(t('prompt_source_select'));
        sourceName = sourceNames[parseInt(sourceIdx) - 1];

        if (!sourceName) {
            return log(t('error_invalid_choice'), styles.red);
        }

        const sourceDir = path.join(SOURCES_DIR, sourceName);
        const skills = findSkills(sourceDir);

        if (skills.length === 0) {
            return log(t('warn_no_skills', { sourceName }), styles.yellow);
        }

        log(t('header_skills_list', { sourceName }), styles.bright);
        skills.forEach((skill, i) => {
            const labelColor = skill.location === 'claude' ? styles.cyan :
                skill.location === 'gemini' ? styles.yellow :
                    skill.location === 'codex' ? styles.magenta : styles.bright;
            const locationTag = labelColor + `[${skill.location}]`;
            console.log(`  [${i + 1}] 📁 ${skill.name} ${locationTag}${styles.reset}`);
        });

        const skillIdx = await askQuestion(t('prompt_skill_select'));
        const indices = skillIdx.split(',').map(s => parseInt(s.trim()) - 1);

        for (const idx of indices) {
            if (skills[idx]) {
                await activateSkill(sourceName, skills[idx].name, skills[idx].path, options);
            }
        }
        return;
    }

    // Direct
    await activateSkill(sourceName, skillName, null, options);
}

module.exports = { execute };

