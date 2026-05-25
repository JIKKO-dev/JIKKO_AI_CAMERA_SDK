# npm 배포 기록 및 운영 가이드

이 문서는 `@jikko/ai-camera`를 npm에 배포하면서 진행한 과정과 이후 버전 배포 방법을 정리한 문서입니다.

## 현재 배포 정보

```txt
패키지명: @jikko/ai-camera
현재 버전: 0.1.0
npm 접근 권한: public
GitHub repo: https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK
라이선스: MIT
```

설치 명령:

```bash
npm install @jikko/ai-camera
```

배포 확인:

```bash
npm view @jikko/ai-camera
npm view @jikko/ai-camera version
```

## 최초 배포 전 준비한 것

SDK만 별도 repo로 분리했습니다.

```txt
JIKKO_AI_CAMERA_SDK/
├── package.json
├── README.md
├── LICENSE
├── src/
├── test/
├── docs/
└── examples/
```

`package.json`의 핵심 설정:

```json
{
  "name": "@jikko/ai-camera",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK.git"
  },
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "src",
    "README.md"
  ]
}
```

`files` 설정 때문에 npm 패키지에는 `src`와 `README.md` 중심으로만 포함됩니다. `docs`, `examples`, `test`는 GitHub 공유용입니다.

## GitHub repo 생성 및 push

로컬에서 SDK repo를 초기화했습니다.

```bash
cd "/Users/geonukkim/Documents/0. JIKKO/JIKKO_AI_CAMERA_SDK"

git init
git branch -M main
git add .
git commit -m "Add JIKKO AI Camera SDK"
git remote add origin https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK.git
git push -u origin main
```

처음에는 잘못된 remote로 연결했다가 권한 오류가 났습니다.

```txt
remote: Permission to makeitall-dev/JIKKO_AI_CAMERA_SDK.git denied
```

해결:

```bash
git remote set-url origin https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK.git
git push -u origin main
```

## 최초 npm 배포 절차

배포 전에 테스트와 패키지 포함 파일을 확인했습니다.

```bash
cd "/Users/geonukkim/Documents/0. JIKKO/JIKKO_AI_CAMERA_SDK"

npm test
npm pack --dry-run
npm publish --dry-run --access public
```

실제 배포:

```bash
npm publish --access public
```

## 배포 파일 확인

배포 전 `npm pack --dry-run`으로 tarball에 들어갈 파일을 확인했습니다.

포함된 파일:

```txt
LICENSE
README.md
package.json
src/core/format.js
src/core/index.d.ts
src/core/index.js
src/core/protocol.js
src/core/results.js
src/index.d.ts
src/index.js
src/web/index.d.ts
src/web/index.js
src/web/web-serial.js
```

포함되지 않는 파일:

```txt
docs/
examples/
test/
node_modules/
dist/
내부 운영 문서
게임 프로젝트 파일
```

## 배포 중 발생했던 이슈

### 1. 2FA 또는 OTP 필요

처음 publish 때 아래 에러가 발생했습니다.

```txt
E403 Forbidden
Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

의미:

```txt
npm 계정에서 package publish를 하려면 2FA 인증 또는 2FA bypass 권한이 있는 token이 필요합니다.
```

해결 방법:

```bash
npm publish --access public --otp=123456
```

`123456` 자리에 npm 계정의 인증 앱에서 나온 6자리 OTP를 넣습니다.

또는 npm 웹에서 CLI 인증 링크가 열리면 브라우저에서 인증을 완료합니다.

### 2. scope not found

다음 에러도 발생했습니다.

```txt
E404 Not Found
Scope not found
```

의미:

```txt
@jikko/ai-camera에서 @jikko는 npm의 scope 또는 organization이어야 합니다.
GitHub의 JIKKO-dev 조직과 npm의 @jikko scope는 별개입니다.
```

해결:

```txt
npm에서 jikko scope/organization을 만들거나,
현재 npm 계정에 @jikko 배포 권한을 추가해야 합니다.
```

권한이 준비된 뒤 다시 publish를 실행했습니다.

```bash
npm publish --access public
```

## 새 버전 배포 방법

GitHub에 코드를 push한다고 npm 패키지가 자동으로 바뀌지는 않습니다.

```txt
GitHub push = 소스코드 업데이트
npm publish = npm install로 받는 패키지 업데이트
```

수정사항을 npm 사용자에게 반영하려면 버전을 올리고 다시 publish해야 합니다.

patch 버전 배포:

```bash
cd "/Users/geonukkim/Documents/0. JIKKO/JIKKO_AI_CAMERA_SDK"

npm test
npm version patch
git push
git push origin --tags
npm publish --access public
```

minor 버전 배포:

```bash
npm test
npm version minor
git push
git push origin --tags
npm publish --access public
```

major 버전 배포:

```bash
npm test
npm version major
git push
git push origin --tags
npm publish --access public
```

## 버전 기준

```txt
patch: 버그 수정, 문서 수정, 호환되는 작은 개선
minor: 새 이벤트/API 추가, 기존 사용법 유지
major: 기존 API 변경, 기존 프로젝트 수정 필요
```

현재 SDK는 `0.x` 단계입니다. `0.x`에서는 작은 변경도 실제 프로젝트에 영향을 줄 수 있으므로, 배포 전 예제와 실제 프로젝트에서 설치 테스트를 먼저 하는 것을 권장합니다.

## 배포 전 체크리스트

```bash
npm test
npm pack --dry-run
```

예제까지 확인할 때:

```bash
cd examples/web-serial-basic
npm install
npm audit --omit=optional
npm run build
```

확인할 것:

```txt
README 링크가 현재 GitHub repo를 가리키는가
package.json repository/bugs/homepage가 JIKKO-dev repo인가
src 외에 불필요한 내부 파일이 npm tarball에 포함되지 않는가
새 버전 번호가 맞는가
npm 로그인 계정이 @jikko scope publish 권한을 갖고 있는가
```

## 배포 후 확인

```bash
npm view @jikko/ai-camera
npm view @jikko/ai-camera version
```

새 폴더에서 설치 테스트:

```bash
mkdir /tmp/jikko-ai-camera-test
cd /tmp/jikko-ai-camera-test
npm init -y
npm install @jikko/ai-camera
```

간단한 import 테스트:

```bash
node --input-type=module -e "import { JikkoProtocolParser } from '@jikko/ai-camera/core'; console.log(new JikkoProtocolParser())"
```

## 실수했을 때

이미 배포한 같은 버전은 다시 publish할 수 없습니다.

예를 들어 `0.1.0`을 배포했다면, 수정 후에는 `0.1.1`로 올려야 합니다.

```bash
npm version patch
npm publish --access public
```

정말 민감한 파일이 올라간 경우에만 `unpublish`를 검토합니다. 일반적인 오타나 README 수정은 새 patch 버전으로 배포하는 편이 안전합니다.

```bash
npm unpublish @jikko/ai-camera@0.1.0
```

주의:

```txt
unpublish는 제한이 있고 되돌리기 어렵습니다.
일반 수정은 unpublish보다 새 버전 배포가 좋습니다.
```

## 사내 운영 원칙

SDK repo와 npm 패키지에는 아래 내용을 넣지 않습니다.

```txt
카메라 펌웨어
AI 모델 파일
학습 데이터
고객/현장 정보
API 키, 토큰, 비밀번호
비공개 운영 문서
```

공개 패키지에 들어가도 되는 것은 외부 개발자가 카메라를 연동하는 데 필요한 정보입니다.

```txt
설치 방법
Web Serial 연결 방법
패킷 파서 사용법
classification/detection 이벤트 형태
예제 코드
```

## 참고 링크

```txt
npm package:
https://www.npmjs.com/package/@jikko/ai-camera

GitHub repo:
https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK
```
