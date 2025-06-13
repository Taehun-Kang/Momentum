/**
 * 🚀 Main Entry Point
 * 
 * YouTube Shorts AI Curation Service SPA 진입점
 */

import App from './App.js'

// DOM이 로드된 후 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('🚀 Starting YouTube Shorts AI Curation App...')
    
    const root = document.getElementById('root')
    if (!root) {
      throw new Error('Root element not found')
    }
    
    // 앱 인스턴스 생성
    const app = new App()
    
    // 로딩 제거 및 앱 마운트
    root.innerHTML = ''
    root.appendChild(app.el)
    
    // 전역 접근 설정 (개발용)
    window.app = app
    
    console.log('✅ App initialized successfully')
    
  } catch (error) {
    console.error('❌ Failed to initialize app:', error)
    
    // 에러 UI 표시
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `
        <div class="app-error">
          <h2>앱 로드 실패</h2>
          <p>페이지를 새로고침하거나 브라우저 콘솔을 확인해주세요.</p>
          <p style="margin-top: 8px; font-size: 12px; color: #999;">
            ${error.message}
          </p>
        </div>
      `
    }
  }
}) 