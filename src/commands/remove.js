const { log, styles, askQuestion } = require('../core/utils');
const { t } = require('../core/i18n');
const { getActiveSkills, CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR } = require('../core/skills');
const fs = require('fs');
const path = require('path');

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

    const targetIdx = activeSkills.findIndex(item => {
        return item.key === skillName || item.name.toLowerCase() === skillName.toLowerCase();
    });

    if (targetIdx === -1) {
        return log("❌ 스킬을 찾을 수 없습니다.", styles.red);
    }

    const targetItem = activeSkills[targetIdx];
    const targetKey = targetItem.key;

    // 심볼릭 링크/폴더 제거
    const agentDir = targetItem.agent === 'claude' ? CLAUDE_SKILLS_DIR :
        targetItem.agent === 'gemini' ? GEMINI_SKILLS_DIR : CODEX_SKILLS_DIR;
    const destPath = path.join(agentDir, targetItem.name);
    if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
    }

    log(t('success_skill_removed', { name: path.basename(targetKey) }), styles.green);
}

module.exports = { execute };
