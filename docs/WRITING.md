# 게시물 작성 가이드

게시물은 `src/data/posts/` 폴더의 Markdown 또는 MDX 파일로 작성합니다.

## 새 글 시작하기

터미널에서 다음 명령을 실행하면 제목·분류·파일명·설명을 순서대로 입력해 새 초안을 만들 수 있습니다.

```bash
pnpm new:post
```

자동화가 필요하면 옵션을 직접 지정할 수도 있습니다.

```bash
pnpm new:post -- --title "목성 관측일지" --category observation --slug jupiter-2026-09-01 --tags "목성,행성"
```

도구는 다음 규칙을 자동으로 적용합니다.

1. 파일명은 영문 소문자와 하이픈으로 정리합니다.
2. 분류에 맞는 본문 목차를 생성합니다.
3. 관측일지는 관측 전용 frontmatter를 추가합니다.
4. 새 글은 항상 `draft: true`로 생성합니다.
5. 기존 파일은 덮어쓰지 않습니다.

글을 완성하면 `publishedAt`을 입력하고 `draft: false`로 변경합니다.

```yaml
---
title: "게시물 제목"
description: "목록과 검색 결과에 표시할 한두 문장 설명"
category: "equipment"
publishedAt: 2026-09-01
updatedAt: 2026-09-02
tags:
  - 망원경
draft: false
featured: false
---
```

## 분류 값

| 화면 이름 | `category` 값 |
| --- | --- |
| 관측일지 | `observation` |
| 장비와 사용법 | `equipment` |
| 관측 이론 | `theory` |
| 시뮬레이션 | `simulation` |
| 오픈데이터 | `open-data` |

## 관측일지 전용 정보

관측일지는 필요할 때 다음 정보를 추가할 수 있습니다.

```yaml
observation:
  target: "목성"
  observedAt: 2026-09-01T22:30:00+09:00
  location: "관측 장소"
  equipment:
    - "망원경 모델"
    - "접안렌즈"
  conditions: "시상 3/5, 투명도 4/5"
```

정확한 집 주소처럼 공개하기 어려운 위치 정보는 기록하지 않습니다.

## 이미지

웹용 이미지는 `public/images/` 아래에 저장하고 Markdown에서 다음처럼 사용합니다. 빠른 모바일 로딩을 위해 긴 변 기준 1,600px 이하, 파일당 2MB 이하의 WebP 또는 압축 JPEG를 권장합니다.

Markdown 본문 이미지는 빌드할 때 지연 로딩과 비동기 디코딩이 자동 적용됩니다.

```md
![이미지 설명](/images/example.jpg)
```

원본 FITS·TIFF와 대용량 촬영 파일은 Git에 넣지 않고 별도의 원본 저장소에서 관리합니다.

## 수식

문장 안의 짧은 수식은 `$` 한 쌍으로 감쌉니다.

```md
망원경의 배율은 $M = f_o / f_e$로 계산합니다.
```

별도 줄에 크게 표시할 수식은 `$$` 한 쌍으로 감쌉니다.

```md
$$
\theta = 1.22 \frac{\lambda}{D}
$$
```

수식은 KaTeX 문법으로 빌드할 때 렌더링됩니다. 화학식 등 KaTeX가 지원하지 않는 명령을 사용할 때는 공개 전 미리보기와 `pnpm prepublish:check`로 확인합니다.

## 공개 전 확인

다음 명령으로 모든 게시물을 검사합니다.

```bash
pnpm validate:content
```

공개할 게시물 하나의 주의 항목까지 실패로 처리하고, 사이트 전체 빌드·링크·접근성도 함께 확인하려면 파일명(확장자 제외)을 입력합니다.

```bash
pnpm prepublish:check -- 망원경이-빛을-모으는-기본-원리
```

공개 글의 참고 자료 주소가 현재 열리는지 별도로 확인하려면 다음 명령을 사용합니다. 외부 사이트의 일시 장애나 접속 제한은 주의로만 표시하며 일반 빌드에는 포함하지 않습니다. 특정 글만 확인할 때는 파일명을 덧붙입니다.

```bash
pnpm validate:references
pnpm validate:references -- 게시물-파일명
```

- CMS에서 먼저 초안으로 저장했는가
- 발행일이 오늘 또는 과거이고, 수정일이 발행일보다 빠르지 않은가
- 설명은 핵심 내용을 담은 20~160자인가
- 비어 있거나 중복된 태그가 없는가
- 출처와 참고 자료를 표시했는가
- 관측값과 시뮬레이션·공개 데이터 값을 구분했는가
- 이미지 대체 텍스트를 작성했는가
- 민감한 위치 정보가 없는가
- 미리보기에서 제목·이미지·수식·코드를 확인했는가
- `publishedAt`과 `draft: false`를 설정했는가
- 공개 후 GitHub의 품질 검사와 배포 스모크 테스트가 모두 통과했는가
