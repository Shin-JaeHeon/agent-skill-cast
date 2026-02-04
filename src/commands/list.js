const { log, styles } = require('../core/utils');
const { t } = require('../core/i18n');
const { CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR } = require('../core/skills');
const { SOURCES_DIR } = require('../core/config'); // Needed for path resolution
const fs = require('fs');
const path = require('path');

async function execute() {
    const agentFolders = [
        { name: 'Claude', dir: CLAUDE_SKILLS_DIR, color: styles.cyan },
        { name: 'Codex', dir: CODEX_SKILLS_DIR, color: styles.magenta },
        { name: 'Gemini', dir: GEMINI_SKILLS_DIR, color: styles.yellow }
    ];

    log(t('header_project_skills'), styles.bright);

    let foundAny = false;
    agentFolders.forEach(agent => {
        if (fs.existsSync(agent.dir)) {
            const items = fs.readdirSync(agent.dir);
            const skills = items.filter(item => {
                if (item.startsWith('.') || item === 'node_modules') return false;
                try {
                    const fullPath = path.join(agent.dir, item);
                    return fs.statSync(fullPath).isDirectory();
                } catch (e) { return false; }
            });

            if (skills.length > 0) {
                foundAny = true;
                log(t('agent_skills_header', { color: agent.color, agent: agent.name, reset: styles.reset }), styles.bright);
                skills.forEach(skill => {
                    const fullPath = path.join(agent.dir, skill);
                    let sourceInfo = "";
                    try {
                        const lstat = fs.lstatSync(fullPath);
                        if (lstat.isSymbolicLink()) {
                            const targetPath = fs.readlinkSync(fullPath);
                            let displayPath = targetPath;

                            // .asc_sources 내부를 가리키는 경우 소스 이름만 추출
                            if (targetPath.startsWith(SOURCES_DIR)) {
                                const relative = path.relative(SOURCES_DIR, targetPath);
                                displayPath = relative.split(path.sep)[0];
                            } else {
                                displayPath = path.basename(targetPath);
                            }

                            sourceInfo = ` ${styles.blue}${t('info_linked_source', { displayPath })}${styles.reset}`;
                        } else {
                            sourceInfo = ` ${styles.yellow}${t('info_local_source')}${styles.reset}`;
                        }
                    } catch (e) { /* ignore */ }

                    console.log(`   ${styles.green}✓${styles.reset} ${skill}${sourceInfo}`);
                });
            }
        }
    });

    if (!foundAny) {
        log(t('warn_no_project_skills'), styles.yellow);
        log(t('info_use_hint_general'), styles.cyan);
    }
}

module.exports = { execute };
