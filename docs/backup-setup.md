# GitLab·Bitbucket 백업 설정

GitHub의 `main` 브랜치나 태그가 변경되면 `.github/workflows/mirror.yml`이 GitLab과 Bitbucket에 백업합니다. GitHub의 `main`은 각 백업 저장소의 `github-main` 브랜치에 저장하므로, GitLab의 보호된 `main`과 충돌하지 않습니다. 설정되지 않은 대상은 오류 없이 건너뜁니다.

## 1. 빈 백업 저장소 만들기

- GitLab과 Bitbucket에 각각 비어 있는 비공개 저장소를 만듭니다.
- README, 라이선스, `.gitignore`로 초기화하지 않는 것을 권장합니다. 이미 초기화했다면 기존 `main`은 그대로 두어도 됩니다.
- 백업 전용 저장소로 사용하고 그곳에서 직접 커밋하지 않습니다.

## 2. 쓰기 토큰 만들기

- GitLab: 대상 저장소에 쓰기 가능한 Project Access Token 또는 Personal Access Token을 만듭니다.
- Bitbucket: 대상 저장소에 쓰기 가능한 Repository Access Token 또는 App Password를 만듭니다.
- 토큰 권한은 저장소 쓰기에 필요한 최소 범위만 부여합니다.

## 3. GitHub Actions secret 등록

GitHub 저장소의 `Settings → Secrets and variables → Actions → New repository secret`에서 아래 값을 등록합니다.

### GitLab

- 이름: `GITLAB_MIRROR_URL`
- 값 예시: `https://oauth2:TOKEN@gitlab.com/lincoln-cmd/rang-iosphere.git`

### Bitbucket

- 이름: `BITBUCKET_MIRROR_URL`
- Repository Access Token 값 예시: `https://x-token-auth:TOKEN@bitbucket.org/WORKSPACE/rang-iosphere.git`
- App Password 값 예시: `https://USERNAME:TOKEN@bitbucket.org/WORKSPACE/rang-iosphere.git`

`USERNAME`과 `TOKEN`을 실제 값으로 바꿉니다. 토큰이 URL에서 안전하게 사용되도록 특수문자가 포함된 토큰은 URL 인코딩합니다.

## 4. 첫 백업 실행

GitHub 저장소의 `Actions → Repository mirrors → Run workflow`에서 수동 실행합니다. GitLab과 Bitbucket 양쪽 작업이 성공했는지 확인한 뒤, 각 저장소에 `github-main` 브랜치와 태그가 생성됐는지 확인합니다. 원한다면 저장소의 기본 브랜치를 `github-main`으로 변경합니다.

## 주의

- 백업 저장소의 `main` 보호를 해제할 필요가 없습니다.
- 원격 브랜치나 태그를 강제 덮어쓰거나 삭제하지 않습니다.
- GitHub 기록을 강제로 재작성한 경우에는 백업도 자동 덮어쓰지 않고 실패합니다. 이때는 양쪽 기록을 확인한 후 수동으로 처리합니다.
- 비밀 URL이나 토큰은 문서, 커밋, 로그에 기록하지 않습니다.

## 초간단 스모크 테스트

1. GitHub `Actions → Repository mirrors`의 최신 실행이 초록색인지 확인합니다.
2. GitLab과 Bitbucket에서 `github-main` 브랜치의 최신 커밋 SHA가 GitHub `main`과 같은지 확인합니다.
3. 사이트 변경이 포함된 커밋이라면 `Quality`와 `Production smoke test`도 모두 초록색인지 확인합니다.
4. `https://rang-iosphere.pages.dev/`와 `/archive/`를 열어 최신 화면이 정상 표시되는지 확인합니다.
