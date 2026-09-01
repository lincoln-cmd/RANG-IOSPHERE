# GitLab·Bitbucket 백업 설정

GitHub의 `main` 브랜치나 태그가 변경되면 `.github/workflows/mirror.yml`이 전체 Git 저장소를 백업 저장소로 미러링합니다. 설정되지 않은 대상은 오류 없이 건너뜁니다.

## 1. 빈 백업 저장소 만들기

- GitLab과 Bitbucket에 각각 비어 있는 비공개 저장소를 만듭니다.
- README, 라이선스, `.gitignore`로 초기화하지 않습니다.
- 백업 전용 저장소로 사용하고 그곳에서 직접 커밋하지 않습니다.

## 2. 쓰기 토큰 만들기

- GitLab: 대상 저장소에 쓰기 가능한 Project Access Token 또는 Personal Access Token을 만듭니다.
- Bitbucket: 대상 저장소에 쓰기 가능한 Repository Access Token 또는 App Password를 만듭니다.
- 토큰 권한은 저장소 쓰기에 필요한 최소 범위만 부여합니다.

## 3. GitHub Actions secret 등록

GitHub 저장소의 `Settings → Secrets and variables → Actions → New repository secret`에서 아래 값을 등록합니다.

### GitLab

- 이름: `GITLAB_MIRROR_URL`
- 값 예시: `https://oauth2:TOKEN@gitlab.com/USERNAME/RANG-IOSPHERE.git`

### Bitbucket

- 이름: `BITBUCKET_MIRROR_URL`
- 값 예시: `https://USERNAME:TOKEN@bitbucket.org/USERNAME/rang-iosphere.git`

`USERNAME`과 `TOKEN`을 실제 값으로 바꿉니다. 토큰이 URL에서 안전하게 사용되도록 특수문자가 포함된 토큰은 URL 인코딩합니다.

## 4. 첫 백업 실행

GitHub 저장소의 `Actions → Repository mirrors → Run workflow`에서 수동 실행합니다. GitLab과 Bitbucket 양쪽 작업이 성공했는지 확인합니다.

## 주의

이 작업은 `git push --mirror`를 사용합니다. 백업 대상의 브랜치와 태그를 GitHub 상태와 동일하게 맞추므로, 백업 저장소에서 직접 만든 별도 브랜치나 태그는 삭제될 수 있습니다.
