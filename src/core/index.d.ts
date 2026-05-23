export const JIKKO_PACKET_START: 0xFD
export const JIKKO_PACKET_END: 0xED

export const JikkoCameraCommand: {
  readonly KEYPOINT_BOX_DETECTION: 0x00
  readonly CLASSIFICATION: 0x01
  readonly DETECTION: 0x02
}

export type JikkoCommandName =
  | 'KEYPOINT_BOX_DETECTION'
  | 'CLASSIFICATION'
  | 'DETECTION'
  | 'UNKNOWN'

export type JikkoPacket = {
  start: 0xFD
  cmd: number
  command: JikkoCommandName
  length: number
  data: Uint8Array
  crc: number
  end: 0xED
  receivedAt: number
}

export type ClassificationResult = {
  type: number
  classId: number
  score: number
  index: number
}

export type DetectionResult = {
  type: number
  classId: number
  centerX: number
  centerY: number
  width: number
  height: number
  score: number
  index: number
}

export type ParsedPacketResults = {
  packet: JikkoPacket
  classifications: ClassificationResult[]
  detections: DetectionResult[]
}

export class JikkoProtocolParser {
  feed(byte: number): JikkoPacket | null
  feedChunk(bytes: Iterable<number>): JikkoPacket[]
  reset(): void
}

export function getCommandName(cmd: number): JikkoCommandName
export function parseClassificationResults(packet: JikkoPacket): ClassificationResult[]
export function parseDetectionResults(packet: JikkoPacket): DetectionResult[]
export function parsePacketResults(packet: JikkoPacket): ParsedPacketResults
export function formatByteHex(byte: number): string
export function formatBytesAsAscii(bytes: Iterable<number>): string
export function formatBytesAsHex(bytes: Iterable<number>): string
export function formatCrc(value: number): string
export function formatPacket(packet: JikkoPacket): string

