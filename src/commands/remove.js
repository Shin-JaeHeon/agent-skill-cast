import fs from 'fs';
import path from 'path';
import { log, styles, askQuestion, getCIMode, getJSONMode, ciError, ciOutput } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { getActiveSkills, CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR } from '../core/skills.js';

export async function execute(args) {
    let skillName = args[0];
    const activeSkills = getActiveSkills();

    if (!skillName) {
        if (getCIMode() || getJSONMode()) {
            ciError('missing_argument', t('ci_error_remove_requires_arg'));
            process.exit(2);
        }
        if (activeSkills.length === 0) {
            log(t('error_no_skill_to_remove'), styles.red);
            process.exit(1);
        }
        log(t('header_remove_skill'), styles.bright);
        activeSkills.forEach((item, i) => {
            console.log(`  [${i + 1}] ${item.key}`);
        });
        const idx = await askQuestion(t('prompt_number'));
        const selected = activeSkills[parseInt(idx, 10) - 1];
        skillName = selected?.key;
    }

    const normalizedInput = skillName.toLowerCase();
    const inputName = normalizedInput.includes('/') ? normalizedInput.split('/').pop() : normalizedInput;
    const targets = activeSkills.filter(item => {
        const name = item.name.toLowerCase();
        return item.key === skillName || name === normalizedInput || name === inputName;
    });

    if (targets.length === 0) {
        const agentDirs = [CLAUDE_SKILLS_DIR, GEMINI_SKILLS_DIR, CODEX_SKILLS_DIR];
        let isLocalDir = false;

        for (const dir of agentDirs) {
            const potentialPath = path.join(dir, skillName);
            if (!fs.existsSync(potentialPath)) continue;
            try {
                const stats = fs.lstatSync(potentialPath);
                if (stats.isDirectory() && !stats.isSymbolicLink()) {
                    isLocalDir = true;
                    break;
                }
            } catch {
                // ignore
            }
        }

        if (isLocalDir) {
            ciError('cannot_remove_local', t('error_cannot_remove_local_source'));
            process.exit(1);
        }

        ciError('skill_not_found', t('error_skill_not_found', { key: skillName }));
        process.exit(1);
    }

    let removed = 0;
    targets.forEach(targetItem => {
        const agentDir = targetItem.agent === 'claude'
            ? CLAUDE_SKILLS_DIR
            : targetItem.agent === 'gemini'
                ? GEMINI_SKILLS_DIR
                : CODEX_SKILLS_DIR;

        const destPath = path.join(agentDir, targetItem.name);
        if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
            removed++;
            log(t('success_skill_removed', { name: `${targetItem.name} (.${targetItem.agent})` }), styles.green);
        }
    });

    if (getJSONMode()) {
        ciOutput({ removed, skillName });
    }
}
