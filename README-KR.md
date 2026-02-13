[English](./README.md) | **한국어**

# Agent Skill Cast

**AI 에이전트 스킬을 팀원들에게 시전(Cast)하세요.**

[English](./README.md) | **한국어** |
[![npm version](https://img.shields.io/npm/v/agent-skill-cast.svg)](https://www.npmjs.com/package/agent-skill-cast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 왜 만들었나요?

> *"mobile 브랜치에서 만든 스킬을 main에서도 쓰고 싶은데... 체리픽 하기 귀찮아..."*
> 
> *"A 레포랑 B 레포 둘 다 React인데, 스킬이 90% 똑같아. 복사해서 관리하자니 지옥..."*

스킬을 **브랜치나 레포에 종속시키지 마세요.**

Agent Skill Cast는 중앙 저장소에서 필요한 스킬만 골라 프로젝트에 **장착(Cast)** 합니다.

---

## 특징

| | |
|---|---|
| **선택적 동기화** | 전체 저장소가 아닌, 필요한 스킬만 골라서 사용 |
| **멀티 에이전트** | 기존 Claude, Gemini, Codex 폴더에 장착 |
| **즉시 업데이트** | `cast source sync`로 Git 소스 업데이트 시도 + 활성 심볼릭 링크 스킬 재연결 |
| **로컬 & 원격** | Git 저장소 + 로컬 폴더 모두 지원 |

---

## 설치

```bash
npm install -g agent-skill-cast
```

> Node.js가 필요합니다.

---

## 빠른 시작

### Step 1. 초기화
```bash
cast init
```

### Step 2. 소스 등록
```bash
# GitHub 저장소
cast source add https://github.com/my-team/shared-skills

# 또는 로컬 폴더
cast source add ~/my-personal-skills
```

### Step 3. 스킬 장착
```bash
cast use
# 대화형 메뉴에서 원하는 스킬 번호 선택 (쉼표로 복수 선택 가능)

# 또는 특정 소스의 모든 스킬을 한 번에 장착
cast use my-skills --all
```

### Step 4. 확인
```bash
cast list
# 기본적으로 존재하는 에이전트 폴더(.claude/.gemini/.codex)에 심볼릭 링크 생성
# --copy 사용 시 독립 로컬 사본으로 복사
```

### Step 5. 동기화 (소스 업데이트 시)
```bash
cast source sync
```

---

## 명령어

### 기본 명령어

| 명령어 | 설명 |
|--------|------|
| `cast init` | 전역 설정 초기화 |
| `cast use` | 스킬 선택 및 장착 (대화형) |
| `cast use <소스>/<스킬>` | 특정 스킬 바로 장착 |
| `cast use <소스> --all` | 특정 소스의 모든 스킬 장착 |
| `cast use <소스>/<스킬> --copy` | 심볼릭 링크 대신 독립 사본으로 장착 |
| `cast use <소스> --all --copy` | 특정 소스의 모든 스킬을 독립 사본으로 장착 |
| `cast list` | 장착된 스킬 목록 |
| `cast remove <스킬>` | 심볼릭 링크로 장착된 스킬 제거 (`--copy` 독립 사본은 제거하지 않음) |

### 소스 관리

| 명령어 | 설명 |
|--------|------|
| `cast source` | 소스 관리 메뉴 (대화형) |
| `cast source add <URL/경로>` | 소스 등록 |
| `cast source list` | 등록된 소스 목록 |
| `cast source remove <이름>` | 소스 등록 해제 |
| `cast source sync` | Git 소스 업데이트 및 활성 심볼릭 링크 스킬 갱신 |

### 옵션

| 옵션 | 설명 |
|------|------|
| `--claude` | `.claude/skills`에만 장착 |
| `--gemini` | `.gemini/skills`에만 장착 |
| `--codex` | `.codex/skills`에만 장착 |
| `--all` | 지정한 소스의 모든 스킬 장착 (`cast use <소스> --all`) |
| `--copy` | 심볼릭 링크 대신 복사하여 장착 |

### 설정

```bash
cast config           # 설정 관리 메뉴 (대화형)
cast config lang ko   # 한국어
cast config lang en   # English
```

### CI 모드 (AI 에이전트 / 자동화용)

Claude Code, Codex, CI/CD 파이프라인 등 비대화형 환경에서는 `--ci` 플래그를 사용하세요.
`--json`은 CI JSON 출력을 구현한 명령에서 사용할 수 있습니다 (예: `cast source list`, `cast source sync`, `cast list`, CI 에러 응답).

```bash
# CI 모드는 다음 경우에 자동 활성화됩니다:
# - --ci 플래그 존재
# - stdin이 TTY가 아님 (파이프 실행 등)

cast source list --ci --json     # JSON 출력
cast use my-skills/helper --ci   # 비대화형 설치
cast use my-skills --all --ci    # 특정 소스의 모든 스킬 비대화형 설치
cast use my-skills/helper --copy --ci  # 비대화형 독립 사본 복사 설치
cast list --ci --json            # JSON 스킬 목록
```

| 옵션 | 설명 |
|--------|-------------|
| `--ci` | 비대화형 모드 (프롬프트 없음, 컬러 없음, 에러 시 종료 코드 반환) |
| `--json` | 구조화된 JSON 출력 반환 (지원 명령에서만 동작) |

> 전체 에이전트 인터페이스 사양은 [SKILL.md](agent-skill-cast/SKILL.md)를 참조하세요.

---

## 동작 원리

```
┌─────────────────────────────────────────────────────────┐
│  스킬 소스 저장소 (GitHub / 로컬)                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  ~/.asc_sources/                                        │
│  └── shared-skills/     ← git clone 또는 symlink        │
│      ├── react-patterns/                                │
│      ├── testing-guide/                                 │
│      └── mobile-helper/                                 │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     Project A       Project B       Project C
     .claude/        .claude/        .claude/
     skills/         skills/         skills/
       ↓               ↓               ↓
    [symlink]       [symlink]       [symlink]
```

- **복사 없음(기본값)**: 심볼릭 링크로 연결하여 디스크 공간 절약
- **즉시 반영**: 프로젝트에서 `cast source sync` 실행 시 소스 업데이트를 재연결하여 반영
- **독립적 선택**: 프로젝트마다 다른 스킬 조합 가능
- **독립 사본 모드**: `cast use <소스>/<스킬> --copy`로 로컬 복사본으로 장착 가능 (`cast remove`로는 제거되지 않음)

---

## 스킬 구조 (Skill Structure)

폴더가 스킬로 식별되려면 **내부에 반드시 `SKILL.md` 파일이 있어야 합니다.**
Agent Skill Cast는 소스 저장소 내 다음 위치에서 스킬을 탐색합니다.

1. **루트 디렉토리**: `SKILL.md`를 포함하는 모든 폴더.
   - `my-skill/SKILL.md` → `my-skill`로 식별
2. **에이전트 전용 디렉토리**:
   - `.claude/skills/my-skill/SKILL.md`
   - `.gemini/skills/my-skill/SKILL.md`
   - `.codex/skills/my-skill/SKILL.md`

> **참고**: `SKILL.md`가 없는 폴더는 무시됩니다.

---

## 협업 시나리오

<details>
<summary><b>시나리오 1: 브랜치 간 스킬 공유</b></summary>

> **상황**: mobile 브랜치에서 만든 스킬을 main에서도 쓰고 싶다.

```bash
# 스킬 저장소 등록 (한 번만)
cast source add https://github.com/my-team/shared-skills

# 어느 브랜치에서든 동일하게 사용
cast use shared-skills/mobile-helper

# 업데이트 시 동기화
cast source sync
```

</details>

<details>
<summary><b>시나리오 2: 다른 레포 간 스킬 공유</b></summary>

> **상황**: A레포와 B레포가 같은 프론트엔드 기술, 스킬 90% 동일.

```bash
# A레포, B레포 모두 동일하게:
cast source add https://github.com/my-team/frontend-skills
cast use frontend-skills/react-patterns
cast use frontend-skills/testing-guide
```

소스만 업데이트하면 `cast source sync`로 모든 레포 동기화!

</details>

<details>
<summary><b>시나리오 3: 팀원과 즉시 공유</b></summary>

> **상황**: 새로 만든 스킬을 팀원들에게 빠르게 전파하고 싶다.

```bash
# 1. 스킬 저장소에 푸시
cd ~/shared-skills
mkdir new-skill && echo "..." > new-skill/SKILL.md
git add . && git commit -m "feat: add new skill" && git push

# 2. 팀원에게: "cast source sync 해주세요!"

# 3. 팀원들
cast source sync
cast use shared-skills/new-skill
```

</details>
---

## 라이선스

MIT
