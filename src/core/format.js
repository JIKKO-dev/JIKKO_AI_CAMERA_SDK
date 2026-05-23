import { getCommandName } from './protocol.js'

export function formatByteHex(byte) {
  return Number(byte).toString(16).padStart(2, '0').toUpperCase()
}

export function formatBytesAsHex(bytes) {
  if (!bytes || bytes.length === 0) return ''
  return Array.from(bytes, formatByteHex).join(' ')
}

export function formatBytesAsAscii(bytes) {
  if (!bytes || bytes.length === 0) return ''

  return Array.from(bytes, (byte) => {
    if (byte >= 32 && byte <= 126) return String.fromCharCode(byte)
    if (byte === 10) return '\\n'
    if (byte === 13) return '\\r'
    return '.'
  }).join('')
}

export function formatCrc(value) {
  return `0x${(Number(value) >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}

export function formatPacket(packet) {
  if (!packet) return ''

  const command = packet.command || getCommandName(packet.cmd)
  return `${command} / len ${packet.length} / data ${formatBytesAsHex(packet.data)} / crc ${formatCrc(packet.crc)}`
}

