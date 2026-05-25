import {
  formatBytesAsAscii,
  formatBytesAsHex
} from '@jikko/ai-camera/core'
import {
  createWebSerialCamera,
  isWebSerialSupported
} from '@jikko/ai-camera/web'
import './styles.css'

const MAX_LOG_ITEMS = 30

const elements = {
  connectButton: document.querySelector('#connectButton'),
  disconnectButton: document.querySelector('#disconnectButton'),
  baudRateInput: document.querySelector('#baudRateInput'),
  rawToggle: document.querySelector('#rawToggle'),
  statusValue: document.querySelector('#statusValue'),
  classIdValue: document.querySelector('#classIdValue'),
  scoreValue: document.querySelector('#scoreValue'),
  commandValue: document.querySelector('#commandValue'),
  classificationList: document.querySelector('#classificationList'),
  detectionList: document.querySelector('#detectionList'),
  packetList: document.querySelector('#packetList'),
  clearClassificationButton: document.querySelector('#clearClassificationButton'),
  clearDetectionButton: document.querySelector('#clearDetectionButton'),
  clearPacketButton: document.querySelector('#clearPacketButton')
}

let camera = null
let unsubscribers = []

function setStatus(status) {
  elements.statusValue.textContent = status
  elements.connectButton.disabled = status === 'connecting' || status === 'connected'
  elements.disconnectButton.disabled = status !== 'connected'
}

function addLogItem(listElement, title, detail) {
  const item = document.createElement('li')
  const time = new Date().toLocaleTimeString('ko-KR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  item.innerHTML = `
    <span class="log-title">${title}</span>
    <code>${detail}</code>
    <time>${time}</time>
  `

  listElement.prepend(item)

  while (listElement.children.length > MAX_LOG_ITEMS) {
    listElement.lastElementChild.remove()
  }
}

function clearList(listElement) {
  listElement.replaceChildren()
}

function cleanupCameraListeners() {
  unsubscribers.forEach((unsubscribe) => unsubscribe())
  unsubscribers = []
}

function createCamera() {
  cleanupCameraListeners()

  camera = createWebSerialCamera({
    baudRate: Number(elements.baudRateInput.value) || 9600,
    emitRawChunks: elements.rawToggle.checked
  })

  unsubscribers = [
    camera.on('status', (event) => {
      setStatus(event.status)
    }),
    camera.on('error', (event) => {
      setStatus('error')
      addLogItem(elements.packetList, `error ${event.code}`, event.message)
    }),
    camera.on('classification', (event) => {
      elements.classIdValue.textContent = String(event.classId)
      elements.scoreValue.textContent = String(event.score)
      addLogItem(
        elements.classificationList,
        `classId ${event.classId}`,
        `score ${event.score}, type ${event.type}, index ${event.index}`
      )
    }),
    camera.on('detection', (event) => {
      addLogItem(
        elements.detectionList,
        `classId ${event.classId}`,
        `score ${event.score}, box (${event.centerX}, ${event.centerY}, ${event.width}, ${event.height})`
      )
    }),
    camera.on('packet', (packet) => {
      elements.commandValue.textContent = packet.command
      addLogItem(
        elements.packetList,
        packet.command,
        `len ${packet.length}, data ${formatBytesAsHex(packet.data) || '-'}`
      )
    }),
    camera.on('raw', (event) => {
      addLogItem(
        elements.packetList,
        `raw ${event.bytes.length} bytes`,
        `${formatBytesAsHex(event.bytes)} | ${formatBytesAsAscii(event.bytes)}`
      )
    })
  ]
}

async function connectCamera() {
  if (!isWebSerialSupported()) {
    setStatus('unsupported')
    addLogItem(
      elements.packetList,
      'unsupported',
      'Chrome 또는 Edge에서 HTTPS/localhost로 실행해야 합니다.'
    )
    return
  }

  try {
    createCamera()
    setStatus('connecting')
    await camera.connect()
  } catch (error) {
    setStatus('error')
    addLogItem(elements.packetList, 'connect failed', error.message)
  }
}

async function disconnectCamera() {
  if (!camera) return

  try {
    await camera.disconnect()
  } finally {
    cleanupCameraListeners()
    camera = null
    setStatus('disconnected')
  }
}

elements.connectButton.addEventListener('click', connectCamera)
elements.disconnectButton.addEventListener('click', disconnectCamera)
elements.clearClassificationButton.addEventListener('click', () => clearList(elements.classificationList))
elements.clearDetectionButton.addEventListener('click', () => clearList(elements.detectionList))
elements.clearPacketButton.addEventListener('click', () => clearList(elements.packetList))

if (!isWebSerialSupported()) {
  setStatus('unsupported')
  addLogItem(
    elements.packetList,
    'unsupported',
    '이 브라우저는 Web Serial API를 지원하지 않습니다.'
  )
}
