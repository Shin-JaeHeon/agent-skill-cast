# 🧙‍♂️ Agent Skill Cast (ASC)

**"AI 에이전트 스킬을 팀원들에게 시전(Cast)하세요."**

ASC는 Claude, Gemini, Codex 같은 AI 에이전트가 사용하는 '스킬(폴더)'을 팀원들과 쉽게 공유하고 동기화할 수 있게 도와주는 CLI 도구입니다.

매번 스킬 폴더를 복사하거나, 특정 몇 개의 스킬 때문에 거대한 저장소를 통째로 받을 필요가 없습니다. 중앙 저장소(또는 로컬 폴더)에서 필요한 스킬만 쏙쏙 골라 현재 프로젝트에 **장착(Cast)** 하세요.

## 왜 필요한가요?

- **선택적 동기화 (Selective Sync)**: 전체 저장소를 다 가져올 필요 없이, 내게 필요한 스킬만 골라서 쓸 수 있습니다.
- **멀티 에이전트 지원**: `.claude`, `.gemini`, `.codex` 폴더를 알아서 관리해줍니다.
- **빠른 업데이트**: `cast source sync` 한 번이면 원본 소스의 최신 변경사항이 내 프로젝트에 바로 반영됩니다.
- **로컬 & 원격 지원**: Git 저장소뿐만 아니라 내 컴퓨터의 다른 폴더도 소스로 등록해 쓸 수 있습니다.

## 설치하기

```bash
npm install -g agent-skill-cast
```

## 시작하기

### 1. 초기화 (Init)
프로젝트 폴더에서 ASC를 초기화합니다.

```bash
cast init
```

### 2. 소스 추가 (Add Source)
스킬이 모여있는 저장소를 등록합니다. GitHub 주소나 로컬 경로 모두 가능합니다.

```bash
# Git 저장소 추가
cast source add https://github.com/my-team/awesome-skills

# 로컬 폴더 추가 (테스트용으로 유용해요)
cast source add ~/projects/personal-skills
```

### 3. 스킬 장착 (Use)
등록된 소스에서 원하는 스킬을 골라 현재 프로젝트에 가져옵니다.

```bash
cast use
```
*명령어를 치고 대화형 메뉴에서 엔터만 누르면 됩니다.*

### 4. 동기화 (Sync)
소스가 업데이트되었나요? 동기화 명령어로 최신 상태를 유지하세요.

```bash
cast source sync
```

## 명령어 모음

| 명령어 | 설명 |
|---|---|
| `cast init` | 현재 위치에 ASC 환경 구성 |
| `cast source add <주소/경로>` | 스킬 소스 등록 (Git 또는 로컬) |
| `cast source list` | 등록된 소스 목록 확인 |
| `cast source remove <이름>` | 소스 등록 해제 |
| `cast use` | 스킬 선택 및 장착 (대화형) |
| `cast use <소스>/<스킬>` | 특정 스킬 바로 장착 |
| `cast use ... --claude` | `.claude/skills` 에만 장착 (폴더가 있어야 함) |
| `cast list` | 현재 프로젝트에 장착된 스킬 목록 |
| `cast remove <스킬>` | 장착된 스킬 제거 |
| `cast config lang <en\|ko>` | 언어 설정 변경 (영어/한국어) |
| `cast source sync` | 소스 업데이트 및 스킬 갱신 |

## 동작 원리

ASC는 효율적인 관리를 위해 심볼릭 링크(Symlink)를 적극적으로 사용합니다.

- **`~/.asc_sources/`**: 등록한 소스들이 저장되는 전역 공간입니다.
- **프로젝트 내 `.claude/skills/` 등**: 실제 파일이 복사되는 게 아니라, 위 전역 공간의 스킬 폴더를 가리키는 **링크**가 생성됩니다. 덕분에 용량을 아끼고 업데이트가 쉽습니다.

## 라이선스

MIT
