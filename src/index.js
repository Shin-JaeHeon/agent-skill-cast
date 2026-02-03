#!/usr/bin/env node

/**
 * 🧙‍♂️ Agent Skill Cast (ASC) v1.0.0
 * "AI 에이전트 스킬을 시전(Cast)하세요."
 * 
 * 기능: 소스 기반 스킬 관리, 선택적 동기화 (Selective Sync)
 * - clone: 외부 Git 저장소를 소스로 등록
 * - import: 로컬 폴더를 소스로 등록
 * - use: 소스에서 원하는 스킬만 선택 장착
 * - sync: 소스 업데이트 및 스킬 링크 갱신
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const readline = require('readline');

// --- i18n ---
let messages = {};

function initI18n(preferredLang) {
    try {
        const localeDir = path.join(__dirname, 'locales');
        let lang = preferredLang;

        if (!lang) {
            lang = 'en'; // Default fallback
            const sysLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
            if (sysLocale.startsWith('ko') || (process.env.LANG && process.env.LANG.includes('KR'))) {
                lang = 'ko';
            }
            if (process.env.ASC_LANG) lang = process.env.ASC_LANG;
        }

        const localePath = path.join(localeDir, `${lang}.json`);
        const defaultPath = path.join(localeDir, 'en.json');

        if (fs.existsSync(localePath)) {
            messages = require(localePath);
        } else {
            messages = require(defaultPath);
        }
    } catch (e) { messages = {}; }
}
initI18n(); // Initial load for static strings if any (though main re-inits)

function t(key, params = {}) {
    let msg = messages[key] || key;
    for (const k of Object.keys(params)) {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    }
    return msg;
}

// --- 상수 및 경로 정의 ---
const HOME_DIR = os.homedir();
const CONFIG_FILE = path.join(HOME_DIR, '.asc-config.json');
const SOURCES_DIR = path.join(HOME_DIR, '.asc_sources');
const CLAUDE_SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills');
const CODEX_SKILLS_DIR = path.join(process.cwd(), '.codex', 'skills');
const GEMINI_SKILLS_DIR = path.join(process.cwd(), '.gemini', 'skills');

// --- 스타일 유틸리티 ---
const styles = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
};

function log(msg, style = styles.reset) {
    console.log(`${style}${msg}${styles.reset}`);
}

function runCmd(command, cwd = process.cwd(), ignoreError = false) {
    try {
        return execSync(command, { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
    } catch (error) {
        if (!ignoreError) throw error;
        return null;
    }
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function resolveHome(filepath) {
    if (filepath.startsWith('~')) {
        return path.join(HOME_DIR, filepath.slice(1));
    }
    return path.resolve(filepath);
}

// --- Config 관리 ---
const DEFAULT_CONFIG = { sources: {} };

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (config.active) delete config.active;
        return config;
    } catch (e) {
        return { ...DEFAULT_CONFIG };
    }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// 소스 내 스킬 검색 (2단계)
// 1단계: .claude/skills 폴더 내 스킬 검색
// 2단계: 소스 루트에서 skill-*/SKILL.md 패턴 검색
function findSkills(sourceDir) {
    if (!fs.existsSync(sourceDir)) return [];
    const skills = [];
    const addedSkills = new Set(); // 중복 방지

    // 1단계: 에이전트 전용 폴더 검색 (.claude, .gemini, .codex)
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
                            skills.push({ name: item, path: itemPath, location: folder.label });
                            addedSkills.add(item);
                        }
                    }
                } catch (e) { /* 무시 */ }
            });
        }
    });

    // 2단계: 소스 루트에서 SKILL.md가 포함된 폴더 검색
    const rootItems = fs.readdirSync(sourceDir);
    rootItems.forEach(item => {
        if (item.startsWith('.') || item === 'node_modules') return;

        const itemPath = path.join(sourceDir, item);
        try {
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                const skillMdPath = path.join(itemPath, 'SKILL.md');
                if (fs.existsSync(skillMdPath) && !addedSkills.has(item)) {
                    skills.push({ name: item, path: itemPath, location: 'root' });
                    addedSkills.add(item);
                }
            }
        } catch (e) { /* 무시 */ }
    });

    return skills;
}

// 하위 호환성: 스킬 이름만 반환하는 헬퍼
function getSkillNames(skills) {
    return skills.map(s => typeof s === 'string' ? s : s.name);
}

// 심볼릭 링크 또는 복사 (Windows 호환, 파일 및 폴더 지원)
function linkOrCopy(source, dest, isDirectory = false) {
    try {
        if (fs.existsSync(dest) || fs.lstatSync(dest)) {
            if (isDirectory) {
                fs.rmSync(dest, { recursive: true, force: true });
            } else {
                fs.unlinkSync(dest);
            }
        }
    } catch (e) { /* 파일 없음 무시 */ }

    try {
        const symlinkType = isDirectory ? (os.platform() === 'win32' ? 'junction' : 'dir') : 'file';
        fs.symlinkSync(source, dest, symlinkType);
    } catch (e) {
        // 심볼릭 링크 실패 시 복사
        if (isDirectory) {
            fs.cpSync(source, dest, { recursive: true });
        } else {
            fs.copyFileSync(source, dest);
        }
    }
}

// --- 메인 로직 클래스 ---
class CastManager {
    constructor() {
        const rawConfig = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) : null;
        this.config = loadConfig();
        // 마이그레이션: active 필드가 있으면 제거하고 저장
        if (rawConfig && rawConfig.active) {
            saveConfig(this.config);
        }
    }

    // 1. 초기화 (Init)
    async init() {
        console.log(`\n   ${styles.bright}${t('header_title')}${styles.reset}\n`);
        log(t('init_msg'), styles.bright);

        ensureDir(SOURCES_DIR);
        ensureDir(CLAUDE_SKILLS_DIR);
        ensureDir(CODEX_SKILLS_DIR);
        ensureDir(GEMINI_SKILLS_DIR);

        // 기존 config 유지, 없으면 생성
        if (!fs.existsSync(CONFIG_FILE)) {
            saveConfig(DEFAULT_CONFIG);
            log(t('config_created', { path: CONFIG_FILE }), styles.green);
        } else {
            log(t('config_exists', { path: CONFIG_FILE }), styles.green);
        }

        log(t('next_steps'), styles.cyan);
        log(t('cmd_clone'));
        log(t('cmd_import'));
        log(t('cmd_use'));
    }

    // 2. 소스 추가 (Add Source) - 자동 감지
    async addSource(input) {
        if (!input) {
            input = await askQuestion(t('prompt_source'));
        }
        if (!input) return log(t('error_no_input'), styles.red);

        const target = input.trim();
        const isGit = target.startsWith('http') || target.startsWith('git@') || target.endsWith('.git');

        if (isGit) {
            await this._clone(target);
        } else {
            await this._import(target);
        }
    }

    // 내부: 외부 저장소 복제 (Clone)
    async _clone(externalUrl) {
        const repoName = path.basename(externalUrl, '.git') || 'external-skills';
        const destDir = path.join(SOURCES_DIR, repoName);

        if (fs.existsSync(destDir)) {
            log(t('warn_source_exists', { repoName }), styles.yellow);
            try {
                runCmd('git pull', destDir);
                log(t('success_source_updated', { repoName }), styles.green);
            } catch (e) {
                runCmd('git pull', destDir, true);
            }
        } else {
            log(t('info_cloning', { repoName }), styles.cyan);
            try {
                ensureDir(SOURCES_DIR);
                execSync(`git clone ${externalUrl} "${destDir}"`, { stdio: 'inherit' });
                log(t('success_source_added', { repoName }), styles.green);
            } catch (e) {
                log(t('error_clone_fail'), styles.red);
                return;
            }
        }

        this.config.sources[repoName] = { type: 'git', url: externalUrl };
        saveConfig(this.config);
        log(t('info_use_hint', { repoName }), styles.yellow);
    }

    // 내부: 로컬 폴더 추가 (Import)
    async _import(localPath) {
        const resolvedPath = fs.realpathSync(resolveHome(localPath));

        if (!fs.existsSync(resolvedPath)) {
            return log(t('error_path_not_found', { path: resolvedPath }), styles.red);
        }

        const sourceName = path.basename(resolvedPath);
        const linkPath = path.join(SOURCES_DIR, sourceName);

        ensureDir(SOURCES_DIR);

        if (fs.existsSync(linkPath)) {
            fs.rmSync(linkPath, { recursive: true, force: true });
        }

        try {
            const symlinkType = os.platform() === 'win32' ? 'junction' : 'dir';
            fs.symlinkSync(resolvedPath, linkPath, symlinkType);
            log(t('success_local_source', { sourceName }), styles.green);
        } catch (e) {
            log(t('error_symlink', { message: e.message }), styles.red);
            return;
        }

        this.config.sources[sourceName] = { type: 'local', path: resolvedPath };
        saveConfig(this.config);
        log(t('info_use_hint_simple', { sourceName }), styles.yellow);
    }

    // 4. 스킬 장착 (Use)
    async use(query, options = {}) {
        const sourceNames = Object.keys(this.config.sources);
        if (sourceNames.length === 0) {
            log(t('error_no_sources'), styles.red);
            return;
        }

        let sourceName, skillName;

        if (query && query.includes('/')) {
            // 직접 지정: source/skill
            const parts = query.split('/');
            sourceName = parts[0];
            skillName = parts.slice(1).join('/');
        } else {
            // 대화형 선택
            log(t('header_source_list'), styles.bright);
            sourceNames.forEach((name, i) => {
                const info = this.config.sources[name];
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                console.log(`  [${i + 1}] ${typeIcon} ${name}`);
            });

            const sourceIdx = await askQuestion(t('prompt_source_select'));
            sourceName = sourceNames[parseInt(sourceIdx) - 1];

            if (!sourceName) {
                return log(t('error_invalid_choice'), styles.red);
            }

            // 해당 소스의 스킬 목록 (폴더만)
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
                    await this._activateSkill(sourceName, skills[idx].name, skills[idx].path, options);
                }
            }
            return;
        }

        // 직접 지정된 경우
        await this._activateSkill(sourceName, skillName, null, options);
    }

    // 유틸리티: 현재 활성화된 스킬 목록 (심볼릭 링크 조사)
    _getActiveSkills() {
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
                        // SOURCES_DIR 내부를 가리키는지 확인하고 key 생성
                        if (targetPath.startsWith(SOURCES_DIR)) {
                            const relative = path.relative(SOURCES_DIR, targetPath);
                            // relative is like "source-name/.claude/skills/skill-name" or "source-name/skill-name"
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
                            // 외부 경로인 경우
                            active.push({
                                key: `local/${item}`,
                                path: targetPath,
                                name: item,
                                agent: agent.type
                            });
                        }
                    }
                } catch (e) { /* 무시 */ }
            });
        });
        return active;
    }

    async _activateSkill(sourceName, skillName, skillPath = null, options = {}) {
        const skillKey = `${sourceName}/${skillName}`;

        // 스킬 경로 결정: 직접 제공되었거나 탐색
        let sourcePath = skillPath;
        if (!sourcePath) {
            // 2단계 검색: 에이전트 폴더 우선, 그 다음 skill-* 패턴
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

        // 대상 에이전트 결정
        const agents = ['claude', 'gemini', 'codex'];
        const targets = [];

        const hasSpecificFlag = agents.some(a => options[a]);
        if (hasSpecificFlag) {
            agents.forEach(a => {
                if (options[a]) targets.push(a);
            });
        } else {
            targets.push(...agents);
        }

        let installedCount = 0;

        for (const agent of targets) {
            const agentRootDir = path.join(process.cwd(), `.${agent}`);
            // 해당 에이전트 폴더가 없으면 스킵
            if (!fs.existsSync(agentRootDir)) continue;

            const agentSkillsDir = path.join(agentRootDir, 'skills');
            ensureDir(agentSkillsDir);

            const destPath = path.join(agentSkillsDir, skillName);

            if (fs.existsSync(destPath)) {
                log(t('warn_skill_exists', { skillName: `${skillName} (.${agent})` }), styles.yellow);
                continue;
            }

            linkOrCopy(sourcePath, destPath, true); // 항상 폴더로 처리
            log(t('success_skill_installed', { skillName: `${skillName} -> .${agent}` }), styles.green);
            installedCount++;
        }

        if (installedCount === 0) {
            const targetList = targets.map(t => `.${t}`).join(', ');
            log(`${styles.yellow}No target directories found among [${targetList}]. Create .claude, .gemini, or .codex folder first.${styles.reset}`);
        }
    }

    // 5. 동기화 (Sync)
    sync() {
        log(t('info_syncing'), styles.bright);

        // A. 소스 업데이트 (Git 소스만)
        for (const [name, info] of Object.entries(this.config.sources)) {
            const sourceDir = path.join(SOURCES_DIR, name);
            if (info.type === 'git' && fs.existsSync(sourceDir)) {
                log(t('info_updating', { name }), styles.cyan);
                try {
                    runCmd('git pull', sourceDir, true);
                } catch (e) {
                    log(t('warn_update_fail', { name }), styles.yellow);
                }
            }
        }

        // B. Active 스킬 링크 갱신 (선택 사항: 현재는 소스 업데이트만 수행하거나, 기존 링크를 소스 경로에 맞춰 재연결 가능)
        const activeSkills = this._getActiveSkills();
        let linkCount = activeSkills.length;

        for (const skill of activeSkills) {
            const sourcePath = skill.path;
            if (!fs.existsSync(sourcePath)) {
                log(t('warn_source_missing', { key: skill.key }), styles.yellow);
                linkCount--;
                continue;
            }

            const agentDir = skill.agent === 'claude' ? CLAUDE_SKILLS_DIR :
                skill.agent === 'gemini' ? GEMINI_SKILLS_DIR : CODEX_SKILLS_DIR;
            const destPath = path.join(agentDir, skill.name);

            // 링크 재정의 (업데이트된 소스 반영)
            linkOrCopy(sourcePath, destPath, true);
        }

        log(t('success_sync_done', { count: linkCount }), styles.green);
    }

    // 7. 목록 (List) - 전체 상태 (스킬 + 소스)
    list() {
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

    // 7.1 소스 목록만 보기
    listSources() {
        log(t('header_registered_sources'), styles.bright);
        const sourceNames = Object.keys(this.config.sources);
        if (sourceNames.length === 0) {
            log(t('warn_no_registered_sources'), styles.yellow);
        } else {
            for (const [name, info] of Object.entries(this.config.sources)) {
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                const sourcePath = info.type === 'git' ? info.url : info.path;
                console.log(`   ${typeIcon} ${styles.bright}${name}${styles.reset} ${styles.blue}(${sourcePath})${styles.reset}`);
            }
        }
    }

    // 8. 제거 (Remove) - 보너스
    async remove(skillName) {
        const activeSkills = this._getActiveSkills();

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

    // 9. 소스 제거 (Remove Source)
    async removeSource(sourceName) {
        if (!sourceName) {
            const sourceNames = Object.keys(this.config.sources);
            if (sourceNames.length === 0) {
                return log(t('error_no_sources'), styles.red);
            }
            log(t('header_remove_source'), styles.bright);
            sourceNames.forEach((name, i) => {
                const info = this.config.sources[name];
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                console.log(`  [${i + 1}] ${typeIcon} ${name}`);
            });
            const idx = await askQuestion(t('prompt_number'));
            sourceName = sourceNames[parseInt(idx) - 1];
        }

        if (!sourceName || !this.config.sources[sourceName]) {
            return log(t('error_source_not_found'), styles.red);
        }

        log(t('info_removing_source', { sourceName }), styles.cyan);

        // A. 해당 소스에 포함된 active 스킬들 식별 및 제거
        const prefix = `${sourceName}/`;
        const activeSkills = this._getActiveSkills().filter(a => a.key.startsWith(prefix));

        if (activeSkills.length > 0) {
            log(t('info_removing_skills_count', { count: activeSkills.length }), styles.yellow);
            for (const skill of activeSkills) {
                const agentDir = skill.agent === 'claude' ? CLAUDE_SKILLS_DIR :
                    skill.agent === 'gemini' ? GEMINI_SKILLS_DIR : CODEX_SKILLS_DIR;
                const destPath = path.join(agentDir, skill.name);
                if (fs.existsSync(destPath)) {
                    fs.rmSync(destPath, { recursive: true, force: true });
                }
            }
        }

        // B. Config에서 소스 제거
        delete this.config.sources[sourceName];
        saveConfig(this.config);

        // C. ~/.asc_sources 에서 소스 제거
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

        log(t('success_source_removed', { sourceName }), styles.green);
    }

    // 10. 설정 (Config)
    configSet(key, value) {
        if (key === 'lang') {
            if (['en', 'ko'].includes(value)) {
                this.config.lang = value;
                saveConfig(this.config);
                // 즉시 언어 변경 반영
                initI18n(value);
                log(t('success_config_set', { key, value }), styles.green);
            } else {
                log(t('error_config_invalid'), styles.red);
            }
        } else {
            console.log(JSON.stringify(this.config, null, 2));
        }
    }
}

// --- CLI 실행 ---
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const subCommand = args[1];
    const param = args[2] || args[1]; // legacy or new structure support

    const manager = new CastManager();
    initI18n(manager.config.lang);

    switch (command) {
        case 'init':
            await manager.init();
            break;
        case 'source':
            if (subCommand === 'add') {
                await manager.addSource(args[2]);
            } else if (subCommand === 'remove' || subCommand === 'rm') {
                await manager.removeSource(args[2]);
            } else if (subCommand === 'sync') {
                manager.sync();
            } else if (subCommand === 'list' || subCommand === 'ls') {
                manager.listSources();
            } else {
                console.log(`
${styles.bright}${t('usage_source_header')}${styles.reset}
${t('usage_source_add')}
${t('usage_source_list')}
${t('usage_source_remove')}
${t('usage_source_sync')}
                `);
            }
            break;
        case 'use':
            const useArgs = args.slice(1); // 'use' 제외한 나머지
            const useFlags = {
                claude: useArgs.includes('--claude'),
                gemini: useArgs.includes('--gemini'),
                codex: useArgs.includes('--codex')
            };
            // flag가 아닌 첫번째 인자를 쿼리로 간주
            const query = useArgs.find(arg => !arg.startsWith('--'));
            await manager.use(query, useFlags);
            break;

        case 'list':
            manager.list();
            break;
        case 'remove':
        case 'uncast':
            await manager.remove(param);
            break;
        case 'config':
            manager.configSet(subCommand, param);
            break;
        default:
            console.log(`
${styles.magenta}${t('header_title')}${styles.reset}

${styles.bright}${t('usage_header')}${styles.reset}
${t('usage_init')}
${t('usage_source_add_general')}
${t('usage_source_list_general')}
${t('usage_source_remove_general')}
${t('usage_use')}
${t('usage_sync')}
${t('usage_list')}
${t('usage_remove')}
${t('usage_config')}

${styles.cyan}${t('usage_example')}${styles.reset}
${t('usage_ex_1')}
${t('usage_ex_2')}
            `);
    }
}

main().catch(console.error);