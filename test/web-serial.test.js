import assert from 'node:assert/strict'
import test from 'node:test'
import { createWebSerialCamera } from '../src/web/index.js'
import { JikkoCameraCommand } from '../src/core/index.js'

function packetBytes(cmd, data) {
  return Uint8Array.from([
    0xFD,
    cmd,
    data.length & 0xFF,
    (data.length >> 8) & 0xFF,
    ...data,
    0, 0, 0, 0,
    0xED
  ])
}

test('createWebSerialCamera reports unsupported when no serial implementation exists', async () => {
  const camera = createWebSerialCamera({ serial: null })
  const errors = []

  camera.on('error', (event) => errors.push(event))

  await assert.rejects(() => camera.connect(), /Web Serial API/)
  assert.equal(camera.getStatus(), 'unsupported')
  assert.equal(errors[0].code, 'UNSUPPORTED')
})

test('createWebSerialCamera emits classification events from camera packets', async () => {
  const packet = packetBytes(JikkoCameraCommand.CLASSIFICATION, [0, 2, 201])
  const reader = {
    readCount: 0,
    async read() {
      this.readCount += 1
      if (this.readCount === 1) return { value: packet, done: false }
      return { value: undefined, done: true }
    },
    async cancel() {},
    releaseLock() {}
  }
  const fakePort = {
    readable: {
      getReader() {
        return reader
      }
    },
    async open(options) {
      this.openOptions = options
    },
    async close() {
      this.closed = true
    }
  }
  const fakeSerial = {
    async requestPort() {
      return fakePort
    }
  }

  const camera = createWebSerialCamera({ serial: fakeSerial, baudRate: 115200 })
  const classification = new Promise((resolve) => {
    camera.on('classification', resolve)
  })

  await camera.connect()
  const event = await classification

  assert.equal(fakePort.openOptions.baudRate, 115200)
  assert.equal(event.classId, 2)
  assert.equal(event.score, 201)
  assert.equal(event.packet.command, 'CLASSIFICATION')

  await camera.disconnect()
  assert.equal(fakePort.closed, true)
})
