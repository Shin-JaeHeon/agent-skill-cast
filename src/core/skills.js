const fs = require('fs');
const path = require('path');
const os = require('os');
const { log, styles, ensureDir } = require('./utils');
const { SOURCES_DIR } = require('./config');
const { t } = require('./i18n');

// Constants for skill directories in current project
const CLAUDE_SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills');
const CODEX_SKILLS_DIR = path.join(process.cwd(), '.codex', 'skills');
const GEMINI_SKILLS_DIR = path.join(process.cwd(), '.gemini', 'skills');

// Helper: Link or copy
function linkOrCopy(source, dest, isDirectory = false) {
    try {
        if (fs.existsSync(dest) || fs.lstatSync(dest)) {
            if (isDirectory) {
                fs.rmSync(dest, { recursive: true, force: true });
            } else {
                fs.unlinkSync(dest);
            }
        }
    } catch (e) { /* ignore */ }

    try {
        const symlinkType = isDirectory ? (os.platform() === 'win32' ? 'junction' : 'dir') : 'file';
        fs.symlinkSync(source, dest, symlinkType);
    } catch (e) {
        if (isDirectory) {
            fs.cpSync(source, dest, { recursive: true });
        } else {
            fs.copyFileSync(source, dest);
        }
    }
}

// findSkills implementation
function findSkills(sourceDir) {
    if (!fs.existsSync(sourceDir)) return [];
    const skills = [];
    const addedPaths = new Set();

    const normalizedSourceDir = sourceDir.replace(/\\/g, '/');
    const isInsideAgentFolder = /(\/|^)\.(claude|gemini|codex)(\/|$)/.test(normalizedSourceDir);

    if (!isInsideAgentFolder) {
        const agentFolders = [
            { dir: '.claude/skills', label: 'claude' },
            { dir: '.gemini/skills', label: 'gemini' },
            { dir: '.codex/skills', label: 'codex' }
        ];

        agentFolders.forEach(folder => {
            const fullPath = path.join(sourceDir, folder.dir);
            if (fs.existsSync(fullPath)) {
                const items = fs.readdirSync(fullPath);
                items.forEach(item => {
                    if (item.startsWith('.') || item === 'node_modules') return;
                    const itemPath = path.join(fullPath, item);
                    try {
                        const stat = fs.statSync(itemPath);
                        if (stat.isDirectory()) {
                            const skillMdPath = path.join(itemPath, 'SKILL.md');
                            if (fs.existsSync(skillMdPath)) {
                                const realPath = fs.realpathSync(itemPath);
                                if (!addedPaths.has(realPath)) {
                                    skills.push({ name: item, path: itemPath, location: folder.label });
                                    addedPaths.add(realPath);
                                }
                            }
                        }
                    } catch (e) { /* ignore */ }
                });
            }
        });
    }

    function scanDirectory(dir, relativePath = '') {
        let items;
        try { items = fs.readdirSync(dir); } catch (e) { return; }

        items.forEach(item => {
            if (item.startsWith('.') || item === 'node_modules') return;
            const itemPath = path.join(dir, item);
            const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
            try {
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    const skillMdPath = path.join(itemPath, 'SKILL.md');
                    if (fs.existsSync(skillMdPath)) {
                        const realPath = fs.realpathSync(itemPath);
                        if (!addedPaths.has(realPath)) {
                            const location = relativePath ? `/${relativePath}` : '/';
                            skills.push({ name: item, path: itemPath, location });
                            addedPaths.add(realPath);
                        }
                    }
                    scanDirectory(itemPath, itemRelativePath);
                }
            } catch (e) { /* ignore */ }
        });
    }

    scanDirectory(sourceDir);
    return skills;
}

// _getActiveSkills implementation
function getActiveSkills() {
    const active = [];
    const agentFolders = [
        { dir: CLAUDE_SKILLS_DIR, type: 'claude' },
        { dir: GEMINI_SKILLS_DIR, type: 'gemini' },
        { dir: CODEX_SKILLS_DIR, type: 'codex' }
    ];

    agentFolders.forEach(agent => {
        if (!fs.existsSync(agent.dir)) return;
        const items = fs.readdirSync(agent.dir);
        items.forEach(item => {
            const fullPath = path.join(agent.dir, item);
            try {
                const lstat = fs.lstatSync(fullPath);
                if (lstat.isSymbolicLink()) {
                    const targetPath = fs.realpathSync(fullPath);
                    if (targetPath.startsWith(SOURCES_DIR)) {
                        const relative = path.relative(SOURCES_DIR, targetPath);
                        const parts = relative.split(path.sep);
                        const sourceName = parts[0];
                        const skillName = parts[parts.length - 1];
                        active.push({
                            key: `${sourceName}/${skillName}`,
                            path: targetPath,
                            name: skillName,
                            agent: agent.type
                        });
                    } else {
                        active.push({
                            key: `local/${item}`,
                            path: targetPath,
                            name: item,
                            agent: agent.type
                        });
                    }
                }
            } catch (e) { /* ignore */ }
        });
    });
    return active;
}

async function activateSkill(sourceName, skillName, skillPath = null, options = {}) {
    const skillKey = `${sourceName}/${skillName}`;
    let sourcePath = skillPath;

    if (!sourcePath) {
        const sourceDir = path.join(SOURCES_DIR, sourceName);
        const searchPaths = [
            path.join(sourceDir, '.claude', 'skills', skillName),
            path.join(sourceDir, '.gemini', 'skills', skillName),
            path.join(sourceDir, '.codex', 'skills', skillName),
            path.join(sourceDir, skillName)
        ];

        for (const p of searchPaths) {
            if (fs.existsSync(p) && fs.existsSync(path.join(p, 'SKILL.md'))) {
                sourcePath = p;
                break;
            }
        }
        if (!sourcePath) {
            return log(t('error_skill_not_found', { key: skillKey }), styles.red);
        }
    }

    if (!fs.existsSync(sourcePath)) {
        return log(t('error_skill_not_found', { key: skillKey }), styles.red);
    }

    const agents = ['claude', 'gemini', 'codex'];
    const targets = [];
    const hasSpecificFlag = agents.some(a => options[a]);

    if (hasSpecificFlag) {
        agents.forEach(a => { if (options[a]) targets.push(a); });
    } else {
        targets.push(...agents);
    }

    let installedCount = 0;

    for (const agent of targets) {
        const agentRootDir = path.join(process.cwd(), `.${agent}`);
        if (!fs.existsSync(agentRootDir)) continue;

        const agentSkillsDir = path.join(agentRootDir, 'skills');
        ensureDir(agentSkillsDir);

        const destPath = path.join(agentSkillsDir, skillName);

        if (fs.existsSync(destPath)) {
            log(t('warn_skill_exists', { skillName: `${skillName} (.${agent})` }), styles.yellow);
            continue;
        }

        if (options.copy) {
            fs.cpSync(sourcePath, destPath, { recursive: true });
            log(t('success_skill_copied', { skillName: `${skillName} -> .${agent}` }), styles.green);
        } else {
            linkOrCopy(sourcePath, destPath, true);
            log(t('success_skill_installed', { skillName: `${skillName} -> .${agent}` }), styles.green);
        }
        installedCount++;
    }

    if (installedCount === 0) {
        const targetList = targets.map(t => `.${t}`).join(', ');
        log(`${styles.yellow}No target directories found among [${targetList}]. Create .claude, .gemini, or .codex folder first.${styles.reset}`);
    }
}

module.exports = {
    CLAUDE_SKILLS_DIR,
    CODEX_SKILLS_DIR,
    GEMINI_SKILLS_DIR,
    findSkills,
    getActiveSkills,
    activateSkill,
    linkOrCopy
};
