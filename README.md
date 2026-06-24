## Bluesky Bot : Google Spreadsheet data upload

매주 정해진 시각에 Bluesky에 글을 게시하는 자동봇입니다.  
대상 구글 스프레드 시트에서 해당하는 날짜에 대응하는 셀의 데이터를 읽어옵니다.  
Github Action을 통해 자동으로 읽어서 올립니다.

### 기능

- 매주 토요일 지정 시각에 자동 게시 (GitHub Actions 스케줄)
- 2개의 게시글을 스레드(이어진 답글) 형태로 연속 게시
- 본문 내 URL을 자동으로 감지해 클릭 가능한 링크로 처리 (facets)
- 첫 번째 링크의 OG 태그를 읽어 링크 프리뷰 카드 자동 생성
- 구글 스프레드시트에서 게시 내용 불러오기 (공개 시트, 인증 불필요)
- GitHub Actions의 수동 실행 버튼으로 즉시 테스트 가능

### 기술 스택

- **런타임**: Node.js 20
- **언어**: TypeScript (tsx로 직접 실행)
- **Bluesky SDK**: `@atproto/api`
- **HTML 파싱**: `cheerio` (OG 태그 추출)
- **스케줄 실행**: GitHub Actions
