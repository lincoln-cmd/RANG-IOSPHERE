# 게시물 작성 가이드

게시물은 `src/data/posts/` 폴더의 Markdown 또는 MDX 파일로 작성합니다.

## 새 글 시작하기

1. 기존 초안 파일을 복사하거나 새 `.md` 파일을 만듭니다.
2. 파일명은 영문 소문자와 하이픈을 사용합니다. 이 파일명이 게시물 주소가 됩니다.
3. 작성 중에는 `draft: true`를 유지합니다.
4. 글을 완성하면 `publishedAt`을 입력하고 `draft: false`로 변경합니다.

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

웹용 이미지는 `public/images/` 아래에 저장하고 Markdown에서 다음처럼 사용합니다.

```md
![이미지 설명](/images/example.jpg)
```

원본 FITS·TIFF와 대용량 촬영 파일은 Git에 넣지 않고 별도의 원본 저장소에서 관리합니다.

## 공개 전 확인

- 출처와 참고 자료를 표시했는가
- 관측값과 시뮬레이션·공개 데이터 값을 구분했는가
- 이미지 대체 텍스트를 작성했는가
- 민감한 위치 정보가 없는가
- `publishedAt`과 `draft: false`를 설정했는가
