# 검색엔진 등록

사이트 주소는 `https://rang-iosphere.pages.dev`이며 사이트맵 주소는 다음과 같습니다.

```text
https://rang-iosphere.pages.dev/sitemap-index.xml
```

## 1. Google Search Console

1. Search Console에서 **URL 접두어** 속성으로 사이트 주소를 추가합니다.
2. **HTML 태그** 인증 방식을 선택합니다.
3. 표시된 태그의 `content="..."` 안쪽 값만 복사합니다.
4. Cloudflare Pages의 Production 환경 변수에 아래 이름으로 저장합니다.

```text
PUBLIC_GOOGLE_SITE_VERIFICATION
```

5. 새 배포가 끝난 뒤 Search Console에서 **확인**을 누릅니다.
6. `Sitemaps` 메뉴에 `sitemap-index.xml`을 제출합니다.

## 2. 네이버 서치어드바이저

1. 웹마스터 도구에서 사이트 주소를 추가합니다.
2. **HTML 태그** 인증 방식을 선택합니다.
3. 표시된 태그의 `content="..."` 안쪽 값만 복사합니다.
4. Cloudflare Pages의 Production 환경 변수에 아래 이름으로 저장합니다.

```text
PUBLIC_NAVER_SITE_VERIFICATION
```

5. 새 배포가 끝난 뒤 서치어드바이저에서 **소유확인**을 누릅니다.
6. `요청 > 사이트맵 제출`에서 전체 사이트맵 주소를 제출합니다.

## 주의

- 인증값은 비밀번호가 아니지만 저장소에 직접 작성하지 않습니다.
- 환경 변수를 추가하거나 바꾸면 반드시 Production을 다시 배포합니다.
- 소유권 확인이 끝나도 환경 변수를 유지해야 재확인에 실패하지 않습니다.
