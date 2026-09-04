# RANG-IOSPHERE · 랑이오스페어

고양이 랑과 함께 밤하늘을 관측하고, 직접 얻은 값과 시뮬레이션·공개 천문 데이터를 비교해 기록하는 개인 천체관측 아카이브입니다.

## 관측 영역

- 관측일지
- 장비와 사용법
- 관측 이론
- 시뮬레이션
- 오픈데이터 탐구

첫 번째 콘텐츠는 **망원경의 구조와 원리**입니다.

## 개발

```bash
pnpm install
pnpm dev
```

정적 빌드:

```bash
pnpm build
```

## 기술 구성

- Astro
- TypeScript
- Cloudflare Pages
- Decap CMS

## 상태

홈, 프로젝트 소개, 아카이브와 게시물 상세 화면을 운영하고 있습니다. GitHub 품질 검사를 통과한 커밋은 Cloudflare Pages에 배포되며 프로덕션 스모크 테스트로 주요 경로를 확인합니다.

운영 사이트는 GitHub Actions에서 매일 한국 시간 오전 6시 17분경 주요 페이지, 공개 데이터와 검색엔진 인증 상태를 자동 점검합니다.

게시물 작성 방법은 [게시물 작성 가이드](docs/WRITING.md)를 참고하세요. 작성 중인 글은 `draft: true`로 두면 빌드 결과와 아카이브에서 자동으로 제외됩니다.

검색엔진 소유권 확인과 사이트맵 제출은 [검색엔진 등록 가이드](docs/SEARCH-REGISTRATION.md)를 참고하세요.

의존성 업데이트는 자동 병합하지 않으며 [의존성 업데이트 운영 원칙](docs/DEPENDENCY-UPDATES.md)에 따라 검증 후 반영합니다.

```bash
pnpm new:post          # 대화형 새 초안 생성
pnpm validate:content # 게시물 검사
pnpm validate:links   # 빌드 결과의 내부 링크·이미지 검사
pnpm prepublish:check # 공개 전 엄격 검사와 빌드
```
