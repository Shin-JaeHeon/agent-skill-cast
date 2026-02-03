# 🧙‍♂️ Agent Skill Cast

**"AI 에이전트 스킬을 팀원들에게 시전(Cast)하세요."**

Agent Skill Cast는 Claude, Gemini, Codex 같은 AI 에이전트가 사용하는 '스킬(폴더)'을 팀원들과 쉽게 공유하고 동기화할 수 있게 도와주는 CLI 도구입니다.

매번 스킬 폴더를 복사하거나, 특정 몇 개의 스킬 때문에 거대한 저장소를 통째로 받을 필요가 없습니다. 중앙 저장소(또는 로컬 폴더)에서 필요한 스킬만 쏙쏙 골라 현재 프로젝트에 **장착(Cast)** 하세요.

## 왜 필요한가요?

- **선택적 동기화 (Selective Sync)**: 전체 저장소를 다 가져올 필요 없이, 내게 필요한 스킬만 골라서 쓸 수 있습니다.
- **멀티 에이전트 지원**: `.claude`, `.gemini`, `.codex` 폴더를 알아서 관리해줍니다.
- **빠른 업데이트**: `cast source sync` 한 번이면 원본 소스의 최신 변경사항이 내 프로젝트에 바로 반영됩니다.
- **로컬 & 원격 지원**: Git 저장소뿐만 아니라 내 컴퓨터의 다른 폴더도 소스로 등록해 쓸 수 있습니다.

## 설치하기 (Installation)

Node.js 환경이 필요합니다. npm을 통해 전역으로 설치하세요.

```bash
npm install -g agent-skill-cast
```

## 시작하기 (Getting Started)

### 1. 초기화 (Init)
Agent Skill Cast를 초기화하여 전역 설정을 생성합니다. (최초 1회만 실행하면 됩니다.)

```bash
cast init
```

### 2. 소스 등록 (Add Source)
스킬들이 모여있는 저장소(Source)를 등록합니다. 한 번 등록하면 어떤 프로젝트에서든 사용할 수 있습니다.

```bash
# GitHub 저장소 추가 (추천)
cast source add https://github.com/my-team/awesome-skills

# 또는 로컬 폴더 추가 (개발/테스트용)
cast source add ~/projects/my-personal-skills
```

### 3. 스킬 장착 (Cast Use)
등록된 소스에서 원하는 스킬을 골라 현재 프로젝트에 "장착"합니다.

```bash
cast use
```
*명령어를 입력하면 대화형 메뉴가 나옵니다. 원하는 소스와 스킬의 **번호**를 입력하세요. (스킬은 쉼표로 구분하여 여러 개 선택 가능)*

### 4. 장착 확인
프로젝트 폴더를 확인해보세요!
`.claude/skills/` 폴더 안에 선택한 스킬들이 심볼릭 링크로 연결되어 있습니다. 이제 Claude가 이 스킬들을 인식하고 사용할 수 있습니다.

### 5. 동기화 (Sync)
소스 저장소에 새로운 스킬이 추가되거나 내용이 업데이트되었나요?
`sync` 명령어로 모든 소스를 최신 상태로 만들고, 연결된 스킬들을 갱신하세요.

```bash
cast source sync
```

## 명령어 모음 (Commands)

| 명령어 | 설명 |
|---|---|
| `cast init` | Agent Skill Cast 전역 설정 초기화 |
| `cast source add <URL/Path>` | 스킬 소스 등록 (Git 저장소 또는 로컬 경로) |
| `cast source list` | 등록된 소스 목록 확인 |
| `cast source remove <Name>` | 소스 등록 해제 |
| `cast use` | 스킬 선택 및 장착 (대화형 메뉴) |
| `cast use <Source>/<Skill>` | 특정 스킬 바로 장착 (비대화형) |
| `cast use ... --claude` | `.claude/skills` 에만 장착 (폴더가 있어야 함) |
| `cast list` | 현재 프로젝트에 장착된 스킬 목록 |
| `cast remove <스킬>` | 장착된 스킬 제거 |
| `cast config lang <en\|ko>` | 언어 설정 변경 (영어/한국어) |
| `cast source sync` | 소스 업데이트 및 스킬 갱신 |

## 동작 원리

Agent Skill Cast는 효율적인 관리를 위해 심볼릭 링크(Symlink)를 적극적으로 사용합니다.

- **`~/.asc_sources/`**: 등록한 소스들이 저장되는 전역 공간입니다.
- **프로젝트 내 `.claude/skills/` 등**: 실제 파일이 복사되는 게 아니라, 위 전역 공간의 스킬 폴더를 가리키는 **링크**가 생성됩니다. 덕분에 용량을 아끼고 업데이트가 쉽습니다.

## 라이선스

MIT
