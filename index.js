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
 * - publish: Git 소스에 스킬 배포
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
const CLAUDE_SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills'); // 현재 프로젝트 폴더

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
const DEFAULT_CONFIG = { sources: {}, active: [] };

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
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

    // 1단계: .claude/skills 폴더 검색
    const claudeSkillsDir = path.join(sourceDir, '.claude', 'skills');
    if (fs.existsSync(claudeSkillsDir)) {
        const claudeItems = fs.readdirSync(claudeSkillsDir);
        claudeItems.forEach(item => {
            if (item.startsWith('.') || item === 'node_modules') return;

            const itemPath = path.join(claudeSkillsDir, item);
            try {
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    // SKILL.md가 있는지 확인 (선택적)
                    const skillMdPath = path.join(itemPath, 'SKILL.md');
                    if (fs.existsSync(skillMdPath)) {
                        skills.push({ name: item, path: itemPath, location: 'claude' });
                        addedSkills.add(item);
                    }
                }
            } catch (e) { /* 무시 */ }
        });
    }

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
        this.config = loadConfig();
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

        const resolvedPath = resolveHome(localPath.trim());

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
            log(`✅ '${sourceName}' 로컬 소스 연결 완료!`, styles.green);
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
                const locationTag = skill.location === 'claude' ? styles.cyan + '[claude]' : styles.magenta + '[root]';
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

    async _activateSkill(sourceName, skillName, skillPath = null) {
        const skillKey = `${sourceName}/${skillName}`;

        // 스킬 경로 결정: 직접 제공되었거나 탐색
        let sourcePath = skillPath;
        if (!sourcePath) {
            // 2단계 검색: .claude/skills 우선, 그 다음 skill-* 패턴
            const sourceDir = path.join(SOURCES_DIR, sourceName);
            const claudeSkillPath = path.join(sourceDir, '.claude', 'skills', skillName);
            const rootSkillPath = path.join(sourceDir, skillName);

            if (fs.existsSync(claudeSkillPath) && fs.existsSync(path.join(claudeSkillPath, 'SKILL.md'))) {
                sourcePath = claudeSkillPath;
            } else if (fs.existsSync(rootSkillPath) && fs.existsSync(path.join(rootSkillPath, 'SKILL.md'))) {
                sourcePath = rootSkillPath;
            } else {
                return log(`❌ 스킬을 찾을 수 없습니다: ${skillKey}`, styles.red);
            }
        }

        if (!fs.existsSync(sourcePath)) {
            return log(`❌ 스킬을 찾을 수 없습니다: ${skillKey}`, styles.red);
        }

        // Active 목록에 추가 (경로 정보도 저장)
        const activeEntry = { key: skillKey, path: sourcePath };
        const existingIdx = this.config.active.findIndex(a =>
            (typeof a === 'string' ? a : a.key) === skillKey
        );
        if (existingIdx === -1) {
            this.config.active.push(activeEntry);
            saveConfig(this.config);
        }

        // .claude/skills 폴더에 폴더 전체를 symlink
        const destPath = path.join(CLAUDE_SKILLS_DIR, skillName);

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

        // B. Active 스킬 링크 갱신
        ensureDir(CLAUDE_SKILLS_DIR);
        let linkCount = 0;

        for (const activeItem of this.config.active) {
            // 하위 호환성: 문자열 또는 객체 지원
            const skillKey = typeof activeItem === 'string' ? activeItem : activeItem.key;
            let sourcePath = typeof activeItem === 'object' ? activeItem.path : null;

            if (!sourcePath) {
                // 기존 방식: SOURCES_DIR/key 경로
                sourcePath = path.join(SOURCES_DIR, skillKey);

                // 없으면 2단계 검색 시도
                if (!fs.existsSync(sourcePath)) {
                    const parts = skillKey.split('/');
                    if (parts.length >= 2) {
                        const sourceDir = path.join(SOURCES_DIR, parts[0]);
                        const skillName = parts.slice(1).join('/');
                        const claudePath = path.join(sourceDir, '.claude', 'skills', skillName);
                        if (fs.existsSync(claudePath)) sourcePath = claudePath;
                    }
                }
            }

            if (!fs.existsSync(sourcePath)) {
                log(`   ⚠️  ${skillKey} 폴더 없음 (스킵)`, styles.yellow);
                continue;
            }

            const skillName = path.basename(skillKey);
            const destPath = path.join(CLAUDE_SKILLS_DIR, skillName);

            linkOrCopy(sourcePath, destPath, true); // 폴더로 처리
            linkCount++;
        }

        log(`\n✨ 동기화 완료! ${linkCount}개의 스킬이 장착되어 있습니다.`, styles.green);
    }

    // 6. 배포 (Publish)
    async publish(skillName) {
        log("\n📤 스킬 배포", styles.bright);

        let targetSkillKey;

        if (skillName) {
            // 스킬명으로 검색
            const found = this.config.active.find(item => {
                const key = typeof item === 'string' ? item : item.key;
                return path.basename(key).toLowerCase() === skillName.toLowerCase() ||
                    key.toLowerCase().includes(skillName.toLowerCase());
            });
            targetSkillKey = found ? (typeof found === 'string' ? found : found.key) : null;
        } else {
            // 대화형 선택
            if (this.config.active.length === 0) {
                return log("❌ 배포할 활성 스킬이 없습니다.", styles.red);
            }

            log("\n🔮 활성 스킬 목록:", styles.bright);
            this.config.active.forEach((item, i) => {
                const key = typeof item === 'string' ? item : item.key;
                console.log(`  [${i + 1}] ${key}`);
            });

            const idx = await askQuestion("\n배포할 스킬 번호: ");
            const selected = this.config.active[parseInt(idx) - 1];
            targetSkillKey = typeof selected === 'string' ? selected : selected?.key;
        }

        if (!targetSkillKey) {
            return log("❌ 스킬을 찾을 수 없습니다.", styles.red);
        }

        const parts = targetSkillKey.split('/');
        const sourceName = parts[0];
        const sourceInfo = this.config.sources[sourceName];

        if (!sourceInfo || sourceInfo.type !== 'git') {
            return log(`❌ '${sourceName}'은(는) Git 소스가 아니므로 배포할 수 없습니다.`, styles.red);
        }

        const sourceDir = path.join(SOURCES_DIR, sourceName);
        const commitMsg = await askQuestion("📝 커밋 메시지: ");

        try {
            runCmd('git add .', sourceDir);
            runCmd(`git commit -m "${commitMsg || 'Update skill'}"`, sourceDir);

            try {
                runCmd('git pull --rebase origin main', sourceDir);
            } catch (e) {
                log("⚠️  충돌 발생! 수동 해결이 필요합니다.", styles.red);
                log(`   위치: ${sourceDir}`, styles.yellow);
                return;
            }

            runCmd('git push origin main', sourceDir);
            log(`\n🎉 배포 성공! 팀원들이 'cast sync'로 업데이트할 수 있습니다.`, styles.green);

        } catch (e) {
            log(`❌ 배포 실패: ${e.message}`, styles.red);
        }
    }

    // 7. 목록 (List)
    list() {
        log("\n📜 현재 장착된 스킬 목록", styles.bright);

        if (this.config.active.length === 0) {
            log("   장착된 스킬이 없습니다.", styles.yellow);
            log("   💡 'cast use'로 스킬을 장착하세요.", styles.cyan);
        } else {
            this.config.active.forEach(item => {
                const skillKey = typeof item === 'string' ? item : item.key;
                const skillName = path.basename(skillKey);
                console.log(`   ${styles.green}✓${styles.reset} ${skillName} ${styles.cyan}(${skillKey})${styles.reset}`);
            });
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
        if (!skillName) {
            if (this.config.active.length === 0) {
                return log("❌ 제거할 스킬이 없습니다.", styles.red);
            }
            log("\n🗑️  제거할 스킬 선택:", styles.bright);
            this.config.active.forEach((item, i) => {
                const key = typeof item === 'string' ? item : item.key;
                console.log(`  [${i + 1}] ${key}`);
            });
            const idx = await askQuestion("\n번호: ");
            const selected = this.config.active[parseInt(idx) - 1];
            skillName = typeof selected === 'string' ? selected : selected?.key;
        }

        const targetIdx = this.config.active.findIndex(item => {
            const key = typeof item === 'string' ? item : item.key;
            return key === skillName || path.basename(key).toLowerCase() === skillName.toLowerCase();
        });

        if (targetIdx === -1) {
            return log("❌ 스킬을 찾을 수 없습니다.", styles.red);
        }

        const targetItem = this.config.active[targetIdx];
        const targetKey = typeof targetItem === 'string' ? targetItem : targetItem.key;

        // Active에서 제거
        this.config.active.splice(targetIdx, 1);
        saveConfig(this.config);

        // 심볼릭 링크/폴더 제거
        const destPath = path.join(CLAUDE_SKILLS_DIR, path.basename(targetKey));
        if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
        }

        log(`✅ 📂 '${path.basename(targetKey)}' 스킬이 제거되었습니다.`, styles.green);
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
        case 'publish':
            await manager.publish(param);
            break;
        case 'list':
            manager.list();
            break;
        case 'remove':
        case 'uncast':
            await manager.remove(param);
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
  cast publish [스킬명]         - Git 소스에 스킬 배포
  cast list                    - 장착된 스킬 및 소스 목록
  cast remove [스킬명]          - 스킬 제거

${styles.cyan}예시:${styles.reset}
  cast clone https://github.com/ComposioHQ/awesome-claude-skills
  cast use awesome-claude-skills/connect
  cast publish my-custom-skill
            `);
    }
}

main().catch(console.error);