# @jikko/ai-camera

JIKKO AI Camera SDK입니다. 카메라 시리얼 프로토콜을 파싱하는 `core`와 브라우저 Web Serial API로 카메라에 연결하는 `web` 어댑터를 제공합니다.

이 패키지는 게임 규칙을 포함하지 않습니다. `CLEAR`, `BATTERY`, `ANTENA`, `COOLANT` 같은 카드 의미는 각 프로젝트에서 `classId`를 받아 매핑해야 합니다.

## 설치

```bash
npm install @jikko/ai-camera
```

## 문서

- [사용 방법](https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK/blob/main/docs/GETTING_STARTED.md)
- [사내 활용 가이드](https://github.com/JIKKO-dev/JIKKO_AI_CAMERA_SDK/blob/main/docs/INTERNAL_ADOPTION_GUIDE.md)

## WebSerial 사용

```js
import { createWebSerialCamera } from '@jikko/ai-camera/web'

const camera = createWebSerialCamera({
  baudRate: 9600,
  emitRawChunks: true
})

camera.on('classification', (event) => {
  console.log(event.classId, event.score)
})

camera.on('detection', (event) => {
  console.log(event.classId, event.centerX, event.centerY)
})

camera.on('packet', (packet) => {
  console.log(packet.command, packet.length, packet.data)
})

camera.on('error', (event) => {
  console.error(event.code, event.message)
})

await camera.connect()
```

Web Serial API는 Chrome/Edge 계열 브라우저와 HTTPS 또는 localhost 환경이 필요합니다.

## Parser만 사용

```js
import { JikkoProtocolParser, parsePacketResults } from '@jikko/ai-camera/core'

const parser = new JikkoProtocolParser()
const packets = parser.feedChunk(bytes)

for (const packet of packets) {
  const parsed = parsePacketResults(packet)
  console.log(parsed.classifications, parsed.detections)
}
```

## 패킷 구조

```txt
START  CMD  LEN_L  LEN_H  DATA...  CRC_0  CRC_1  CRC_2  CRC_3  END
0xFD   1B   1B     1B     LEN      4B little-endian          0xED
```

명령:

```txt
0x00 KEYPOINT_BOX_DETECTION
0x01 CLASSIFICATION
0x02 DETECTION
```

현재 v0.1은 CRC 값을 읽어서 `packet.crc`로 제공합니다. CRC 검증은 아직 수행하지 않습니다.

## 개발

```bash
npm install
npm test
```
