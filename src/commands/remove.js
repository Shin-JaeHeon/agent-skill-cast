const { log, styles, askQuestion } = require('../core/utils');
const { t } = require('../core/i18n');
const { getActiveSkills, CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR } = require('../core/skills');
const fs = require('fs');
const path = require('path');

const { loadConfig } = require('../core/config');

async function execute(args) {
    let skillName = args[0];
    const activeSkills = getActiveSkills();

    if (!skillName) {
        if (activeSkills.length === 0) {
            return log(t('error_no_skill_to_remove'), styles.red);
        }
        log(t('header_remove_skill'), styles.bright);
        activeSkills.forEach((item, i) => {
            console.log(`  [${i + 1}] ${item.key}`);
        });
        const idx = await askQuestion(t('prompt_number'));
        const selected = activeSkills[parseInt(idx) - 1];
        skillName = selected?.key;
    }

    const targets = activeSkills.filter(item => {
        return item.key === skillName || item.name.toLowerCase() === skillName.toLowerCase();
    });

    if (targets.length === 0) {
        // Check if it's a local directory (not a symlink) in any agent folder
        const { CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR } = require('../core/skills');
        const agentDirs = [CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR];

        let isLocalDir = false;
        for (const dir of agentDirs) {
            const potentialPath = path.join(dir, skillName);
            if (fs.existsSync(potentialPath)) {
                try {
                    const stats = fs.lstatSync(potentialPath);
                    if (stats.isDirectory() && !stats.isSymbolicLink()) {
                        isLocalDir = true;
                        break;
                    }
                } catch (e) { }
            }
        }

        if (isLocalDir) {
            return log(t('error_cannot_remove_local_source'), styles.red); // Reusing the same key, though it says "local source file", close enough or I should update it?
            // User asked for "로컬 파일이라 지워지지 않는다고 해". 
            // The key error_cannot_remove_local_source = "Cannot remove local source file." / "로컬 파일이라 제거할 수 없습니다."
            // This matches the requirement.
        }

        return log(t('error_skill_not_found', { key: skillName }), styles.red);
    }

    targets.forEach(targetItem => {
        const agentDir = targetItem.agent === 'claude' ? CLAUDE_SKILLS_DIR :
            targetItem.agent === 'gemini' ? GEMINI_SKILLS_DIR : CODEX_SKILLS_DIR;

        const destPath = path.join(agentDir, targetItem.name);
        if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
            log(t('success_skill_removed', { name: `${targetItem.name} (.${targetItem.agent})` }), styles.green);
        }
    });
}

module.exports = { execute };
