/**
 * 📡 EventEmitter - 이벤트 시스템
 * 
 * 기능:
 * - 이벤트 발생/구독
 * - 한 번만 실행 (once)
 * - 이벤트 제거
 * - 와일드카드 지원
 * - 에러 핸들링
 */

export class EventEmitter {
  constructor() {
    this.events = new Map()
    this.maxListeners = 10 // 메모리 누수 방지
  }
  
  /**
   * 이벤트 리스너 추가
   * @param {string} event 이벤트 이름
   * @param {function} listener 리스너 함수
   * @param {object} options 옵션 { once: boolean, prepend: boolean }
   */
  on(event, listener, options = {}) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function')
    }
    
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    
    const listeners = this.events.get(event)
    
    // 최대 리스너 수 체크
    if (listeners.length >= this.maxListeners) {
      console.warn(`⚠️  Possible EventEmitter memory leak detected. ${listeners.length + 1} listeners added for event "${event}". Use setMaxListeners() to increase limit.`)
    }
    
    const listenerWrapper = {
      listener,
      once: options.once || false,
      prepend: options.prepend || false
    }
    
    if (options.prepend) {
      listeners.unshift(listenerWrapper)
    } else {
      listeners.push(listenerWrapper)
    }
    
    return this
  }
  
  /**
   * 한 번만 실행되는 이벤트 리스너 추가
   * @param {string} event 이벤트 이름
   * @param {function} listener 리스너 함수
   */
  once(event, listener) {
    return this.on(event, listener, { once: true })
  }
  
  /**
   * 이벤트 리스너 앞쪽에 추가
   * @param {string} event 이벤트 이름
   * @param {function} listener 리스너 함수
   */
  prependListener(event, listener) {
    return this.on(event, listener, { prepend: true })
  }
  
  /**
   * 이벤트 발생
   * @param {string} event 이벤트 이름
   * @param {...any} args 전달할 인수들
   */
  emit(event, ...args) {
    const listeners = this.events.get(event)
    
    if (!listeners || listeners.length === 0) {
      // 'error' 이벤트인데 리스너가 없으면 에러 발생
      if (event === 'error') {
        const error = args[0] || new Error('Unhandled error event')
        throw error
      }
      return false
    }
    
    // 리스너 복사 (실행 중 수정 방지)
    const listenersToCall = [...listeners]
    
    // once 리스너들 미리 제거
    const onceListeners = listenersToCall.filter(wrapper => wrapper.once)
    onceListeners.forEach(wrapper => {
      this.off(event, wrapper.listener)
    })
    
    // 리스너 실행
    for (const wrapper of listenersToCall) {
      try {
        wrapper.listener.apply(this, args)
      } catch (error) {
        // 리스너 실행 중 에러는 다음 틱에서 에러 이벤트 발생
        setTimeout(() => {
          this.emit('error', error)
        }, 0)
      }
    }
    
    return true
  }
  
  /**
   * 이벤트 리스너 제거
   * @param {string} event 이벤트 이름
   * @param {function} listener 제거할 리스너 함수
   */
  off(event, listener) {
    const listeners = this.events.get(event)
    
    if (!listeners) {
      return this
    }
    
    if (!listener) {
      // 리스너가 지정되지 않으면 해당 이벤트의 모든 리스너 제거
      this.events.delete(event)
      return this
    }
    
    const index = listeners.findIndex(wrapper => wrapper.listener === listener)
    
    if (index !== -1) {
      listeners.splice(index, 1)
      
      // 리스너가 없으면 이벤트 맵에서 제거
      if (listeners.length === 0) {
        this.events.delete(event)
      }
    }
    
    return this
  }
  
  /**
   * removeListener의 별칭
   */
  removeListener(event, listener) {
    return this.off(event, listener)
  }
  
  /**
   * 모든 이벤트 리스너 제거
   * @param {string} event 특정 이벤트 (선택사항)
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
    
    return this
  }
  
  /**
   * 이벤트 리스너 목록 가져오기
   * @param {string} event 이벤트 이름
   */
  listeners(event) {
    const listeners = this.events.get(event)
    return listeners ? listeners.map(wrapper => wrapper.listener) : []
  }
  
  /**
   * 이벤트 리스너 수 가져오기
   * @param {string} event 이벤트 이름
   */
  listenerCount(event) {
    const listeners = this.events.get(event)
    return listeners ? listeners.length : 0
  }
  
  /**
   * 등록된 이벤트 이름들 가져오기
   */
  eventNames() {
    return Array.from(this.events.keys())
  }
  
  /**
   * 최대 리스너 수 설정
   * @param {number} n 최대 리스너 수
   */
  setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0 || isNaN(n)) {
      throw new TypeError('n must be a non-negative number')
    }
    
    this.maxListeners = n
    return this
  }
  
  /**
   * 최대 리스너 수 가져오기
   */
  getMaxListeners() {
    return this.maxListeners
  }
  
  /**
   * 와일드카드 이벤트 매칭
   * @param {string} pattern 패턴 (예: 'user:*', '*:login')
   * @param {string} event 이벤트 이름
   */
  static matchWildcard(pattern, event) {
    // 간단한 와일드카드 매칭 (* 지원)
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(event)
  }
  
  /**
   * 와일드카드 이벤트 발생
   * @param {string} pattern 와일드카드 패턴
   * @param {...any} args 전달할 인수들
   */
  emitWildcard(pattern, ...args) {
    let emitted = false
    
    for (const event of this.eventNames()) {
      if (EventEmitter.matchWildcard(pattern, event)) {
        this.emit(event, ...args)
        emitted = true
      }
    }
    
    return emitted
  }
  
  /**
   * Promise 기반 이벤트 대기
   * @param {string} event 대기할 이벤트
   * @param {number} timeout 타임아웃 (ms)
   */
  waitFor(event, timeout = 0) {
    return new Promise((resolve, reject) => {
      let timer = null
      
      const cleanup = () => {
        this.off(event, listener)
        if (timer) clearTimeout(timer)
      }
      
      const listener = (...args) => {
        cleanup()
        resolve(args.length === 1 ? args[0] : args)
      }
      
      this.once(event, listener)
      
      if (timeout > 0) {
        timer = setTimeout(() => {
          cleanup()
          reject(new Error(`Event '${event}' timeout after ${timeout}ms`))
        }, timeout)
      }
    })
  }
}

export default EventEmitter 