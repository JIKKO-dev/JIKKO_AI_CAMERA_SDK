import assert from 'node:assert/strict'
import test from 'node:test'
import {
  JikkoCameraCommand,
  JikkoProtocolParser,
  formatBytesAsHex,
  formatPacket,
  parseClassificationResults,
  parseDetectionResults,
  parsePacketResults
} from '../src/core/index.js'

function packetBytes(cmd, data, crc = [0, 0, 0, 0]) {
  return Uint8Array.from([
    0xFD,
    cmd,
    data.length & 0xFF,
    (data.length >> 8) & 0xFF,
    ...data,
    ...crc,
    0xED
  ])
}

test('JikkoProtocolParser reconstructs one complete packet from byte chunks', () => {
  const parser = new JikkoProtocolParser()
  const packet = parser.feedChunk(packetBytes(JikkoCameraCommand.CLASSIFICATION, [0, 1, 149]))

  assert.equal(packet.length, 1)
  assert.equal(packet[0].command, 'CLASSIFICATION')
  assert.equal(packet[0].cmd, JikkoCameraCommand.CLASSIFICATION)
  assert.equal(packet[0].length, 3)
  assert.deepEqual([...packet[0].data], [0, 1, 149])
  assert.equal(packet[0].crc, 0)
  assert.equal(packet[0].end, 0xED)
})

test('JikkoProtocolParser drops a packet with an invalid end byte and recovers', () => {
  const parser = new JikkoProtocolParser()
  const badPacket = packetBytes(JikkoCameraCommand.CLASSIFICATION, [0, 1, 149])
  badPacket[badPacket.length - 1] = 0xEE

  assert.deepEqual(parser.feedChunk(badPacket), [])

  const goodPackets = parser.feedChunk(packetBytes(JikkoCameraCommand.CLASSIFICATION, [0, 2, 177]))
  assert.equal(goodPackets.length, 1)
  assert.equal(goodPackets[0].data[1], 2)
})

test('parseClassificationResults extracts 3-byte classification records', () => {
  const [packet] = new JikkoProtocolParser().feedChunk(
    packetBytes(JikkoCameraCommand.CLASSIFICATION, [0, 1, 149, 0, 2, 201])
  )

  assert.deepEqual(parseClassificationResults(packet), [
    { type: 0, classId: 1, score: 149, index: 0 },
    { type: 0, classId: 2, score: 201, index: 1 }
  ])
  assert.deepEqual(parsePacketResults(packet).classifications.map((item) => item.classId), [1, 2])
})

test('parseDetectionResults extracts 11-byte detection records', () => {
  const detectionData = [
    0,
    3,
    10, 0,
    20, 0,
    30, 0,
    40, 0,
    222
  ]
  const [packet] = new JikkoProtocolParser().feedChunk(
    packetBytes(JikkoCameraCommand.DETECTION, detectionData)
  )

  assert.deepEqual(parseDetectionResults(packet), [
    {
      type: 0,
      classId: 3,
      centerX: 10,
      centerY: 20,
      width: 30,
      height: 40,
      score: 222,
      index: 0
    }
  ])
})

test('format helpers expose readable debug output', () => {
  const [packet] = new JikkoProtocolParser().feedChunk(
    packetBytes(JikkoCameraCommand.CLASSIFICATION, [0, 1, 149])
  )

  assert.equal(formatBytesAsHex(packet.data), '00 01 95')
  assert.match(formatPacket(packet), /CLASSIFICATION/)
  assert.match(formatPacket(packet), /00 01 95/)
})
