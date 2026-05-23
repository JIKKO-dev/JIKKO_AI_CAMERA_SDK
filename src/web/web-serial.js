import { JikkoProtocolParser } from '../core/protocol.js'
import { parsePacketResults } from '../core/results.js'

const DEFAULT_BAUD_RATE = 9600

class EventEmitter {
  constructor() {
    this.listeners = new Map()
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set())
    }

    this.listeners.get(eventName).add(handler)

    return () => {
      this.listeners.get(eventName)?.delete(handler)
    }
  }

  emit(eventName, event) {
    const handlers = this.listeners.get(eventName)
    if (!handlers) return

    for (const handler of handlers) {
      try {
        handler(event)
      } catch (error) {
        setTimeout(() => {
          throw error
        }, 0)
      }
    }
  }

  clear() {
    this.listeners.clear()
  }
}

function getDefaultSerial() {
  return globalThis.navigator?.serial ?? null
}

function cloneBytes(bytes) {
  return Uint8Array.from(bytes)
}

export function isWebSerialSupported(serial = getDefaultSerial()) {
  return !!serial
}

export function createWebSerialCamera(options = {}) {
  return new WebSerialCamera(options)
}

export class WebSerialCamera {
  constructor(options = {}) {
    this.options = {
      baudRate: DEFAULT_BAUD_RATE,
      emitRawChunks: false,
      filters: undefined,
      serial: undefined,
      ...options
    }
    this.serial = Object.prototype.hasOwnProperty.call(options, 'serial')
      ? options.serial
      : getDefaultSerial()
    this.parser = new JikkoProtocolParser()
    this.emitter = new EventEmitter()
    this.port = null
    this.reader = null
    this.status = isWebSerialSupported(this.serial) ? 'idle' : 'unsupported'
    this.lastPacket = null
    this.readLoopPromise = null
    this.disconnecting = false
  }

  on(eventName, handler) {
    return this.emitter.on(eventName, handler)
  }

  getStatus() {
    return this.status
  }

  isConnected() {
    return this.status === 'connected'
  }

  getLastPacket() {
    return this.lastPacket
  }

  async connect() {
    if (!isWebSerialSupported(this.serial)) {
      const error = new Error('Web Serial API is not supported.')
      this.setStatus('unsupported')
      this.emitError('UNSUPPORTED', error.message, error)
      throw error
    }

    if (this.isConnected()) return

    this.disconnecting = false
    this.setStatus('connecting')

    try {
      const requestOptions = this.options.filters
        ? { filters: this.options.filters }
        : undefined
      const port = await this.serial.requestPort(requestOptions)
      await port.open({ baudRate: this.options.baudRate })

      this.port = port
      this.parser.reset()
      this.setStatus('connected')
      this.readLoopPromise = this.startReadLoop(port)
    } catch (error) {
      this.setStatus('error')
      this.emitError(
        error?.name === 'NotFoundError' ? 'PERMISSION_DENIED' : 'PORT_OPEN_FAILED',
        error?.message || 'Failed to open serial port.',
        error
      )
      throw error
    }
  }

  async disconnect() {
    this.disconnecting = true
    this.setStatus('disconnecting')

    const reader = this.reader
    this.reader = null
    if (reader) {
      try {
        await reader.cancel()
      } catch {
        // Some browsers reject cancel after the stream has already closed.
      }
      this.releaseReader(reader)
    }

    if (this.readLoopPromise) {
      try {
        await this.readLoopPromise
      } catch {
        // Read loop errors are already emitted through the error event.
      }
      this.readLoopPromise = null
    }

    if (this.port) {
      try {
        await this.port.close()
      } catch {
        // The OS or browser can close the port first.
      }
      this.port = null
    }

    this.parser.reset()
    this.setStatus('disconnected')
  }

  async startReadLoop(port) {
    if (!port?.readable) return

    let reader = null

    try {
      reader = port.readable.getReader()
      this.reader = reader

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue

        this.handleChunk(value)
      }
    } catch (error) {
      if (!this.disconnecting && error?.name !== 'AbortError') {
        this.setStatus('error')
        this.emitError('READ_FAILED', error?.message || 'Failed to read serial data.', error)
      }
    } finally {
      if (this.reader === reader) {
        this.reader = null
      }
      this.releaseReader(reader)

      if (!this.disconnecting && this.status === 'connected') {
        this.setStatus('disconnected')
      }
    }
  }

  handleChunk(chunk) {
    const bytes = cloneBytes(chunk)

    if (this.options.emitRawChunks) {
      this.emitter.emit('raw', {
        bytes,
        receivedAt: Date.now()
      })
    }

    const packets = this.parser.feedChunk(bytes)

    for (const packet of packets) {
      this.lastPacket = packet
      this.emitter.emit('packet', packet)

      const parsed = parsePacketResults(packet)

      if (parsed.classifications.length > 0) {
        const event = {
          results: parsed.classifications,
          packet,
          receivedAt: packet.receivedAt
        }
        this.emitter.emit('classifications', event)
        for (const result of parsed.classifications) {
          this.emitter.emit('classification', {
            ...result,
            packet,
            receivedAt: packet.receivedAt
          })
        }
      }

      if (parsed.detections.length > 0) {
        const event = {
          results: parsed.detections,
          packet,
          receivedAt: packet.receivedAt
        }
        this.emitter.emit('detections', event)
        for (const result of parsed.detections) {
          this.emitter.emit('detection', {
            ...result,
            packet,
            receivedAt: packet.receivedAt
          })
        }
      }
    }
  }

  setStatus(status) {
    this.status = status
    this.emitter.emit('status', {
      status,
      isConnected: this.isConnected(),
      receivedAt: Date.now()
    })
  }

  emitError(code, message, cause) {
    this.emitter.emit('error', {
      code,
      message,
      cause,
      receivedAt: Date.now()
    })
  }

  releaseReader(reader) {
    if (!reader) return

    try {
      reader.releaseLock()
    } catch {
      // Ignore if the stream lock has already been released.
    }
  }
}

