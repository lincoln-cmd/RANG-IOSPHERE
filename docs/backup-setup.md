# GitLab·Bitbucket 수동 백업

GitHub을 개발과 배포의 기준 저장소로 사용하고, GitLab과 Bitbucket에는 검증을 마친 시점만 수동으로 백업합니다. GitHub의 문제가 자동으로 복제되는 것을 막기 위해 자동 미러 워크플로는 사용하지 않습니다.

## 저장 위치

- GitHub 기준 브랜치: `main`
- GitLab 백업 브랜치: `backup-main`
- Bitbucket 백업 브랜치: `backup-main`

두 백업 저장소의 기존 `main`은 독립된 초기 커밋이므로 그대로 보존합니다. 강제 push는 사용하지 않습니다.

## 최초 원격 등록

```powershell
git remote add gitlab https://gitlab.com/lincoln-cmd/rang-iosphere.git
git remote add bitbucket https://bitbucket.org/lincoln_kim/rang-iosphere.git
```

이미 등록됐다면 다시 실행하지 않습니다. `git remote -v`로 확인합니다.

## 백업 전 초간단 스모크 테스트

1. GitHub Actions의 최신 `Quality checks`가 성공했는지 확인합니다.
2. 최신 `Deployment smoke test`가 성공했는지 확인합니다.
3. `https://rang-iosphere.pages.dev/`, `/archive/`, 최신 게시물을 직접 엽니다.
4. `git status --short --branch`에서 의도하지 않은 변경이 없는지 확인합니다.
5. `git pull --ff-only origin main`으로 GitHub 최신 커밋을 받습니다.

## 수동 백업 실행

```powershell
git push gitlab main:backup-main
git push bitbucket main:backup-main
```

안정 시점을 표시하려면 같은 커밋에 날짜 태그를 추가합니다.

```powershell
git tag backup-YYYY-MM-DD
git push origin backup-YYYY-MM-DD
git push gitlab backup-YYYY-MM-DD
git push bitbucket backup-YYYY-MM-DD
```

같은 날짜에 여러 번 백업할 때는 `backup-YYYY-MM-DD-2`처럼 번호를 붙입니다. 이미 공유한 태그는 이동시키거나 강제로 덮어쓰지 않습니다.

## 백업 확인

```powershell
git ls-remote gitlab refs/heads/backup-main
git ls-remote bitbucket refs/heads/backup-main
git rev-parse main
```

두 원격의 SHA가 로컬 `main` SHA와 같으면 백업이 완료된 것입니다. 인증 토큰이나 비밀번호는 문서와 커밋에 기록하지 않습니다.
