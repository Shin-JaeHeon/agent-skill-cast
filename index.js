#!/usr/bin/env node

/**
 * 🧙‍♂️ Agent Skill Cast (ASC) v2.0
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
        console.log(`
${styles.magenta}   _______  _______  _______ 
   (  ___  )(  ____ \\(  ____ \\
   | (   ) || (    \\/| (    \\/
   | (___) || (_____ | |      
   |  ___  |(_____  )| |      
   | (   ) |      ) || |      
   | )   ( |/\\____) || (____/\\
   |/     \\|\\_______)(_______/ ${styles.reset}
   ${styles.bright}Agent Skill Cast v2.0${styles.reset}
        `);
        log("🚀 ASC: 에이전트 스킬 동기화 초기화\n", styles.bright);

        ensureDir(SOURCES_DIR);
        ensureDir(CLAUDE_SKILLS_DIR);
        ensureDir(CODEX_SKILLS_DIR);
        ensureDir(GEMINI_SKILLS_DIR);

        // 기존 config 유지, 없으면 생성
        if (!fs.existsSync(CONFIG_FILE)) {
            saveConfig(DEFAULT_CONFIG);
            log(`✅ 설정 파일 생성됨: ${CONFIG_FILE}`, styles.green);
        } else {
            log(`✅ 기존 설정 파일 확인됨: ${CONFIG_FILE}`, styles.green);
        }

        log("\n💡 다음 단계:", styles.cyan);
        log("   1. cast clone <URL>  - 외부 Git 저장소 추가");
        log("   2. cast import <경로> - 로컬 폴더 추가");
        log("   3. cast use          - 스킬 장착");
    }

    // 2. 외부 저장소 복제 (Clone) - 소스로 등록
    async clone(externalUrl) {
        if (!externalUrl) {
            externalUrl = await askQuestion("🔗 추가할 외부 Git 저장소 URL: ");
        }
        if (!externalUrl) return log("❌ URL이 입력되지 않았습니다.", styles.red);

        // 저장소 이름 추출
        const repoName = path.basename(externalUrl.trim(), '.git') || 'external-skills';
        const destDir = path.join(SOURCES_DIR, repoName);

        if (fs.existsSync(destDir)) {
            log(`⚠️  '${repoName}' 소스가 이미 존재합니다. 업데이트합니다.`, styles.yellow);
            try {
                runCmd('git pull origin main', destDir);
                log(`✅ '${repoName}' 소스 업데이트 완료!`, styles.green);
            } catch (e) {
                runCmd('git pull', destDir, true);
            }
        } else {
            log(`\n📦 소스 저장소 복제 중: ${repoName}`, styles.cyan);
            try {
                ensureDir(SOURCES_DIR);
                execSync(`git clone ${externalUrl.trim()} "${destDir}"`, { stdio: 'inherit' });
                log(`✅ '${repoName}' 소스 추가 완료!`, styles.green);
            } catch (e) {
                log(`❌ 저장소 복제 실패. URL을 확인하세요.`, styles.red);
                return;
            }
        }

        // Config에 소스 등록
        this.config.sources[repoName] = { type: 'git', url: externalUrl.trim() };
        saveConfig(this.config);

        log(`\n💡 'cast use ${repoName}/<스킬명>'으로 스킬을 장착하세요.`, styles.yellow);
    }

    // 3. 로컬 폴더 추가 (Import) - 소스로 등록
    async import(localPath) {
        if (!localPath) {
            localPath = await askQuestion("� 추가할 로컬 폴더 경로: ");
        }
        if (!localPath) return log("❌ 경로가 입력되지 않았습니다.", styles.red);

        const resolvedPath = fs.realpathSync(resolveHome(localPath.trim()));

        if (!fs.existsSync(resolvedPath)) {
            return log(`❌ 경로가 존재하지 않습니다: ${resolvedPath}`, styles.red);
        }

        const sourceName = path.basename(resolvedPath);
        const linkPath = path.join(SOURCES_DIR, sourceName);

        ensureDir(SOURCES_DIR);

        // 이미 존재하면 제거
        if (fs.existsSync(linkPath)) {
            fs.rmSync(linkPath, { recursive: true, force: true });
        }

        try {
            // Windows에서는 junction 사용 (관리자 권한 불필요)
            const symlinkType = os.platform() === 'win32' ? 'junction' : 'dir';
            fs.symlinkSync(resolvedPath, linkPath, symlinkType);
            log(`✅ '${sourceName}' 로컬 소스 연결 완료! (Symbolic Clone)`, styles.green);
            log(`   🔗 원본: ${resolvedPath}`, styles.cyan);
            log(`   📍 링크: ${linkPath}`, styles.cyan);
        } catch (e) {
            log(`❌ 심볼릭 링크 생성 실패: ${e.message}`, styles.red);
            return;
        }

        // Config에 소스 등록
        this.config.sources[sourceName] = { type: 'local', path: resolvedPath };
        saveConfig(this.config);

        log(`\n💡 'cast use ${sourceName}/<스킬명>'으로 스킬을 장착하세요.`, styles.yellow);
    }

    // 4. 스킬 장착 (Use)
    async use(query) {
        const sourceNames = Object.keys(this.config.sources);
        if (sourceNames.length === 0) {
            log("❌ 등록된 소스가 없습니다. 'cast clone' 또는 'cast import'를 먼저 실행하세요.", styles.red);
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
            log("\n📚 등록된 소스 목록:", styles.bright);
            sourceNames.forEach((name, i) => {
                const info = this.config.sources[name];
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                console.log(`  [${i + 1}] ${typeIcon} ${name}`);
            });

            const sourceIdx = await askQuestion("\n소스 번호 선택: ");
            sourceName = sourceNames[parseInt(sourceIdx) - 1];

            if (!sourceName) {
                return log("❌ 잘못된 선택입니다.", styles.red);
            }

            // 해당 소스의 스킬 목록 (폴더만)
            const sourceDir = path.join(SOURCES_DIR, sourceName);
            const skills = findSkills(sourceDir);

            if (skills.length === 0) {
                return log(`⚠️  '${sourceName}'에서 스킬을 찾을 수 없습니다.`, styles.yellow);
            }

            log(`\n📂 '${sourceName}'의 스킬 목록:`, styles.bright);
            skills.forEach((skill, i) => {
                const labelColor = skill.location === 'claude' ? styles.cyan :
                    skill.location === 'gemini' ? styles.yellow :
                        skill.location === 'codex' ? styles.magenta : styles.bright;
                const locationTag = labelColor + `[${skill.location}]`;
                console.log(`  [${i + 1}] 📁 ${skill.name} ${locationTag}${styles.reset}`);
            });

            const skillIdx = await askQuestion("\n장착할 스킬 번호 (쉼표로 다중 선택): ");
            const indices = skillIdx.split(',').map(s => parseInt(s.trim()) - 1);

            for (const idx of indices) {
                if (skills[idx]) {
                    await this._activateSkill(sourceName, skills[idx].name, skills[idx].path);
                }
            }
            return;
        }

        // 직접 지정된 경우
        await this._activateSkill(sourceName, skillName);
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

    async _activateSkill(sourceName, skillName, skillPath = null) {
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
                return log(`❌ 스킬을 찾을 수 없습니다: ${skillKey}`, styles.red);
            }
        }

        if (!fs.existsSync(sourcePath)) {
            return log(`❌ 스킬을 찾을 수 없습니다: ${skillKey}`, styles.red);
        }

        // .claude/skills 폴더에 폴더 전체를 symlink
        const destPath = path.join(CLAUDE_SKILLS_DIR, skillName);

        if (fs.existsSync(destPath)) {
            return log(`⚠️  '${skillName}' 스킬이 이미 존재합니다.`, styles.yellow);
        }

        ensureDir(CLAUDE_SKILLS_DIR);
        linkOrCopy(sourcePath, destPath, true); // 항상 폴더로 처리

        log(`✨ 📂 '${skillName}' 스킬 장착 완료!`, styles.green);
    }

    // 5. 동기화 (Sync)
    sync() {
        log("\n🔄 스킬 동기화 중...", styles.bright);

        // A. 소스 업데이트 (Git 소스만)
        for (const [name, info] of Object.entries(this.config.sources)) {
            const sourceDir = path.join(SOURCES_DIR, name);
            if (info.type === 'git' && fs.existsSync(sourceDir)) {
                log(`   📥 ${name} 업데이트 중...`, styles.cyan);
                try {
                    runCmd('git pull', sourceDir, true);
                } catch (e) {
                    log(`   ⚠️  ${name} 업데이트 실패 (오프라인?)`, styles.yellow);
                }
            }
        }

        // B. Active 스킬 링크 갱신 (선택 사항: 현재는 소스 업데이트만 수행하거나, 기존 링크를 소스 경로에 맞춰 재연결 가능)
        const activeSkills = this._getActiveSkills();
        let linkCount = activeSkills.length;

        for (const skill of activeSkills) {
            const sourcePath = skill.path;
            if (!fs.existsSync(sourcePath)) {
                log(`   ⚠️  ${skill.key} 소스 폴더 없음 (스킵)`, styles.yellow);
                linkCount--;
                continue;
            }

            const agentDir = skill.agent === 'claude' ? CLAUDE_SKILLS_DIR :
                skill.agent === 'gemini' ? GEMINI_SKILLS_DIR : CODEX_SKILLS_DIR;
            const destPath = path.join(agentDir, skill.name);

            // 링크 재정의 (업데이트된 소스 반영)
            linkOrCopy(sourcePath, destPath, true);
        }

        log(`\n✨ 동기화 완료! ${linkCount}개의 스킬이 유지되고 있습니다.`, styles.green);
    }

    // 7. 목록 (List)
    list() {
        const agentFolders = [
            { name: 'Claude', dir: CLAUDE_SKILLS_DIR, color: styles.cyan },
            { name: 'Codex', dir: CODEX_SKILLS_DIR, color: styles.magenta },
            { name: 'Gemini', dir: GEMINI_SKILLS_DIR, color: styles.yellow }
        ];

        log("\n🧙‍♂️ 현재 프로젝트의 에이전트 스킬", styles.bright);

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
                    log(`\n ${agent.color}[${agent.name}]${styles.reset} 스킬:`, styles.bright);
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

                                sourceInfo = ` ${styles.blue}(🔗 ${displayPath})${styles.reset}`;
                            } else {
                                sourceInfo = ` ${styles.yellow}[local]${styles.reset}`;
                            }
                        } catch (e) { /* ignore */ }

                        console.log(`   ${styles.green}✓${styles.reset} ${skill}${sourceInfo}`);
                    });
                }
            }
        });

        if (!foundAny) {
            log("   장착된 프로젝트 스킬이 없습니다.", styles.yellow);
            log("   💡 'cast use'로 스킬을 장착하세요.", styles.cyan);
        }

        log("\n📚 등록된 소스 목록", styles.bright);
        const sourceNames = Object.keys(this.config.sources);
        if (sourceNames.length === 0) {
            log("   등록된 소스가 없습니다.", styles.yellow);
        } else {
            for (const [name, info] of Object.entries(this.config.sources)) {
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                console.log(`   ${typeIcon} ${name}`);
            }
        }
    }

    // 8. 제거 (Remove) - 보너스
    async remove(skillName) {
        const activeSkills = this._getActiveSkills();

        if (!skillName) {
            if (activeSkills.length === 0) {
                return log("❌ 제거할 스킬이 없습니다.", styles.red);
            }
            log("\n🗑️  제거할 스킬 선택:", styles.bright);
            activeSkills.forEach((item, i) => {
                console.log(`  [${i + 1}] ${item.key}`);
            });
            const idx = await askQuestion("\n번호: ");
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

        log(`✅ 📂 '${path.basename(targetKey)}' 스킬이 제거되었습니다.`, styles.green);
    }

    // 9. 소스 제거 (Remove Source)
    async removeSource(sourceName) {
        if (!sourceName) {
            const sourceNames = Object.keys(this.config.sources);
            if (sourceNames.length === 0) {
                return log("❌ 등록된 소스가 없습니다.", styles.red);
            }
            log("\n🗑️  제거할 소스 선택:", styles.bright);
            sourceNames.forEach((name, i) => {
                const info = this.config.sources[name];
                const typeIcon = info.type === 'git' ? '🌐' : '📁';
                console.log(`  [${i + 1}] ${typeIcon} ${name}`);
            });
            const idx = await askQuestion("\n번호: ");
            sourceName = sourceNames[parseInt(idx) - 1];
        }

        if (!sourceName || !this.config.sources[sourceName]) {
            return log("❌ 소스를 찾을 수 없습니다.", styles.red);
        }

        log(`\n🔄 소스 '${sourceName}' 및 관련 스킬 제거 중...`, styles.cyan);

        // A. 해당 소스에 포함된 active 스킬들 식별 및 제거
        const prefix = `${sourceName}/`;
        const activeSkills = this._getActiveSkills().filter(a => a.key.startsWith(prefix));

        if (activeSkills.length > 0) {
            log(`   🗑️  장착된 스킬 ${activeSkills.length}개 제거 중...`, styles.yellow);
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
                log(`⚠️  소스 폴더 제거 중 오류 발생: ${e.message}`, styles.yellow);
            }
        }

        log(`\n✅ 소스 '${sourceName}'과 관련 스킬들이 모두 제거되었습니다.`, styles.green);
    }
}

// --- CLI 실행 ---
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const param = args[1];

    const manager = new CastManager();

    switch (command) {
        case 'init':
            await manager.init();
            break;
        case 'clone':
            await manager.clone(param);
            break;
        case 'import':
            await manager.import(param);
            break;
        case 'use':
            await manager.use(param);
            break;
        case 'sync':
            manager.sync();
            break;

        case 'list':
            manager.list();
            break;
        case 'remove':
        case 'uncast':
            await manager.remove(param);
            break;
        case 'unclone':
        case 'unimport':
            await manager.removeSource(param);
            break;
        default:
            console.log(`
${styles.magenta}🧙‍♂️ Agent Skill Cast (ASC) v2.0${styles.reset}

${styles.bright}사용법:${styles.reset}
  cast init                    - 초기화
  cast clone <URL>             - 외부 Git 저장소를 소스로 추가
  cast import <경로>            - 로컬 폴더를 소스로 추가
  cast use [소스/스킬]          - 스킬 장착 (대화형 또는 직접 지정)
  cast sync                    - 소스 업데이트 및 스킬 동기화
  cast list                    - 장착된 스킬 및 소스 목록
  cast remove [스킬명]          - 스킬 제거
  cast unclone [소스명]         - Git 소스 제거
  cast unimport [소스명]        - 로컬 폴더 소스 제거

${styles.cyan}예시:${styles.reset}
  cast clone https://github.com/ComposioHQ/awesome-claude-skills
  cast use awesome-claude-skills/connect
  cast unclone awesome-claude-skills
            `);
    }
}

main().catch(console.error);