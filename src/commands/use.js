import path from 'path';
import { log, styles, askQuestion, getCIMode, getJSONMode, ciOutput, ciError } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { SOURCES_DIR } from '../core/config.js';
import { findSkills, activateSkill } from '../core/skills.js';

export async function execute(args, config, options = {}) {
    const query = args[0];
    const sourceNames = Object.keys(config.sources);

    let sourceName;
    let skillName;

    if (options.all) {
        sourceName = query;

        if (!sourceName) {
            if (getCIMode() || getJSONMode()) {
                ciError('missing_argument', t('ci_error_use_all_requires_source'));
                process.exit(2);
            }
            if (sourceNames.length === 0) {
                ciError('no_sources', t('error_no_sources'));
                process.exit(1);
            }
            log(t('header_source_list'), styles.bright);
            sourceNames.forEach((name, i) => {
                const info = config.sources[name];
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                console.log(`  [${i + 1}] ${typeIcon} ${name}`);
            });

            const sourceIdx = await askQuestion(t('prompt_source_select'));
            sourceName = sourceNames[parseInt(sourceIdx, 10) - 1];
            if (!sourceName) {
                log(t('error_invalid_choice'), styles.red);
                process.exit(1);
            }
        }

        if (sourceNames.length === 0) {
            ciError('no_sources', t('error_no_sources'));
            process.exit(1);
        }

        if (!config.sources[sourceName]) {
            ciError('source_not_found', t('error_source_not_found'));
            process.exit(1);
        }

        const sourceDir = path.join(SOURCES_DIR, sourceName);
        log(t('info_all_scanning', { sourceName }), styles.cyan);
        const skills = findSkills(sourceDir);

        if (skills.length === 0) {
            ciError('no_skills', t('warn_no_skills', { sourceName }));
            process.exit(1);
        }

        log(t('info_all_found', { sourceName, count: skills.length }), styles.bright);
        skills.forEach((skill, i) => {
            const labelColor = skill.location === 'claude'
                ? styles.cyan
                : skill.location === 'gemini'
                    ? styles.yellow
                    : skill.location === 'codex'
                        ? styles.magenta
                        : styles.bright;
            const locationTag = `${labelColor}[${skill.location}]`;
            console.log(`  [${i + 1}] 📁 ${skill.name} ${locationTag}${styles.reset}`);
        });

        if (!getCIMode() && !getJSONMode()) {
            const confirm = await askQuestion(t('prompt_all_confirm', { count: skills.length }));
            if (confirm.toLowerCase() !== 'y') {
                return;
            }
        }

        let installedCount = 0;
        for (const skill of skills) {
            const result = await activateSkill(sourceName, skill.name, skill.path, options);
            installedCount += result.installedCount;
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
    } else if (getCIMode() || getJSONMode()) {
        ciError('missing_argument', t('ci_error_use_requires_arg'));
        process.exit(2);
    } else {
        if (sourceNames.length === 0) {
            ciError('no_sources', t('error_no_sources'));
            process.exit(1);
        }
        log(t('header_source_list'), styles.bright);
        sourceNames.forEach((name, i) => {
            const info = config.sources[name];
            const typeIcon = info.type === 'git' ? '🌐' : '📁';
            console.log(`  [${i + 1}] ${typeIcon} ${name}`);
        });

        const sourceIdx = await askQuestion(t('prompt_source_select'));
        sourceName = sourceNames[parseInt(sourceIdx, 10) - 1];

        if (!sourceName) {
            log(t('error_invalid_choice'), styles.red);
            process.exit(1);
        }

        const sourceDir = path.join(SOURCES_DIR, sourceName);
        const skills = findSkills(sourceDir);

        if (skills.length === 0) {
            log(t('warn_no_skills', { sourceName }), styles.yellow);
            process.exit(1);
        }

        log(t('header_skills_list', { sourceName }), styles.bright);
        skills.forEach((skill, i) => {
            const labelColor = skill.location === 'claude'
                ? styles.cyan
                : skill.location === 'gemini'
                    ? styles.yellow
                    : skill.location === 'codex'
                        ? styles.magenta
                        : styles.bright;
            const locationTag = `${labelColor}[${skill.location}]`;
            console.log(`  [${i + 1}] 📁 ${skill.name} ${locationTag}${styles.reset}`);
        });

        const skillIdx = await askQuestion(t('prompt_skill_select'));
        const indices = skillIdx.split(',').map(s => parseInt(s.trim(), 10) - 1);
        let installed = 0;

        for (const idx of indices) {
            if (skills[idx]) {
                const result = await activateSkill(sourceName, skills[idx].name, skills[idx].path, options);
                installed += result.installedCount;
            }
        }

        if (getJSONMode()) {
            ciOutput({ sourceName, installed, selected: indices.length });
        }
        return;
    }

    if (sourceNames.length === 0) {
        ciError('no_sources', t('error_no_sources'));
        process.exit(1);
    }

    const result = await activateSkill(sourceName, skillName, null, options);
    if (result.notFound) {
        ciError('skill_not_found', t('error_skill_not_found', { key: `${sourceName}/${skillName}` }));
        process.exit(1);
    }
    if (getJSONMode()) {
        ciOutput({
            sourceName,
            skillName,
            installed: result.installedCount,
            targets: result.targets
        });
    }
}

