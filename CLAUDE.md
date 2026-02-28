# CLAUDE.md

Agent Skill Cast (ASC) - AI agent skill을 git 저장소/로컬 폴더에서 프로젝트의 `.claude/`, `.gemini/`, `.codex/` 디렉토리로 심링크 기반 동기화하는 CLI 도구. 바이너리: `cast`. 외부 의존성 없음 (Node.js built-in만 사용).

## 실행 & 검증

```bash
node src/index.js                    # 직접 실행
node src/index.js --ci               # CI/비대화 모드
node src/index.js --ci --json        # JSON 출력 모드
npm start                            # node src/index.js와 동일
```

테스트 프레임워크, 린터, 빌드 시스템 없음. 수동 검증:
```bash
node src/index.js init
node src/index.js source list --ci --json
node src/index.js list --ci --json
```

## 아키텍처

CommonJS 모듈 (`require`/`module.exports`). 트랜스파일 없음.

### 엔트리 포인트
`src/index.js` - CLI 디스패처. `process.argv` 파싱, `--ci`/`--json`/`--copy` 메타 플래그 추출 후 switch문으로 커맨드 라우팅.

### Core 모듈 (`src/core/`)

| 파일 | 역할 | 주요 export |
|------|------|------------|
| `config.js` | `~/.asc-config.json` 읽기/쓰기 | `loadConfig()`, `saveConfig()`, `CONFIG_FILE`, `SOURCES_DIR` |
| `i18n.js` | 번역 시스템 (en/ko) | `initI18n(lang)`, `t(key, params)` |
| `skills.js` | 스킬 탐색, 심링크 생성, 활성 스킬 조회 | `findSkills()`, `getActiveSkills()`, `activateSkill()`, `linkOrCopy()` |
| `sources.js` | git clone / 로컬 import | `cloneSource()`, `importSource()` |
| `utils.js` | 로깅, 스타일, CI 모드, 프롬프트 | `log()`, `styles`, `setCIMode()`, `getCIMode()`, `getJSONMode()`, `askQuestion()`, `ciOutput()`, `ciError()`, `runCmd()`, `ensureDir()`, `HOME_DIR` |

### Command 핸들러 (`src/commands/`)

각 파일은 `{ execute }` async 함수를 export. 시그니처가 명령마다 다름:

| 파일 | 시그니처 | 호출 예시 (index.js에서) |
|------|---------|------------------------|
| `init.js` | `execute()` | `cmdInit.execute()` |
| `use.js` | `execute(args, config, options)` | `cmdUse.execute([useQuery], config, { claude, gemini, codex, copy })` |
| `list.js` | `execute()` | `cmdList.execute()` |
| `remove.js` | `execute(args)` | `cmdRemove.execute(args.slice(1))` |
| `source.js` | `execute(subCommand, args, config)` | `cmdSource.execute('add', [url], config)` |
| `config.js` | `execute(args, config)` | `cmdConfig.execute(['lang', 'ko'], config)` |

### Locale 파일 (`src/locales/`)
`en.json`, `ko.json` - 각 96개 키, 플랫 JSON. `{param}` 보간 문법.

## 주요 경로 & 설정

| 경로 | 용도 |
|------|------|
| `~/.asc-config.json` | 글로벌 설정 (소스 목록, 언어) |
| `~/.asc_sources/` | clone된 git 저장소 및 로컬 소스 심링크 |
| `<project>/.claude/skills/` | Claude 스킬 심링크 설치 경로 |
| `<project>/.gemini/skills/` | Gemini 스킬 설치 경로 |
| `<project>/.codex/skills/` | Codex 스킬 설치 경로 |

설정 스키마 (`~/.asc-config.json`):
```json
{
  "lang": "en",
  "sources": {
    "repo-name": { "type": "git", "url": "https://..." },
    "local-name": { "type": "local", "path": "/absolute/path" }
  }
}
```

## 코드 컨벤션

- **모듈**: CommonJS. ES modules 사용하지 않음.
- **네이밍**: camelCase 함수/변수, UPPER_SNAKE_CASE 상수 (예: `SOURCES_DIR`, `CLAUDE_SKILLS_DIR`)
- **i18n**: 모든 사용자 메시지는 `t('key', { param })` 사용. 영문 하드코딩 금지.
- **듀얼 모드**: 모든 명령은 interactive(TTY) + CI 모드 지원 필수. `getCIMode()`으로 체크. CI 모드에서 인자 누락 시 `ciError()` + `process.exit(2)`.
- **JSON 출력**: `getJSONMode()` true일 때 `ciOutput(data)` (성공) / `ciError(errorKey, message)` (실패). 형식: `{ ok: true, data }` / `{ ok: false, error, message }`.
- **심링크**: `linkOrCopy()` 사용. Unix에서 symlink, Windows에서 junction, 실패 시 `fs.cpSync` 폴백.
- **에러 처리**: 파일 작업은 try/catch + `/* ignore */` 패턴. 예상된 실패는 무시.
- **종료 코드**: 0=성공, 1=실행오류, 2=인자오류(CI)

## 주요 워크플로

### 새 명령어 추가
1. `src/commands/<name>.js` 생성, `async function execute(...)` export
2. `src/index.js` switch문에 case 추가 (인자 파싱 포함)
3. `src/locales/en.json`과 `src/locales/ko.json`에 번역 키 동시 추가
4. CI 모드 처리: `getCIMode()` 체크, 필수 인자 없으면 `ciError()` + `process.exit(2)`
5. JSON 모드 처리: `getJSONMode()` 체크, 구조화 데이터는 `ciOutput()` 사용

### 번역 키 추가
1. `src/locales/en.json`에 영문 키 추가
2. `src/locales/ko.json`에 동일 키로 한국어 추가
3. 양쪽 파일의 키 세트 동일해야 함 (현재 96개)
4. 보간: `{paramName}` 문법 -> `t('my_key', { paramName: value })`

### 새 에이전트 지원 추가 (5개 파일 수정)
1. `src/core/skills.js`: 상수 추가 (`const NEW_SKILLS_DIR = ...`) + `agentFolders` 배열에 추가 (`findSkills`, `getActiveSkills`, `activateSkill` 내부)
2. `src/commands/list.js`: `agentFolders` 배열에 추가
3. `src/commands/remove.js`: `agentDirs` 배열에 추가
4. `src/commands/source.js`: `syncSources` 내부 skills import 부분
5. `src/index.js`: `useOptions`에 `--newagent` 플래그 파싱 추가

### 스킬 탐색 로직 (`findSkills`)
SKILL.md 파일이 있는 디렉토리를 스킬로 인식. 탐색 순서:
1. 에이전트별 경로: `.claude/skills/*/`, `.gemini/skills/*/`, `.codex/skills/*/`
2. 소스 디렉토리 전체 재귀 스캔 (hidden/node_modules 제외)
3. `fs.realpathSync()`로 중복 제거

## 주의사항

- `process.cwd()` 기반 경로 사용 (`__dirname` 아님). 스킬은 `cast` 실행 위치 기준으로 설치됨.
- `source.js`에서 `t` import를 `tFunc`으로 리네이밍 (변수 섀도잉 방지 목적). 필요시 동일 패턴 사용.
- `askQuestion()`은 CI 모드에서 `process.exit(2)` 호출 -- CI 지원 명령에서 반드시 `getCIMode()` 가드 필요.
- `.claude/`, `.gemini/`, `.codex/` 디렉토리는 `.gitignore` 대상. 에이전트 디렉토리가 미리 존재해야 스킬 설치 가능 (`fs.existsSync(agentRootDir)` 체크).
- `config` 객체는 `index.js`에서 1회 로드 후 명령에 전달. 일부 명령(`remove.js`)은 직접 `loadConfig()` 호출 -- 전달된 config 사용 권장.
