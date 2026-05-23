# JIKKO AI Camera SDK 사내 활용 가이드

이 문서는 사내 프로젝트에서 `@jikko/ai-camera`를 일관되게 사용하기 위한 가이드입니다.

## 기본 원칙

SDK는 카메라 통신까지만 책임집니다.

```txt
SDK가 책임지는 것
- Web Serial 연결
- JIKKO AI Camera 패킷 파싱
- classification 결과 전달
- detection 결과 전달
- raw packet/debug 이벤트 전달

각 프로젝트가 책임지는 것
- classId 의미 매핑
- 게임 규칙
- UI 상태
- 중복 입력 방지
- 점수/정답/오답 처리
- 서버 전송
```

이 기준을 지키면 SDK를 게임뿐 아니라 전시, 교육, 검사, 데모 앱에서도 재사용할 수 있습니다.

## 설치 표준

새 프로젝트에서는 npm 패키지로 설치합니다.

```bash
npm install @jikko/ai-camera
```

`package.json`에는 patch 버전까지 허용하는 형태를 권장합니다.

```json
{
  "dependencies": {
    "@jikko/ai-camera": "^0.1.0"
  }
}
```

아직 SDK API가 `0.x` 단계이므로, 중요한 현장 배포 프로젝트에서는 정확한 버전을 고정해도 됩니다.

```json
{
  "dependencies": {
    "@jikko/ai-camera": "0.1.0"
  }
}
```

## 프로젝트 적용 체크리스트

1. Chrome 또는 Edge 기반 환경인지 확인한다.
2. 배포 주소가 HTTPS인지 확인한다.
3. 연결 버튼에서 `camera.connect()`를 호출한다.
4. `status`, `error`, `packet` 이벤트를 먼저 붙여 디버깅한다.
5. 실제 카메라가 보내는 `classId` 목록을 확인한다.
6. 프로젝트별 `classId` 매핑표를 만든다.
7. 연속 입력 방지 정책을 앱에 넣는다.
8. 현장 QA에서 케이블 분리, 권한 거부, 새로고침 상황을 확인한다.

## 권장 코드 구조

React 프로젝트라면 카메라 연결 코드를 화면 컴포넌트에 직접 많이 넣지 말고, hook 또는 service로 분리하는 것을 권장합니다.

```txt
src/
├── camera/
│   ├── jikkoCamera.js
│   └── classIdMap.js
├── pages/
└── components/
```

예시:

```js
// src/camera/classIdMap.js
export const classIdMap = {
  0: 'CLEAR',
  1: 'FIX_BATTERY',
  2: 'FIX_ANTENNA',
  3: 'FIX_COOLANT'
}
```

```js
// src/camera/jikkoCamera.js
import { createWebSerialCamera } from '@jikko/ai-camera/web'
import { classIdMap } from './classIdMap.js'

export function createProjectCamera({ onAction, onStatus, onError }) {
  const camera = createWebSerialCamera({
    baudRate: 9600,
    emitRawChunks: false
  })

  const offStatus = camera.on('status', onStatus)
  const offError = camera.on('error', onError)
  const offClassification = camera.on('classification', (event) => {
    const action = classIdMap[event.classId]
    if (!action) return

    onAction({
      action,
      classId: event.classId,
      score: event.score,
      receivedAt: event.receivedAt
    })
  })

  return {
    connect: () => camera.connect(),
    disconnect: () => camera.disconnect(),
    dispose: () => {
      offStatus()
      offError()
      offClassification()
      camera.disconnect().catch(() => {})
    }
  }
}
```

## 연속 입력 처리 정책

카메라는 값을 실시간으로 계속 보낼 수 있습니다. SDK에서 임의로 값을 줄이면 다른 프로젝트에서 문제가 생길 수 있으므로, 안정화 처리는 프로젝트에서 합니다.

권장 기본값:

```txt
같은 값 유지 시간: 700ms ~ 1000ms
같은 값 재입력 쿨다운: 1000ms ~ 1500ms
raw debug 출력: 개발/설치 모드에서만 ON
```

예시:

```js
let candidate = null
let candidateStartedAt = 0
let lastAccepted = null
let lastAcceptedAt = 0

export function acceptStableClassId(classId, onAccept) {
  const now = Date.now()

  if (lastAccepted === classId && now - lastAcceptedAt < 1200) {
    return
  }

  if (candidate !== classId) {
    candidate = classId
    candidateStartedAt = now
    return
  }

  if (now - candidateStartedAt < 800) {
    return
  }

  lastAccepted = classId
  lastAcceptedAt = now
  onAccept(classId)
}
```

## 디버깅 모드 표준

현장 설치 앱에는 가능하면 숨겨진 디버그 패널을 두는 것을 권장합니다.

표시하면 좋은 항목:

```txt
카메라 연결 상태
마지막 packet command
마지막 data hex
마지막 classId
마지막 score
raw byte 수신 시간
error code/message
```

디버깅 예시:

```js
import { formatBytesAsHex } from '@jikko/ai-camera/core'

camera.on('packet', (packet) => {
  console.log({
    command: packet.command,
    length: packet.length,
    data: formatBytesAsHex(packet.data),
    crc: packet.crc
  })
})
```

## Web 배포 시 주의사항

Web Serial은 보안 정책 때문에 아래 조건을 요구합니다.

```txt
localhost 개발: 가능
HTTPS 배포: 가능
HTTP 배포: 불가
iframe 내부: 권한 정책에 따라 제한 가능
모바일 브라우저: 제한 가능
Safari/Firefox: 기본 미지원
```

현장 배포는 Chrome 또는 Edge 고정 운영을 권장합니다.

## 사내 버전 운영 방식

SDK 수정 후 npm 사용자에게 반영하려면 버전을 올리고 다시 publish해야 합니다.

```bash
npm test
npm version patch
git push
git push origin --tags
npm publish --access public
```

버전 기준:

```txt
patch: 버그 수정, 문서 수정, 호환되는 작은 개선
minor: 새 이벤트/API 추가, 기존 사용법 유지
major: 기존 API 변경, 기존 프로젝트 수정 필요
```

현재 `0.x` 단계에서는 minor 변경도 실제 사용 프로젝트에 영향을 줄 수 있으니, 현장 프로젝트는 업데이트 전에 설치 테스트를 먼저 해야 합니다.

## 공개하면 안 되는 것

SDK repo와 npm 패키지에는 아래 내용을 넣지 않습니다.

```txt
카메라 펌웨어
AI 모델 파일
학습 데이터
내부 운영 문서
고객/현장 정보
API 키, 토큰, 비밀번호
비공개 프로토콜 실험 메모
```

외부 개발자에게 필요한 것은 “연결 방법, 이벤트 형태, classId 받는 법”입니다.

## 사내 공유 문구 예시

```txt
JIKKO AI Camera SDK가 npm으로 배포되었습니다.

설치:
npm install @jikko/ai-camera

주요 기능:
- 브라우저 Web Serial 연결
- JIKKO AI Camera 패킷 파싱
- classification/detection 이벤트 제공
- React/Vite/Web 프로젝트에서 사용 가능

문서:
https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK
```

