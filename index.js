#!/usr/bin/env node

/**
 * 🧙‍♂️ Agent Skill Cast (ASC)
 * "AI 에이전트 스킬을 시전(Cast)하세요."
 * * 기능: 스마트 동기화, 충돌 자동 해결(Auto-Rebase), 심볼릭 링크
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const readline = require('readline');

// --- 상수 및 경로 정의 ---
const HOME_DIR = os.homedir();
// 설정 파일명을 asc(Agent Skill Cast) 약어로 변경
const CONFIG_FILE = path.join(HOME_DIR, '.asc-config.json'); 
const STORAGE_DIR = path.join(HOME_DIR, '.asc_store');
// Claude Code가 스킬을 읽는 글로벌 경로 (추후 다른 에이전트가 생기면 확장 가능)
const CLAUDE_GLOBAL_DIR = path.join(HOME_DIR, '.claude', 'commands');

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

// 명령어 실행 래퍼
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

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {
        return null;
    }
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
  ${styles.bright}Agent Skill Cast${styles.reset}
        `);
        log("🚀 ASC: 에이전트 스킬 동기화 초기화\n", styles.bright);
        
        const repoUrl = await askQuestion("🔗 스킬 Git 저장소 URL: ");
        
        if (!repoUrl) {
            log("❌ URL이 필요합니다.", styles.red);
            return;
        }

        const config = { repoUrl: repoUrl.trim() };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        log(`\n✅ 설정 파일 생성됨: ${CONFIG_FILE}`, styles.green);
        
        if (fs.existsSync(STORAGE_DIR)) {
            fs.rmSync(STORAGE_DIR, { recursive: true, force: true });
        }
        
        log("📦 스킬 저장소 소환 중...", styles.cyan);
        try {
            execSync(`git clone ${config.repoUrl} ${STORAGE_DIR}`, { stdio: 'inherit' });
            log("✅ 준비 완료! 'cast sync' 명령어로 스킬을 장착하세요.", styles.green);
        } catch (e) {
            log(`❌ 저장소 연결 실패. URL을 확인하세요.`, styles.red);
        }
    }

    // 2. 동기화 (Sync)
    sync() {
        if (!this.config) {
            log("❌ 'cast init'을 먼저 실행해주세요.", styles.red);
            return;
        }

        log("\n🔄 스킬 동기화 (Casting Skills...)", styles.bright);

        // A. 저장소 최신화
        if (!fs.existsSync(STORAGE_DIR)) {
            try {
                execSync(`git clone ${this.config.repoUrl} ${STORAGE_DIR}`, { stdio: 'inherit' });
            } catch (e) {
                log(`❌ 저장소 연결 실패`, styles.red);
                return;
            }
        } else {
            try {
                // 안전하게 Fetch -> Status Check -> Pull
                runCmd('git fetch origin', STORAGE_DIR);
                const status = runCmd('git status --porcelain', STORAGE_DIR, true);
                
                if (!status) {
                    runCmd('git pull origin main', STORAGE_DIR); 
                } else {
                    log("⚠️ 로컬 변경사항이 있어 Pull을 건너뜁니다. (Publish 권장)", styles.yellow);
                }
            } catch (e) {
                log("⚠️ 오프라인 모드: 로컬 캐시된 스킬을 사용합니다.", styles.yellow);
            }
        }

        // B. 심볼릭 링크 연결
        ensureDir(CLAUDE_GLOBAL_DIR);
        let linkCount = 0;

        const categories = fs.readdirSync(STORAGE_DIR).filter(item => {
            return fs.statSync(path.join(STORAGE_DIR, item)).isDirectory() && item !== '.git';
        });

        categories.forEach(category => {
            const catDir = path.join(STORAGE_DIR, category);
            const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));

            files.forEach(file => {
                const sourcePath = path.join(catDir, file);
                const linkName = `${category}-${file}`; 
                const targetPath = path.join(CLAUDE_GLOBAL_DIR, linkName);

                try {
                    if (fs.existsSync(targetPath) || fs.lstatSync(targetPath, {throwIfNoEntry: false})) {
                        fs.unlinkSync(targetPath);
                    }
                    fs.symlinkSync(sourcePath, targetPath);
                    linkCount++;
                } catch (e) {}
            });
        });

        log(`✨ 시전 완료! 총 ${linkCount}개의 스킬이 장착되었습니다.`, styles.green);
    }

    // 3. 배포 (Publish)
    async publish() {
        if (!this.config) {
            log("❌ 'cast init' 필요", styles.red);
            return;
        }

        log("\n📤 스킬 공유 (Cast Publish)", styles.bright);

        const cwd = process.cwd();
        const mdFiles = fs.readdirSync(cwd).filter(f => f.endsWith('.md'));

        if (mdFiles.length === 0) {
            log("⚠️ 현재 폴더에 공유할 .md 파일이 없습니다.", styles.yellow);
            return;
        }

        mdFiles.forEach((f, i) => console.log(`[${i + 1}] ${f}`));

        const fileIdx = await askQuestion("\n공유할 스킬 번호: ");
        const selectedFile = mdFiles[parseInt(fileIdx) - 1];

        if (!selectedFile) {
            log("❌ 잘못된 선택입니다.", styles.red);
            return;
        }

        const category = await askQuestion("카테고리 (예: common, mobile): ");
        const safeCategory = category.trim() || 'common';
        
        const commitMsg = await askQuestion("스킬 설명 (Commit Msg): ");

        const destDir = path.join(STORAGE_DIR, safeCategory);
        ensureDir(destDir);
        
        // 파일 복사
        fs.copyFileSync(path.join(cwd, selectedFile), path.join(destDir, selectedFile));
        log(`✅ 스크롤(파일) 복사됨: ${safeCategory}/${selectedFile}`, styles.cyan);

        try {
            log("☁️  마나 동기화 중 (Server Sync)...", styles.cyan);
            
            // 1. Commit
            runCmd('git add .', STORAGE_DIR);
            runCmd(`git commit -m "[Skill] ${commitMsg || 'Update skill'}"`, STORAGE_DIR);

            // 2. Rebase (충돌 방지)
            try {
                runCmd('git pull --rebase origin main', STORAGE_DIR);
            } catch (rebaseError) {
                log("⚠️  충돌 발생! 수동 해결이 필요합니다.", styles.red);
                log(`   위치: ${STORAGE_DIR}`, styles.yellow);
                return;
            }

            // 3. Push
            runCmd('git push origin main', STORAGE_DIR);
            
            log(`\n🎉 공유 성공! 팀원들이 'cast sync'로 사용할 수 있습니다.`, styles.green);
            this.sync(); 

        } catch (e) {
            log(`❌ 공유 실패: ${e.message}`, styles.red);
        }
    }

    // 4. 목록 (List)
    list() {
        log("\n📜 장착된 스킬 목록 (.claude/commands/)", styles.bright);
        if (!fs.existsSync(CLAUDE_GLOBAL_DIR)) return;

        const files = fs.readdirSync(CLAUDE_GLOBAL_DIR).filter(f => f.endsWith('.md'));
        if (files.length === 0) {
            log("장착된 스킬이 없습니다.", styles.yellow);
        } else {
            files.forEach(f => console.log(`- ${styles.green}${f}${styles.reset}`));
        }
        console.log("");
    }

    help() {
        console.log(`
${styles.bright}Usage: cast <command>${styles.reset}

Commands:
  ${styles.cyan}init${styles.reset}     저장소 연결 (마법서 펼치기)
  ${styles.cyan}sync${styles.reset}     스킬 동기화 (주문 외우기)
  ${styles.cyan}publish${styles.reset}  스킬 공유 (주문 전파)
  ${styles.cyan}list${styles.reset}     목록 확인 (보유 스킬)
`);
    }
}

const manager = new CastManager();
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'init': manager.init(); break;
    case 'sync': manager.sync(); break;
    case 'publish': manager.publish(); break;
    case 'ls': case 'list': manager.list(); break;
    default: manager.help();
}
