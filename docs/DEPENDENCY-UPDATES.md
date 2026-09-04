# 의존성 업데이트 운영 원칙

Dependabot은 업데이트를 `main`에 직접 반영하지 않고 Pull Request로만 제안합니다.

## 확인 순서

1. GitHub의 Pull requests에서 Dependabot 제안을 엽니다.
2. 변경된 버전과 릴리스 노트를 확인합니다.
3. `Quality checks`가 성공했는지 확인합니다.
4. 직접 병합한 뒤 `Deployment smoke test`가 성공했는지 확인합니다.
5. 운영 사이트를 간단히 확인한 다음 `pnpm backup:verified`로 백업합니다.

## 업데이트 주기

- Astro와 npm 패키지: 매주 월요일 오전 6시 30분경 확인
- GitHub Actions: 매월 확인
- minor·patch 업데이트는 관련 패키지끼리 묶어 제안
- major 업데이트는 호환성 확인을 위해 개별 제안

자동 병합은 사용하지 않습니다. 테스트가 실패하거나 변경 범위가 불분명한 PR은 병합하지 않고 보류합니다.
