/**
 * 🏷️ UserPreferenceKeywords - 사용자 선호 키워드 표시 컴포넌트
 * 
 * 기능:
 * - AI 분석으로 도출된 사용자 선호 키워드 표시
 * - 키워드 클릭 시 해당 키워드로 영상 검색 이동
 * - 읽기 전용 깔끔한 디스플레이
 */

import './UserPreferenceKeywords.css'

export default class UserPreferenceKeywords {
  constructor(container, options = {}) {
    this.container = container
    this.keywords = options.keywords || []
    this.onKeywordClick = options.onKeywordClick || null
    this.title = options.title || '🏷️ 나의 선호 키워드'
    
    this.init()
  }
  
  init() {
    this.render()
    this.bindEvents()
  }
  
  render() {
    this.container.innerHTML = `
      <div class="user-preference-keywords">
        <div class="preference-header">
          <div class="section-title">${this.title}</div>
        </div>
        <div class="preference-keywords-grid" id="preference-grid">
          <!-- 키워드들이 여기 동적 생성됨 -->
        </div>
        ${this.keywords.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">분석 중입니다</div>
            <div class="empty-subtitle">시청 패턴을 분석하여 선호 키워드를 찾고 있어요</div>
          </div>
        ` : ''}
      </div>
    `
    
    // 키워드 렌더링
    this.populateKeywords()
  }
  
  populateKeywords() {
    const grid = this.container.querySelector('#preference-grid')
    if (!grid) return
    
    // 기존 키워드 제거
    grid.innerHTML = ''
    
    // 키워드 순차 등장
    this.keywords.forEach((keyword, index) => {
      setTimeout(() => {
        const keywordBtn = document.createElement('button')
        keywordBtn.className = 'preference-keyword-btn'
        keywordBtn.dataset.keywordId = keyword.id
        keywordBtn.dataset.keyword = keyword.text
        keywordBtn.dataset.category = keyword.category
        
        keywordBtn.innerHTML = `
          <div class="keyword-content">
            <div class="keyword-text">${keyword.text}</div>
            <div class="keyword-category">${this.getCategoryLabel(keyword.category)}</div>
          </div>
        `
        
        grid.appendChild(keywordBtn)
        
        // 애니메이션 트리거
        requestAnimationFrame(() => {
          keywordBtn.classList.add('animate-in')
        })
      }, index * 100) // 100ms 간격으로 순차 등장
    })
  }
  
  getCategoryLabel(category) {
    const categoryLabels = {
      lifestyle: 'LIFESTYLE',
      travel: 'TRAVEL', 
      food: 'FOOD',
      music: 'MUSIC',
      art: 'ART',
      fitness: 'FITNESS',
      study: 'STUDY',
      hobby: 'HOBBY',
      tech: 'TECH',
      beauty: 'BEAUTY'
    }
    return categoryLabels[category] || 'GENERAL'
  }
  
  bindEvents() {
    const container = this.container
    
    // 키워드 클릭 (검색으로 이동)
    container.addEventListener('click', (e) => {
      const keywordBtn = e.target.closest('.preference-keyword-btn')
      
      if (keywordBtn) {
        this.handleKeywordClick(keywordBtn)
      }
    })
  }
  
  handleKeywordClick(keywordBtn) {
    const keywordId = keywordBtn.dataset.keywordId
    const keyword = keywordBtn.dataset.keyword
    const category = keywordBtn.dataset.category
    
    // 클릭 애니메이션
    keywordBtn.style.transform = 'scale(0.95)'
    setTimeout(() => {
      keywordBtn.style.transform = ''
    }, 150)
    
    // 콜백 실행 (키워드 검색으로 이동)
    if (this.onKeywordClick) {
      this.onKeywordClick({
        id: keywordId,
        text: keyword,
        category: category
      })
    }
    
    console.log('🔍 키워드 검색:', keyword)
  }
  
  // 키워드 데이터 새로고침 (AI 재분석 시 사용)
  refreshKeywords() {
    this.populateKeywords()
    console.log('🔄 선호 키워드 새로고침')
  }

  // 키워드 데이터 업데이트
  updateKeywords(newKeywords) {
    this.keywords = newKeywords || []
    this.render()
  }

  // 전체 키워드 목록 반환
  getAllKeywords() {
    return this.keywords
  }
  
  // 컴포넌트 정리
  destroy() {
    this.container.innerHTML = ''
  }
} 