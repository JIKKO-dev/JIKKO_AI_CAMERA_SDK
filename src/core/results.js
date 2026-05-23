import { JikkoCameraCommand } from './protocol.js'

function toByteArray(data) {
  if (!data) return []
  return Array.from(data, (byte) => Number(byte) & 0xFF)
}

function readUint16LE(data, offset) {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8)
}

export function parseClassificationResults(packet) {
  if (!packet || packet.cmd !== JikkoCameraCommand.CLASSIFICATION) return []

  const data = toByteArray(packet.data)
  const results = []

  if (data.length >= 3 && data.length % 3 === 0) {
    for (let offset = 0; offset + 2 < data.length; offset += 3) {
      results.push({
        type: data[offset],
        classId: data[offset + 1],
        score: data[offset + 2],
        index: results.length
      })
    }
    return results
  }

  if (typeof data[1] !== 'undefined') {
    results.push({
      type: data[0] ?? 0,
      classId: data[1],
      score: data[2] ?? 0,
      index: 0
    })
  }

  for (let offset = 3; offset < data.length; offset += 2) {
    results.push({
      type: data[offset - 1] ?? 0,
      classId: data[offset],
      score: data[offset + 1] ?? 0,
      index: results.length
    })
  }

  return results
}

export function parseDetectionResults(packet) {
  if (!packet || packet.cmd !== JikkoCameraCommand.DETECTION) return []

  const data = toByteArray(packet.data)
  const results = []

  if (data.length >= 11 && data.length % 11 === 0) {
    for (let offset = 0; offset + 10 < data.length; offset += 11) {
      results.push({
        type: data[offset],
        classId: data[offset + 1],
        centerX: readUint16LE(data, offset + 2),
        centerY: readUint16LE(data, offset + 4),
        width: readUint16LE(data, offset + 6),
        height: readUint16LE(data, offset + 8),
        score: data[offset + 10],
        index: results.length
      })
    }
    return results
  }

  if (data.length >= 11 && (data.length - 1) % 10 === 0) {
    for (let offset = 1; offset + 9 < data.length; offset += 10) {
      results.push({
        type: data[0],
        classId: data[offset],
        centerX: readUint16LE(data, offset + 1),
        centerY: readUint16LE(data, offset + 3),
        width: readUint16LE(data, offset + 5),
        height: readUint16LE(data, offset + 7),
        score: data[offset + 9],
        index: results.length
      })
    }
    return results
  }

  for (let offset = 1; offset + 5 < data.length; offset += 6) {
    results.push({
      type: data[offset - 1] ?? 0,
      classId: data[offset],
      centerX: data[offset + 1],
      centerY: data[offset + 2],
      width: data[offset + 3],
      height: data[offset + 4],
      score: data[offset + 5],
      index: results.length
    })
  }

  return results
}

export function parsePacketResults(packet) {
  return {
    packet,
    classifications: parseClassificationResults(packet),
    detections: parseDetectionResults(packet)
  }
}

