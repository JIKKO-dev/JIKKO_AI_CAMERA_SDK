# JIKKO AI Camera SDK 사용 방법

`@jikko/ai-camera`는 JIKKO AI Camera에서 들어오는 시리얼 데이터를 JavaScript 프로젝트에서 쉽게 사용할 수 있도록 만든 SDK입니다.

SDK는 두 영역으로 나뉩니다.

```txt
@jikko/ai-camera/core
프로토콜 패킷 파싱, classification/detection 결과 해석

@jikko/ai-camera/web
브라우저 Web Serial API 연결, 이벤트 기반 카메라 데이터 수신
```

## 설치

```bash
npm install @jikko/ai-camera
```

## 브라우저 지원 조건

Web Serial API를 사용하려면 아래 조건이 필요합니다.

- Chrome 또는 Edge 계열 브라우저
- HTTPS 환경 또는 `localhost`
- 사용자가 직접 버튼을 눌러 포트 연결 승인
- USB 시리얼 장치가 OS에서 인식된 상태

Safari와 Firefox는 Web Serial API를 기본 지원하지 않습니다.

## 가장 간단한 WebSerial 연결

```js
import { createWebSerialCamera } from '@jikko/ai-camera/web'

const camera = createWebSerialCamera({
  baudRate: 9600
})

camera.on('classification', (event) => {
  console.log('classId:', event.classId)
  console.log('score:', event.score)
})

camera.on('detection', (event) => {
  console.log('classId:', event.classId)
  console.log('box:', event.centerX, event.centerY, event.width, event.height)
})

camera.on('error', (event) => {
  console.error(event.code, event.message)
})

await camera.connect()
```

`camera.connect()`는 반드시 사용자 클릭 같은 브라우저 사용자 액션 안에서 실행하는 것이 좋습니다.

```js
document.querySelector('#connect').addEventListener('click', async () => {
  await camera.connect()
})
```

## React 예시

```jsx
import { useEffect, useRef, useState } from 'react'
import { createWebSerialCamera } from '@jikko/ai-camera/web'

export function CameraPanel() {
  const cameraRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [lastClassId, setLastClassId] = useState(null)

  useEffect(() => {
    const camera = createWebSerialCamera({ baudRate: 9600 })
    cameraRef.current = camera

    const offStatus = camera.on('status', (event) => {
      setStatus(event.status)
    })

    const offClassification = camera.on('classification', (event) => {
      setLastClassId(event.classId)
    })

    const offError = camera.on('error', (event) => {
      console.error(event.code, event.message)
    })

    return () => {
      offStatus()
      offClassification()
      offError()
      camera.disconnect().catch(() => {})
    }
  }, [])

  return (
    <section>
      <button onClick={() => cameraRef.current?.connect()}>
        카메라 연결
      </button>
      <p>상태: {status}</p>
      <p>마지막 classId: {lastClassId ?? '-'}</p>
    </section>
  )
}
```

## 이벤트 목록

### `status`

카메라 연결 상태가 바뀔 때 발생합니다.

```js
camera.on('status', (event) => {
  console.log(event.status)
})
```

상태 값:

```txt
idle
unsupported
connecting
connected
disconnecting
disconnected
error
```

### `classification`

classification 결과 1개마다 발생합니다.

```js
camera.on('classification', (event) => {
  console.log(event.classId, event.score)
})
```

### `classifications`

한 패킷 안에 들어있는 classification 결과 묶음입니다.

```js
camera.on('classifications', (event) => {
  for (const result of event.results) {
    console.log(result.classId, result.score)
  }
})
```

### `detection`

detection 결과 1개마다 발생합니다.

```js
camera.on('detection', (event) => {
  console.log(event.classId)
  console.log(event.centerX, event.centerY, event.width, event.height)
})
```

### `packet`

파싱된 원본 패킷이 필요할 때 사용합니다.

```js
camera.on('packet', (packet) => {
  console.log(packet.command, packet.length, packet.data)
})
```

### `raw`

시리얼에서 들어온 원본 byte chunk입니다. 디버깅할 때만 켜는 것을 권장합니다.

```js
const camera = createWebSerialCamera({
  baudRate: 9600,
  emitRawChunks: true
})

camera.on('raw', (event) => {
  console.log(event.bytes)
})
```

## Parser만 사용하는 방법

Web Serial을 쓰지 않고, 이미 받은 byte 배열만 파싱할 수도 있습니다.

```js
import { JikkoProtocolParser, parsePacketResults } from '@jikko/ai-camera/core'

const parser = new JikkoProtocolParser()
const packets = parser.feedChunk(bytes)

for (const packet of packets) {
  const parsed = parsePacketResults(packet)
  console.log(parsed.classifications)
  console.log(parsed.detections)
}
```

byte를 하나씩 넣을 수도 있습니다.

```js
const packet = parser.feed(byte)

if (packet) {
  console.log(packet)
}
```

## 게임이나 앱에서 classId 매핑하기

SDK는 `classId`의 의미를 정하지 않습니다. 프로젝트에서 직접 매핑해야 합니다.

```js
const classIdToAction = {
  0: 'CLEAR',
  1: 'FIX_BATTERY',
  2: 'FIX_ANTENNA',
  3: 'FIX_COOLANT'
}

camera.on('classification', (event) => {
  const action = classIdToAction[event.classId]
  if (!action) return

  runAction(action)
})
```

이렇게 분리하면 같은 카메라 SDK를 게임, 체험 부스, 대시보드, 교육 콘텐츠에서 각각 다르게 사용할 수 있습니다.

## 문제 해결

### 브라우저에서 `unsupported`가 나옵니다

Chrome 또는 Edge에서 실행 중인지 확인하세요. HTTPS 또는 `localhost` 환경인지도 확인해야 합니다.

### 포트 선택 창이 뜨지 않습니다

`camera.connect()`가 버튼 클릭 같은 사용자 액션 안에서 실행되는지 확인하세요. 브라우저 정책상 자동 연결은 막힐 수 있습니다.

### 데이터가 너무 자주 들어옵니다

SDK는 카메라 데이터를 그대로 이벤트로 전달합니다. 중복 제거, 안정화 시간, 딜레이 처리는 앱에서 구현하는 것을 권장합니다.

```js
let lastAcceptedAt = 0

camera.on('classification', (event) => {
  const now = Date.now()
  if (now - lastAcceptedAt < 800) return

  lastAcceptedAt = now
  handleClassId(event.classId)
})
```

### 패킷은 들어오는데 앱 동작이 안 됩니다

`packet` 또는 `raw` 이벤트로 실제 `classId`가 무엇인지 먼저 확인하세요.

```js
camera.on('packet', (packet) => {
  console.log(packet.command, [...packet.data])
})
```

