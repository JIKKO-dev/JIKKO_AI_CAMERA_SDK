import type {
  ClassificationResult,
  DetectionResult,
  JikkoPacket
} from '../core/index.js'

export type CameraStatus =
  | 'idle'
  | 'unsupported'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error'

export type CameraErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'PORT_OPEN_FAILED'
  | 'READ_FAILED'

export type CameraStatusEvent = {
  status: CameraStatus
  isConnected: boolean
  receivedAt: number
}

export type CameraErrorEvent = {
  code: CameraErrorCode
  message: string
  cause?: unknown
  receivedAt: number
}

export type RawChunkEvent = {
  bytes: Uint8Array
  receivedAt: number
}

export type ClassificationEvent = ClassificationResult & {
  packet: JikkoPacket
  receivedAt: number
}

export type ClassificationsEvent = {
  results: ClassificationResult[]
  packet: JikkoPacket
  receivedAt: number
}

export type DetectionEvent = DetectionResult & {
  packet: JikkoPacket
  receivedAt: number
}

export type DetectionsEvent = {
  results: DetectionResult[]
  packet: JikkoPacket
  receivedAt: number
}

export type CameraEventMap = {
  status: CameraStatusEvent
  error: CameraErrorEvent
  raw: RawChunkEvent
  packet: JikkoPacket
  classification: ClassificationEvent
  classifications: ClassificationsEvent
  detection: DetectionEvent
  detections: DetectionsEvent
}

export type WebSerialCameraOptions = {
  baudRate?: number
  emitRawChunks?: boolean
  filters?: SerialPortFilter[]
  serial?: Serial
}

export class WebSerialCamera {
  constructor(options?: WebSerialCameraOptions)
  connect(): Promise<void>
  disconnect(): Promise<void>
  getStatus(): CameraStatus
  isConnected(): boolean
  getLastPacket(): JikkoPacket | null
  on<EventName extends keyof CameraEventMap>(
    eventName: EventName,
    handler: (event: CameraEventMap[EventName]) => void
  ): () => void
}

export function createWebSerialCamera(options?: WebSerialCameraOptions): WebSerialCamera
export function isWebSerialSupported(serial?: Serial | null): boolean

