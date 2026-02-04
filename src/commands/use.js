const { log, styles, askQuestion } = require('../core/utils');
const { t } = require('../core/i18n');
const { SOURCES_DIR } = require('../core/config');
const { findSkills, activateSkill } = require('../core/skills');
const path = require('path');

async function execute(args, config, options = {}) {
    // args: [query]
    const query = args[0];
    const sourceNames = Object.keys(config.sources);

    if (sourceNames.length === 0) {
        log(t('error_no_sources'), styles.red);
        return;
    }

    let sourceName, skillName;

    if (query && query.includes('/')) {
        const parts = query.split('/');
        sourceName = parts[0];
        skillName = parts.slice(1).join('/');
    } else {
        // Interactive
        log(t('header_source_list'), styles.bright);
        sourceNames.forEach((name, i) => {
            const info = config.sources[name];
            const typeIcon = info.type === 'git' ? '🌐' : '📁';
            // config sources usually have simple keys
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
