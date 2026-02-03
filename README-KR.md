# 🧙‍♂️ Agent Skill Cast (ASC)

**"AI 에이전트 스킬을 시전(Cast)하세요."**

Agent Skill Cast(ASC)는 AI 에이전트(Claude 등)가 사용하는 스킬(폴더)을 팀원들과 쉽게 공유하고 동기화할 수 있는 CLI 도구입니다.  
Git 저장소를 기반으로 스킬을 관리하며, 프로젝트의 `.claude/skills` 폴더와 자동으로 동기화하여 Claude 코드 에이전트 등에서 바로 사용할 수 있게 해줍니다.

## ✨ 주요 기능

-   **폴더 기반 스킬**: 스킬 폴더 전체를 symlink하여 SKILL.md, resources 등 모든 파일을 지원합니다.
-   **스마트 동기화 (Sync)**: 원격 저장소의 최신 스킬을 가져와 현재 프로젝트(`.claude/skills`)에 셋팅합니다.
-   **충돌 자동 해결 (Auto-Rebase)**: 스킬 배포 시 발생할 수 있는 충돌을 자동으로 해결하려고 시도합니다.
-   **외부 스킬 복제 (Clone)**: 다른 Git 저장소에 있는 유용한 스킬들을 소스로 등록할 수 있습니다.

## 🚀 설치 방법

```bash
npm install -g agent-skill-cast
```

또는 로컬에서:

```bash
npm install -g .
```

## 🎮 사용 방법

터미널에서 `cast` 명령어를 사용합니다.

### 1. 초기화 (Init)
```bash
cast init
```

### 2. 스킬 소스 추가 (Source Management)

**소스 추가 (URL 또는 로컬 경로)**
도구가 자동으로 Git 저장소인지 로컬 폴더인지 판단하여 등록합니다.

```bash
# Git 저장소 추가
cast source add https://github.com/ComposioHQ/awesome-claude-skills

# 로컬 폴더 추가
cast source add ~/projects/team-skills
```

**소스 목록 확인**
```bash
cast source list
```

**소스 제거**
```bash
cast source remove source-name
```

### 3. 스킬 장착 (Use)
등록된 소스에서 원하는 스킬 폴더를 선택하여 장착합니다.

```bash
# 대화형으로 선택
cast use

# 또는 직접 지정 (소스명/스킬폴더명)
cast use awesome-claude-skills/connect
```

### 4. 동기화 (Sync)
```bash
cast sync
```

### 5. 목록 확인 (List)
장착된 스킬 목록을 확인합니다.
```bash
cast list
```

### 6. 스킬 제거 (Remove)
```bash
cast remove
cast remove skill-name
```

## 📂 디렉토리 구조

-   **~/.asc_sources/**: 소스 저장소들 (클론된 Git 저장소, 연결된 로컬 폴더)
-   **.claude/skills/**: 현재 프로젝트에 장착된 스킬 폴더들 (symlink)
-   **~/.asc-config.json**: ASC 설정 파일

## 📝 라이선스

MIT

