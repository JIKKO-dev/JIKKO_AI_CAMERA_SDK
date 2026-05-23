export * from './core/index.js'
export {
  WebSerialCamera,
  createWebSerialCamera,
  isWebSerialSupported
} from './web/index.js'
export type {
  CameraErrorCode,
  CameraErrorEvent,
  CameraEventMap,
  CameraStatus,
  CameraStatusEvent,
  ClassificationEvent,
  ClassificationsEvent,
  DetectionEvent,
  DetectionsEvent,
  RawChunkEvent,
  WebSerialCameraOptions
} from './web/index.js'
