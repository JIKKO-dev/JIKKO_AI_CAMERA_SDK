export const JIKKO_PACKET_START = 0xFD
export const JIKKO_PACKET_END = 0xED

export const JikkoCameraCommand = Object.freeze({
  KEYPOINT_BOX_DETECTION: 0x00,
  CLASSIFICATION: 0x01,
  DETECTION: 0x02
})

const commandNames = Object.freeze({
  [JikkoCameraCommand.KEYPOINT_BOX_DETECTION]: 'KEYPOINT_BOX_DETECTION',
  [JikkoCameraCommand.CLASSIFICATION]: 'CLASSIFICATION',
  [JikkoCameraCommand.DETECTION]: 'DETECTION'
})

const ReceiveState = Object.freeze({
  WAIT_START: 0,
  HEAD: 1,
  DATA: 2,
  CRC: 3,
  END: 4
})

export function getCommandName(cmd) {
  return commandNames[cmd] || 'UNKNOWN'
}

function readUint32LE(bytes) {
  return (
    (bytes[0] |
      (bytes[1] << 8) |
      (bytes[2] << 16) |
      (bytes[3] << 24)) >>> 0
  )
}

export class JikkoProtocolParser {
  constructor() {
    this.reset()
  }

  feed(byte) {
    const normalizedByte = Number(byte) & 0xFF

    switch (this.state) {
      case ReceiveState.WAIT_START:
        if (normalizedByte === JIKKO_PACKET_START) {
          this.currentPacket = {
            start: normalizedByte,
            cmd: 0,
            command: 'UNKNOWN',
            length: 0,
            data: new Uint8Array(),
            crc: 0,
            end: 0,
            receivedAt: Date.now()
          }
          this.receiveBuffer = []
          this.state = ReceiveState.HEAD
        }
        break

      case ReceiveState.HEAD:
        this.receiveBuffer.push(normalizedByte)
        if (this.receiveBuffer.length === 3) {
          const cmd = this.receiveBuffer[0]
          this.currentPacket.cmd = cmd
          this.currentPacket.command = getCommandName(cmd)
          this.currentPacket.length = this.receiveBuffer[1] | (this.receiveBuffer[2] << 8)
          this.receiveBuffer = []
          this.state = this.currentPacket.length === 0 ? ReceiveState.CRC : ReceiveState.DATA
        }
        break

      case ReceiveState.DATA:
        this.receiveBuffer.push(normalizedByte)
        if (this.receiveBuffer.length === this.currentPacket.length) {
          this.currentPacket.data = Uint8Array.from(this.receiveBuffer)
          this.receiveBuffer = []
          this.state = ReceiveState.CRC
        }
        break

      case ReceiveState.CRC:
        this.receiveBuffer.push(normalizedByte)
        if (this.receiveBuffer.length === 4) {
          this.currentPacket.crc = readUint32LE(this.receiveBuffer)
          this.receiveBuffer = []
          this.state = ReceiveState.END
        }
        break

      case ReceiveState.END:
        if (normalizedByte === JIKKO_PACKET_END) {
          const packet = {
            ...this.currentPacket,
            end: normalizedByte,
            receivedAt: Date.now()
          }
          this.reset()
          return packet
        }
        this.reset()
        break

      default:
        this.reset()
        break
    }

    return null
  }

  feedChunk(bytes) {
    const packets = []
    if (!bytes) return packets

    for (const byte of bytes) {
      const packet = this.feed(byte)
      if (packet) packets.push(packet)
    }

    return packets
  }

  reset() {
    this.state = ReceiveState.WAIT_START
    this.currentPacket = null
    this.receiveBuffer = []
  }
}

