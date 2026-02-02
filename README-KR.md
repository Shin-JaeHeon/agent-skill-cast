# 🧙‍♂️ Agent Skill Cast (ASC)

**"AI 에이전트 스킬을 시전(Cast)하세요."**

Agent Skill Cast(ASC)는 AI 에이전트(Claude 등)가 사용하는 프롬프트(Skill)를 팀원들과 쉽게 공유하고 동기화할 수 있는 CLI 도구입니다.  
Git 저장소를 기반으로 스킬을 관리하며, 로컬의 `.claude/commands` 폴더와 자동으로 동기화하여 Claude 데스크탑 앱 등에서 바로 사용할 수 있게 해줍니다.

## ✨ 주요 기능

-   **스마트 동기화 (Sync)**: 원격 저장소의 최신 스킬을 가져와 내 로컬 환경(`~/.claude/commands`)에 셋팅합니다.
-   **충돌 자동 해결 (Auto-Rebase)**: 스킬 배포 시 발생할 수 있는 충돌을 자동으로 해결하려고 시도합니다.
-   **외부 스킬 복제 (Clone)**: 다른 Git 저장소에 있는 유용한 프롬프트들을 내 스킬 저장소로 쉽게 가져올 수 있습니다.
-   **쉬운 배포 (Publish)**: 내가 작성한 프롬프트 파일을 선택하여 팀 저장소에 즉시 공유할 수 있습니다.

## 🚀 설치 방법

이 프로젝트가 로컬에 있다면 다음과 같이 전역으로 설치하여 사용할 수 있습니다.

```bash
npm install -g .
```

또는 npm에 배포되어 있다면:

```bash
npm install -g agent-skill-cast
```

## 🎮 사용 방법

터미널에서 `cast` 명령어를 사용합니다.

### 1. 초기화 (Init)
가장 먼저 실행해야 합니다. 기본 설정을 초기화합니다.
(기존에는 메인 저장소를 연결했지만, 이제는 빈 상태로 시작할 수 있습니다)

```bash
cast init
```

### 2. 스킬 소스 추가 (Sources)
모든 스킬을 다 가져오지 않고, "소스(Source)"로 등록만 해둡니다.

**GitHub 저장소 추가 (Clone)**
```bash
cast clone https://github.com/ComposioHQ/awesome-claude-skills
```

**로컬 폴더 추가 (Import)**
```bash
cast import ~/user/projects/team-skill-store
```

### 3. 스킬 장착 (Use)
등록된 소스에서 원하는 스킬만 쏙쏙 뽑아서 내 에이전트에 장착합니다.

```bash
# 대화형으로 선택
cast use

# 또는 직접 지정 (소스명/스킬명)
cast use awesome-claude-skills/lead-research-assistant
```

### 4. 동기화 (Sync)
등록된 소스들의 최신 버전을 가져오고, 내가 장착한 스킬들을 업데이트합니다.

```bash
cast sync
```

### 5. 스킬 내보내기 (Publish)
내가 만든 스킬을 팀 저장소(소스)로 보냅니다.

```bash
cast publish
```

### 6. 목록 확인 (List)
현재 내 에이전트에 장착된 스킬 목록을 확인합니다.

```bash
cast list
```

### 7. 스킬 제거 (Remove)
더 이상 사용하지 않는 스킬을 장착 해제합니다.

```bash
# 대화형으로 선택
cast remove

# 또는 직접 지정
cast remove my-skill-name
```

## 📂 디렉토리 구조 설명

-   **~/.asc_sources**: 소스 저장소들이 저장되는 디렉토리입니다. (클론된 Git 저장소, 연결된 로컬 폴더)
-   **~/.claude/commands**: 장착된 스킬들이 심볼릭 링크로 연결되는 곳입니다. (Claude 앱이 읽는 위치)
-   **~/.asc-config.json**: ASC 설정 파일입니다.

## 📝 라이선스

mit 
