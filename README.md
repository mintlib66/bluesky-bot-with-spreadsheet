# Bluesky Bot with Spreadsheet : data auto post

매주 정해진 시각에 Bluesky에 글을 게시하는 자동봇입니다.  
대상 구글 스프레드 시트에서 해당하는 날짜에 대응하는 셀의 데이터를 읽어옵니다.

## 기능

- 지정 시각에 자동 게시 (cron-job.org → GitHub Actions 연동)
- 구글 스프레드시트에서 게시 내용 불러오기 (공개 시트, 인증 불필요)
- 2개의 게시글을 스레드(이어진 답글) 형태로 연속 게시
- 본문 300자 초과 시 엔터 단위로 끊어 연결 스레드로 초과된 텍스트 연결 게시 처리
- 본문 내 URL을 자동으로 감지해 클릭 가능한 링크로 처리 (facets)
  - URL이 있는 경우 첫 번째 링크의 OG 태그를 읽어 링크 프리뷰 카드 자동 생성
- GitHub Actions의 수동 실행 버튼으로 실행 테스트 가능

## 기술 스택

- **런타임**: Node.js 24
- **언어**: TypeScript (tsx로 직접 실행, 빌드 단계 없음)
- **Bluesky SDK**: `@atproto/api`
- **HTML 파싱**: `cheerio` (OG 태그 추출)
- **스케줄 실행**: cron-job.org → `GitHub Actions workflow_dispatch`

## 프로젝트 구조

```
.
├── src/
│   └── post.ts                # 메인 실행 스크립트
├── .github/
│   └── workflows/
│       └── post-cron.yml      # GitHub Actions 워크플로우
├── .env.example               # 환경변수 템플릿 (값 없음)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 동작 흐름

```
cron-job.org (지정 시각)
  → GitHub Actions workflow_dispatch API 호출
    → 구글 시트에서 오늘 날짜 행 읽기
      → 첫 번째 게시글 작성 (RichText + facets + 링크 프리뷰)
        → 두 번째 게시글을 스레드로 연결
```

---

## 시작하기

### 1. 사전 준비

**Bluesky 앱 비밀번호 발급**

Bluesky 앱 → 설정 → 프라이버시 및 보안 → 앱 비밀번호에서 생성합니다.  
일반 로그인 비밀번호는 사용하지 않습니다.  
`BLUESKY_IDENTIFIER`는 핸들에서 `@`를 제외하고 입력합니다. (예: `yourname.bsky.social`)

**구글 스프레드시트 준비**

아래 컬럼 구성으로 시트를 만들고 **"링크가 있는 모든 사용자 - 뷰어"** 권한으로 공유합니다.

| 날짜 (YYYY-MM-DD) | 첫 번째 게시글 | 두 번째 게시글 |
| ----------------- | -------------- | -------------- |
| 2025-01-04        | 본문 내용      | 본문 내용      |
| 2025-01-11        | 본문 내용      | 본문 내용      |

URL에서 시트 ID와 GID를 확인합니다.

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={SHEET_GID}
```

### 2. 로컬 설치

```bash
git clone https://github.com/{유저명}/{리포지토리명}.git
cd {리포지토리명}
npm install
```

### 3. 환경변수 설정

`.env.example`을 복사해서 `.env`를 만들고 실제 값을 입력합니다.

```bash
cp .env.example .env
```

```env
BLUESKY_IDENTIFIER=yourname.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
SHEET_GID=0
```

> `.env`는 `.gitignore`에 포함되어 있어 깃에 올라가지 않습니다.

### 4. 로컬 실행 (테스트)

```bash
npm run post
```

---

## GitHub Actions 설정

### 1. Repository Secrets 등록

리포지토리 → Settings → Secrets and variables → Actions → New repository secret

| Secret 이름            | 값                   |
| ---------------------- | -------------------- |
| `BLUESKY_IDENTIFIER`   | yourname.bsky.social |
| `BLUESKY_APP_PASSWORD` | 앱 비밀번호          |
| `SHEET_ID`             | 스프레드시트 ID      |
| `SHEET_GID`            | 시트 GID             |

### 2. 워크플로우 구성

스케줄 자동 실행은 cron-job.org가 담당하므로 workflow 파일에는 `schedule`을 선언하지 않고 `workflow_dispatch`만 남깁니다.

```yaml
on:
  workflow_dispatch: # cron-job.org가 이 트리거를 외부에서 호출
```

### 3. 수동 실행 (테스트)

Actions 탭 → 워크플로우 선택 → **Run workflow** 버튼으로 즉시 실행할 수 있습니다.

---

## cron-job.org 설정

GitHub Actions의 스케줄(`schedule: cron`)은 서버 부하에 따라 수십 분~수 시간 지연될 수 있어서, 정확한 시각 실행을 위해 cron-job.org를 외부 트리거로 사용합니다.

### 1. GitHub Personal Access Token 발급

GitHub → 프로필 → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)

- **권한**: `workflow`만 체크
- 생성 후 토큰 값(`ghp_xxxx...`)은 **딱 한 번만** 표시되므로 바로 복사해둡니다.

### 2. cron-job.org 작업 등록

| 항목                  | 값                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------- |
| URL                   | `https://api.github.com/repos/{owner}/{repo}/actions/workflows/post-cron.yml/dispatches` |
| Request method        | `POST`                                                                                   |
| Header: Authorization | `Bearer ghp_xxxxxxxxxxxxxxxxxxxx`                                                        |
| Header: Content-Type  | `application/json`                                                                       |
| Request body          | `{ "ref": "main" }`                                                                      |

> `ref` 값은 실제 default 브랜치명과 정확히 일치해야 합니다.

### 3. cron 시각 설정

cron-job.org 내에 한국 시간(KST)을 지원합니다.
timezone을 Asia/Seoul로 설정합니다.

### 4. 실행 확인

cron-job.org에서 테스트 실행 후 `204 No Content` 응답이 오면 정상입니다.  
실제 실행 결과는 GitHub 레포 → Actions 탭에서 확인합니다.

---

## 환경변수 목록

| 변수명                 | 설명                    |
| ---------------------- | ----------------------- |
| `BLUESKY_IDENTIFIER`   | Bluesky 핸들 (`@` 제외) |
| `BLUESKY_APP_PASSWORD` | Bluesky 앱 비밀번호     |
| `SHEET_ID`             | 구글 스프레드시트 ID    |
| `SHEET_GID`            | 시트 탭 GID             |

## 주의사항

- **앱 비밀번호**는 일반 로그인 비밀번호와 다릅니다. 반드시 앱 비밀번호를 별도 발급해서 사용하세요.
- **`BLUESKY_IDENTIFIER`** 에 `@`를 붙이면 로그인 오류(`Invalid email address`)가 발생합니다.
- **`.env` 파일**은 절대 깃에 커밋하지 않습니다. `.gitignore`에 포함되어 있는지 확인하세요.
- **구글 시트**는 반드시 "뷰어" 이상의 공개 공유 상태여야 합니다.
- **링크 프리뷰 이미지**는 Bluesky blob 업로드 제한(1MB)이 있습니다. 초과 시 이미지 없이 제목+설명만 표시됩니다.
- **300자 초과 본문**은 엔터 단위로 잘려 스레드에 이어 게시됩니다. 엔터가 없으면 300자에서 강제 절단됩니다.
- **workflow의 `schedule` cron**과 cron-job.org를 동시에 사용하면 같은 날 두 번 실행될 수 있습니다. 둘 중 하나만 사용하세요.
- **`ref` 브랜치명**이 실제 default 브랜치와 다르면 cron-job.org 호출 시 `422` 오류가 발생합니다.

## 토큰 만료 알림

GitHub 액세스 토큰 만료일이 임박하면 Gmail로 알림 메일을 발송합니다.  
매주 월요일 자동으로 체크하며, 만료 14일 전부터 알림이 발송됩니다.

### 관련 파일 구성

- `src/alarm.ts` — 만료일 체크 및 Gmail SMTP 메일 발송 로직
- `.github/workflows/check-token-expire.yml` — 매주 실행되는 체크 워크플로우

### 추가 Secrets 등록

| Secret 이름          | 값                                                |
| -------------------- | ------------------------------------------------- |
| `TOKEN_EXPIRY_DATE`  | 토큰 만료일 (`YYYY-MM-DD` 형식, 예: `2025-12-31`) |
| `GMAIL_USER`         | yourname@gmail.com                                |
| `GMAIL_APP_PASSWORD` | 구글 앱 비밀번호                                  |

> **Gmail 앱 비밀번호 발급 경로**  
> Google 계정 → 보안 → 2단계 인증 활성화 (필수) → 앱 비밀번호 → 생성

### 토큰 갱신 시 할 일

토큰을 새로 발급할 때마다 아래 두 곳을 업데이트해야 합니다.

1. **cron-job.org** — Advanced → Headers → `Authorization` 값을 새 토큰으로 교체
2. **GitHub Secrets** — `TOKEN_EXPIRY_DATE`를 새 만료일로 업데이트
