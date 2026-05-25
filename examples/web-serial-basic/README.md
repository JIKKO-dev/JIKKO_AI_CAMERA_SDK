# Web Serial Basic Example

`@jikko/ai-camera`를 브라우저에서 사용하는 기본 예제입니다.

## 실행

```bash
cd examples/web-serial-basic
npm install
npm run dev
```

브라우저에서 Vite가 출력하는 localhost 주소를 열고 `카메라 연결` 버튼을 누릅니다.

## 확인할 수 있는 것

- Web Serial 연결 상태
- 마지막 `classId`
- 마지막 `score`
- classification 이벤트 로그
- detection 이벤트 로그
- packet/raw byte 디버그 로그

## 주의사항

Web Serial API는 Chrome 또는 Edge 계열 브라우저에서 동작합니다. 배포 환경에서는 HTTPS가 필요하고, 로컬 개발에서는 `localhost` 또는 `127.0.0.1`을 사용하면 됩니다.
