const formatTime = seconds => {
  if (!seconds || seconds < 0) return '00:00'

  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const throttle = (func, limit) => {
  let inThrottle
  return function () {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

const validateShortcut = shortcut => {
  if (!shortcut || typeof shortcut !== 'string') return false

  const parts = shortcut.toLowerCase().split('+')
  const validModifiers = ['ctrl', 'cmd', 'alt', 'shift', 'meta', 'super']
  const hasValidKey = parts.some(part => !validModifiers.includes(part.trim()) && part.trim().length > 0)

  return hasValidKey && parts.length >= 2
}

const sanitizeFileName = name => {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255)
}

const isValidEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const copyToClipboard = async text => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    return false
  }
}

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const isElectron = () => {
  return window.electronAPI !== undefined
}

const getPlatform = () => {
  if (!isElectron()) return 'web'
  return window.electronAPI.platform
}

const isMac = () => {
  return getPlatform() === 'darwin'
}

const isWindows = () => {
  return getPlatform() === 'win32'
}

const isLinux = () => {
  return getPlatform() === 'linux'
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatTime,
    formatFileSize,
    debounce,
    throttle,
    validateShortcut,
    sanitizeFileName,
    isValidEmail,
    generateId,
    copyToClipboard,
    sleep,
    isElectron,
    getPlatform,
    isMac,
    isWindows,
    isLinux
  }
} else {
  window.StreamSnapUtils = {
    formatTime,
    formatFileSize,
    debounce,
    throttle,
    validateShortcut,
    sanitizeFileName,
    isValidEmail,
    generateId,
    copyToClipboard,
    sleep,
    isElectron,
    getPlatform,
    isMac,
    isWindows,
    isLinux
  }
}
