/**
 * 📝 Logger - 로깅 시스템
 */

export class Logger {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }
  
  static debug(message, data) {
    if (window.location.hostname === 'localhost') {
      console.log(`🔍 ${message}`, data || '')
    }
  }
  
  static info(message, data) {
    console.log(`ℹ️ ${message}`, data || '')
  }
  
  static warn(message, data) {
    console.warn(`⚠️ ${message}`, data || '')
  }
  
  static error(message, error) {
    console.error(`❌ ${message}`, error || '')
  }
}

export default Logger 