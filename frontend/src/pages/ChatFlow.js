/**
 * 💬 ChatFlow - 대화형 영상 검색 플로우
 * 
 * 4단계 플로우:
 * 1. 방식 선택 (감정/주제) - 2개 카드, 입력창 없음
 * 2. 세부 선택 (감정 또는 주제) - 4개 카드, 입력창 있음
 * 3. 키워드 추천 - LLM 감성 분석 결과 - 4개 카드, 입력창 있음
 * 4. 최종 확인 - 2개 카드, 입력창 있음
 */

import { Component } from '../core/Component.js'
import Header from '../components/layout/Header/index.js'
import SelectableCard from '../components/ui/Card/index.js'
import Input from '../components/ui/Input/index.js'
import { llmService } from '../services/llmService.js'
import searchService from '../services/searchService.js'
// navigateTo는 App 인스턴스에서 사용: window.app.navigateTo()
import '../styles/llm.css'
import './ChatFlow.css'

export default class ChatFlow extends Component {
  constructor() {
    super({ tagName: 'div' })
    
    // 컴포넌트 인스턴스들 먼저 초기화 (안전장치)
    this.header = null
    this.cards = []
    this.input = null
    
    // 🧠 LLM 분석 결과 저장
    this.llmAnalysisResult = null
    this.isAnalyzing = false
    
    // 🔍 영상 검색 상태 관리
    this.isSearching = false
    
    // 기본값 강제 설정 (안전장치)
    this.currentStep = 1
    
    // URL에 따른 초기 스텝 결정
    const hash = window.location.hash || '#/chat-support'
    
    console.log('🔧 ChatFlow constructor - hash:', hash)
    
    // 간단하고 확실한 스텝 결정
    let initialStep = 1
    try {
      if (hash.includes('mood-select') || hash.includes('topic-select')) {
        initialStep = 2
      } else if (hash.includes('keyword-recommend')) {
        initialStep = 3
      } else if (hash.includes('video-confirm')) {
        initialStep = 4
      }
    } catch (error) {
      console.warn('⚠️ Error determining initial step, using default:', error)
      initialStep = 1
    }
    
    // currentStep 강제 설정 (숫자로 확실히)
    this.currentStep = Number(initialStep)
    
    // 최종 안전장치
    if (!Number.isInteger(this.currentStep) || this.currentStep < 1 || this.currentStep > 4) {
      console.error('❌ Invalid currentStep detected, forcing to 1:', this.currentStep)
      this.currentStep = 1
    }
    
    console.log('🔧 ChatFlow constructor - currentStep finally set to:', this.currentStep, typeof this.currentStep)
    
    // URL 파라미터에서 기존 데이터 복원
    let urlParams
    try {
      const hashParts = window.location.hash.split('?')
      const queryString = hashParts[1] || ''
      urlParams = new URLSearchParams(queryString)
    } catch (error) {
      console.warn('⚠️ Error parsing URL params:', error)
      urlParams = new URLSearchParams()
    }
    
    // chatData 안전하게 초기화
    this.chatData = {
      type: urlParams.get('type') || null,           // 'mood' | 'topic'
      selection: urlParams.get('selection') || null,      // 선택된 감정/주제
      userInput: urlParams.get('userInput') || null,      // 사용자 입력
      keyword: urlParams.get('keyword') || null,        // 선택된 키워드
      keywordInput: urlParams.get('keywordInput') || null,   // 키워드 사용자 입력
      finalAction: null     // 최종 액션
    }
    
    console.log('🔧 ChatFlow initialized:', { 
      currentStep: this.currentStep, 
      currentStepType: typeof this.currentStep,
      chatData: this.chatData,
      hash,
      urlParams: Object.fromEntries(urlParams.entries()),
      cardsInitialized: Array.isArray(this.cards)
    })
  }
  
  render() {
    this.el.className = 'chat-flow-page'
    this.el.innerHTML = `
      <div class="chat-flow-container">
        <div class="chat-flow-header" id="header-container"></div>
        <div class="chat-flow-content" id="content-container"></div>
        <div class="chat-flow-input" id="input-container" style="display: none;"></div>
      </div>
    `
    
    this.renderStep()
    return this
  }
  
  /**
   * 현재 스텝 렌더링
   */
  renderStep() {
    console.log('🔄 renderStep called with currentStep:', this.currentStep)
    
    // currentStep 최종 안전장치
    if (typeof this.currentStep !== 'number' || this.currentStep < 1 || this.currentStep > 4) {
      console.error('❌ Critical: currentStep is invalid in renderStep:', this.currentStep)
      this.currentStep = 1
    }
    
    this.renderHeader()
    this.renderContent()
    this.renderInput()
  }
  
  /**
   * 헤더 렌더링
   */
  renderHeader() {
    const headerContainer = this.el.querySelector('#header-container')
    const headerData = this.getHeaderData()
    
    // 기존 헤더 제거
    if (this.header) {
      this.header.destroy()
    }
    
    // 새로운 헤더 생성
    this.header = new Header({
      variant: headerData.variant,
      greeting: headerData.greeting,
      title: headerData.title,
      subtitle: headerData.subtitle
    })
    
    headerContainer.innerHTML = ''
    headerContainer.appendChild(this.header.el)
    this.header.render()
  }
  
  /**
   * 컨텐츠 렌더링
   */
  renderContent() {
    const contentContainer = this.el.querySelector('#content-container')
    
    // 🧠 Step 3에서 LLM 분석 중인 경우 로딩 표시
    if (this.currentStep === 3 && this.isAnalyzing) {
      this.renderAnalyzingState(contentContainer)
      return
    }
    
    const cardsData = this.getCardsData()
    
    // 카드 데이터 확인
    if (!Array.isArray(cardsData) || cardsData.length === 0) {
      console.error('❌ getCardsData() returned invalid data:', cardsData, 'currentStep:', this.currentStep)
      
      // 응급 처치: 기본 카드 데이터 생성
      const fallbackData = [
        {
          icon: '😊',
          title: '기분별로 찾기',
          description: '지금 느끼는 감정에 딱 맞는<br>영상을 추천해드려요',
          value: 'mood'
        },
        {
          icon: '📚',
          title: '주제별로 찾기',
          description: '관심있는 분야의 영상을<br>모아서 보여드려요',
          value: 'topic'
        }
      ]
      
      console.warn('⚠️ Using fallback card data')
      // 기본 데이터로 계속 진행
      this.renderCardsWithData(contentContainer, fallbackData)
      return
    }
    
    // 정상 데이터로 렌더링
    this.renderCardsWithData(contentContainer, cardsData)
  }
  
  /**
   * 🧠 LLM 분석 중 로딩 상태 렌더링
   */
  renderAnalyzingState(contentContainer) {
    contentContainer.innerHTML = `
      <div class="llm-analyzing">
        <div class="analyzing-spinner">
          <div class="spinner"></div>
        </div>
        <div class="analyzing-text">
          <h3>🧠 AI가 당신의 마음을 분석하고 있어요</h3>
          <p>개인화된 감성 문장을 생성하는 중...</p>
        </div>
      </div>
    `
  }
  
  /**
   * 카드 데이터로 실제 렌더링 수행
   */
  renderCardsWithData(contentContainer, cardsData) {
    console.log('🔧 renderCardsWithData called:', { 
      cardsData: cardsData?.length, 
      currentCards: this.cards?.length,
      cardsIsArray: Array.isArray(this.cards)
    })
    
    // this.cards 안전장치
    if (!Array.isArray(this.cards)) {
      console.warn('⚠️ this.cards is not an array, initializing:', this.cards)
      this.cards = []
    }
    
    // 기존 카드들 제거
    this.cards.forEach(card => {
      if (card && typeof card.destroy === 'function') {
        card.destroy()
      }
    })
    this.cards = []
    
    // 카드 컨테이너 생성
    contentContainer.innerHTML = `
      <div class="cards-grid cards-grid--step-${this.currentStep}"></div>
    `
    
    const cardsGrid = contentContainer.querySelector('.cards-grid')
    
    // 새로운 카드들 생성
    cardsData.forEach((cardData, index) => {
      const card = new SelectableCard({
        icon: cardData.icon,
        title: cardData.title,
        description: cardData.description,
        value: cardData.value,
        variant: 'glass',
        size: 'large',
        onClick: (event, cardInstance) => this.handleCardClick(cardData, cardInstance)
      })
      
      this.cards.push(card)
      cardsGrid.appendChild(card.el)
      card.render()
      
      // 🎭 모든 카드(첫 번째 포함)에 등장 애니메이션 적용
      // 초기 상태: 보이지 않음 (CSS에서 이미 opacity: 0으로 설정됨)
      card.el.classList.remove('card-animate-in')
      
      // 순차 등장 애니메이션 (모든 카드 동일 - 첫 번째도 포함)
      setTimeout(() => {
        if (card.el) {
          card.el.classList.add('card-animate-in')
        }
      }, index * 120 + 200) // 200ms 초기 딜레이 + 120ms 간격으로 순차 등장
    })
    
    // 그리드 등장 애니메이션
    cardsGrid.classList.remove('transitioning-out')
    cardsGrid.classList.add('transitioning-in')
  }
  
  /**
   * 입력창 렌더링
   */
  renderInput() {
    const inputContainer = this.el.querySelector('#input-container')
    
    if (this.currentStep === 1 || this.currentStep === 4) {
      // Step 1과 Step 4는 입력창 없음
      inputContainer.style.display = 'none'
      return
    }
    
    // 기존 입력창 제거
    if (this.input) {
      this.input.destroy()
    }
    
    // 새로운 입력창 생성
    const inputData = this.getInputData()
    this.input = new Input({
      variant: 'chat',
      placeholder: inputData.placeholder,
      onSend: (value) => this.handleInputSend(value),
      onChange: (value) => this.handleInputChange(value)
    })
    
    inputContainer.innerHTML = ''
    inputContainer.appendChild(this.input.el)
    this.input.render()
    inputContainer.style.display = 'block'
  }
  
  /**
   * 헤더 데이터 가져오기
   */
  getHeaderData() {
    // currentStep 유효성 재확인
    if (typeof this.currentStep !== 'number' || this.currentStep < 1 || this.currentStep > 4) {
      console.warn('⚠️ Invalid currentStep in getHeaderData:', this.currentStep, 'resetting to 1')
      this.currentStep = 1
    }
    
    switch (this.currentStep) {
      case 1:
        return {
          variant: 'chat',
          greeting: '안녕하세요!',
          title: '오늘은 어떤 방식으로<br>영상을 찾고 싶으신가요?',
          subtitle: '당신의 마음에 맞는 완벽한 영상을 찾아드릴게요'
        }
      
      case 2:
        // type이 null인 경우 기본 감정 선택으로 설정
        if (!this.chatData.type) {
          console.warn('⚠️ No type set in step 2, defaulting to mood')
          this.chatData.type = 'mood'
        }
        
        if (this.chatData.type === 'mood') {
          return {
            variant: 'mood',
            greeting: '오늘 기분, 어떤가요?',
            title: '오늘 하루에 대해<br>자유롭게 말해주세요',
            subtitle: '아래에서 느끼는 감정을 선택하시거나, 마음에 드는 표현으로 들려주세요'
          }
        } else {
          return {
            variant: 'topic',
            greeting: '어떤 주제가 궁금하신가요?',
            title: '관심있는 분야를<br>알려주세요',
            subtitle: '아래에서 관심 주제를 선택하시거나, 원하는 주제를 직접 말해주세요'
          }
        }
      
      case 3:
        return {
          variant: 'keyword',
          greeting: '🧠 AI가 추천하는<br>개인화된 감성 문장',
          title: '마음에 드는 문장을<br>선택해주세요',
          subtitle: '당신의 감정에 맞춰 AI가 생성한 특별한 문장들입니다'
        }
      
      case 4:
        return {
          variant: 'confirm',
          greeting: `'${this.chatData.keyword || this.chatData.keywordInput}'<br>관련 영상을 보여드릴까요?`,
          title: '준비된 영상들을<br>확인해보세요',
          subtitle: '아래에서 원하는 방식을 선택하시거나, 다른 요청을 말해주세요'
        }
      
      default:
        return { variant: 'default', greeting: '', title: '', subtitle: '' }
    }
  }
  
  /**
   * 카드 데이터 가져오기
   */
  getCardsData() {
    console.log('🔍 getCardsData called with currentStep:', this.currentStep)
    
    // currentStep이 undefined나 유효하지 않은 값인 경우 기본값 설정
    if (typeof this.currentStep !== 'number' || this.currentStep < 1 || this.currentStep > 4) {
      console.warn('⚠️ Invalid currentStep detected:', this.currentStep, 'resetting to 1')
      this.currentStep = 1
    }
    
    switch (this.currentStep) {
      case 1:
        return [
          {
            icon: '😊',
            title: '기분별로 찾기',
            description: '지금 느끼는 감정에 딱 맞는<br>영상을 추천해드려요',
            value: 'mood'
          },
          {
            icon: '📚',
            title: '주제별로 찾기',
            description: '관심있는 분야의 영상을<br>모아서 보여드려요',
            value: 'topic'
          }
        ]
      
      case 2:
        // type이 null인 경우 기본 감정 선택으로 설정
        if (!this.chatData.type) {
          console.warn('⚠️ No type set in step 2, defaulting to mood')
          this.chatData.type = 'mood'
        }
        
        if (this.chatData.type === 'mood') {
          return [
            {
              icon: '😊',
              title: '기분이 꽤 좋아요',
              description: '왠지 좋은 일이 생길 것 같은 하루',
              value: '기분이 꽤 좋은'
            },
            {
              icon: '😴',
              title: '아무것도 하기 싫은 하루네요',
              description: '조금은 쉬어가고 싶은 기분',
              value: '아무것도 하기 싫은'
            },
            {
              icon: '✨',
              title: '왠지 좋은 일이 생길 것 같아요',
              description: '설레고 기대되는 하루',
              value: '왠지 좋은 일이 생길 것 같은'
            },
            {
              icon: '😌',
              title: '위로가 조금 필요한 날이에요',
              description: '마음을 달래고 싶은 기분',
              value: '위로가 조금 필요한'
            }
          ]
        } else {
          return [
            {
              icon: '✈️',
              title: '어디론가 훌쩍 떠나고 싶어요',
              description: '새로운 곳으로의 여행',
              value: '떠나고 싶은'
            },
            {
              icon: '🍽️',
              title: '음식을 맛있게 즐기고 싶어요',
              description: '맛있는 음식과 요리',
              value: '음식을 맛있게'
            },
            {
              icon: '🌱',
              title: '누군가의 하루를 가볍게 따라가보고 싶어요',
              description: '일상 브이로그와 라이프스타일',
              value: '하루를 가볍게'
            },
            {
              icon: '🎵',
              title: '신나는 음악과 함께 기분전환하고 싶어요',
              description: '음악과 댄스, 엔터테인먼트',
              value: '신나는 음악'
            }
          ]
        }
      
      case 3:
        // 🧠 LLM 분석 결과가 있으면 사용, 없으면 폴백
        return this.getLLMKeywordRecommendations()
      
      case 4:
        return [
          {
            icon: '🔍',
            title: '주제를 좀 더 세분화해보고 싶어요',
            description: '더 구체적인 키워드로 찾아보기',
            value: 'refine'
          },
          {
            icon: '▶️',
            title: '큐레이션된 영상을 보여주세요',
            description: '지금 바로 영상 시청하기',
            value: 'start'
          }
        ]
      
      default:
        console.warn('⚠️ Unknown currentStep in getCardsData:', this.currentStep)
        return []
    }
  }
  
  /**
   * 🧠 LLM 키워드 추천 가져오기
   */
  getLLMKeywordRecommendations() {
    // LLM 분석 결과가 있으면 사용
    if (this.llmAnalysisResult && this.llmAnalysisResult.success) {
      console.log('🧠 LLM 분석 결과 사용:', this.llmAnalysisResult)
      return llmService.transformToCardData(this.llmAnalysisResult)
    }
    
    // 폴백: 기존 하드코딩된 추천
    console.warn('⚠️ LLM 분석 결과 없음, 폴백 데이터 사용')
    return this.getKeywordRecommendations()
  }
  
  /**
   * 키워드 추천 가져오기 (폴백용)
   */
  getKeywordRecommendations() {
    const { type, selection } = this.chatData
    
    console.log('🔍 getKeywordRecommendations called:', { type, selection })
    
    if (type === 'mood') {
      if (selection?.includes('기분이 꽤 좋은') || selection?.includes('좋은 일이 생길')) {
        return [
          { icon: '✨', title: '기분 좋은 하루를 시작하는 영상', description: '추천 키워드', value: '기분 좋은 하루를 시작하는 영상' },
          { icon: '💫', title: '긍정 에너지 가득한 브이로그', description: '추천 키워드', value: '긍정 에너지 가득한 브이로그' },
          { icon: '😄', title: '웃음이 절로 나는 일상 영상', description: '추천 키워드', value: '웃음이 절로 나는 일상 영상' },
          { icon: '🌈', title: '행복한 순간들을 담은 영상', description: '추천 키워드', value: '행복한 순간들을 담은 영상' }
        ]
      } else {
        return [
          { icon: '🌙', title: '마음이 편해지는 힐링 영상', description: '추천 키워드', value: '마음이 편해지는 힐링 영상' },
          { icon: '☁️', title: '조용히 위로받는 시간', description: '추천 키워드', value: '조용히 위로받는 시간' },
          { icon: '🕯️', title: '혼자만의 소중한 휴식', description: '추천 키워드', value: '혼자만의 소중한 휴식' },
          { icon: '🌿', title: '천천히 쉬어가는 브이로그', description: '추천 키워드', value: '천천히 쉬어가는 브이로그' }
        ]
      }
    } else {
      if (selection?.includes('떠나고 싶은')) {
        return [
          { icon: '🏯', title: '일본 소도시 여행 브이로그', description: '추천 키워드', value: '일본 소도시 여행 브이로그' },
          { icon: '🗺️', title: '짧은 국내 여행 추천', description: '추천 키워드', value: '짧은 국내 여행 추천' },
          { icon: '🚶', title: '하루 여행 브이로그', description: '추천 키워드', value: '하루 여행 브이로그' },
          { icon: '💰', title: '가성비 여행 브이로그', description: '추천 키워드', value: '가성비 여행 브이로그' }
        ]
      } else if (selection?.includes('음식을 맛있게')) {
        return [
          { icon: '🍜', title: '혼밥 맛집 브이로그', description: '추천 키워드', value: '혼밥 맛집 브이로그' },
          { icon: '👩‍🍳', title: '집에서 만드는 간단 요리', description: '추천 키워드', value: '집에서 만드는 간단 요리' },
          { icon: '😋', title: '맛있게 먹는 일상', description: '추천 키워드', value: '맛있게 먹는 일상' },
          { icon: '🏠', title: '따뜻한 홈쿡 영상', description: '추천 키워드', value: '따뜻한 홈쿡 영상' }
        ]
      } else {
        return [
          { icon: '📱', title: '소소한 일상 브이로그', description: '추천 키워드', value: '소소한 일상 브이로그' },
          { icon: '☀️', title: '평범한 하루의 특별함', description: '추천 키워드', value: '평범한 하루의 특별함' },
          { icon: '👥', title: '누군가의 소중한 일상', description: '추천 키워드', value: '누군가의 소중한 일상' },
          { icon: '🔄', title: '잔잔한 데일리 루틴', description: '추천 키워드', value: '잔잔한 데일리 루틴' }
        ]
      }
    }
    
    // 기본값 반환 (예상치 못한 케이스)
    console.warn('⚠️ No matching case in getKeywordRecommendations:', { type, selection })
    return [
      { icon: '🎯', title: '추천 키워드 1', description: '기본 추천', value: '기본 키워드 1' },
      { icon: '✨', title: '추천 키워드 2', description: '기본 추천', value: '기본 키워드 2' },
      { icon: '🌟', title: '추천 키워드 3', description: '기본 추천', value: '기본 키워드 3' },
      { icon: '💫', title: '추천 키워드 4', description: '기본 추천', value: '기본 키워드 4' }
    ]
  }
  
  /**
   * 입력창 데이터 가져오기
   */
  getInputData() {
    switch (this.currentStep) {
      case 2:
        return {
          placeholder: this.chatData.type === 'mood' 
            ? '지금 이 순간의 기분을 들려주세요...'
            : '관심있는 주제나 분야를 알려주세요...'
        }
      case 3:
        return {
          placeholder: '원하는 키워드나 영상 주제를 알려주세요...'
        }
      case 4:
        return {
          placeholder: '다른 키워드나 요청사항을 알려주세요...'
        }
      default:
        return { placeholder: '' }
    }
  }
  
  /**
   * 카드 클릭 처리
   */
  handleCardClick(cardData, cardInstance) {
    console.log('🎯 Card clicked:', { step: this.currentStep, cardData })
    
    // 카드 클릭 애니메이션이 이미 Card 컴포넌트에서 처리됨
    // 선택 효과는 제거 - 바로 사라질 예정이므로 불필요
    // cardInstance.select()
    
    // 🎯 클릭 애니메이션 완료를 기다린 후 카드 사라짐 애니메이션 시작
    setTimeout(() => {
      this.playCardsExitAnimation(() => {
        this.proceedToNextStep(cardData)
      })
    }, 300) // 클릭 애니메이션(150ms) + 복원(150ms) + 여유시간 최소화
  }
  
  /**
   * 🌊 모든 카드가 사라지는 애니메이션 재생
   */
  playCardsExitAnimation(callback) {
    const cardsGrid = this.el.querySelector('.cards-grid')
    const cards = this.el.querySelectorAll('.cards-grid .card')
    
    if (!cardsGrid) {
      callback()
      return
    }
    
    // 모든 카드에 사라지는 애니메이션 클래스 추가 (역순으로)
    const cardArray = Array.from(cards)
    cardArray.reverse().forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('card-animate-out')
      }, index * 80) // 80ms 간격으로 역순 사라짐
    })
    
    // 그리드 자체도 사라지게 함
    setTimeout(() => {
      cardsGrid.classList.add('transitioning-out')
    }, cardArray.length * 80 + 150)
    
    // 모든 애니메이션 완료 후 콜백 실행
    setTimeout(() => {
      callback()
    }, cardArray.length * 80 + 450) // 여유 시간 포함
  }
  
  /**
   * 🚀 다음 단계로 실제 전환 처리
   */
  async proceedToNextStep(cardData) {
    switch (this.currentStep) {
      case 1:
        this.chatData.type = cardData.value
        this.nextStep()
        break
        
      case 2:
        this.chatData.selection = cardData.value
        this.chatData.userInput = null // 카드 선택 시 입력 초기화
        if (this.input) this.input.clear()
        
        // 🧠 2단계에서 3단계로 넘어갈 때 LLM 분석 실행
        await this.performLLMAnalysis()
        this.nextStep()
        break
        
      case 3:
        this.chatData.keyword = cardData.value
        this.chatData.keywordInput = null // 카드 선택 시 입력 초기화
        if (this.input) this.input.clear()
        
        // 🎯 감성 문장 클릭 추적
        if (cardData.curationId) {
          await this.trackCurationClick(cardData)
        }
        
        this.nextStep()
        break
        
      case 4:
        this.chatData.finalAction = cardData.value
        this.chatData.finalInput = null // 카드 선택 시 입력 초기화
        if (this.input) this.input.clear()
        this.handleFinalAction()
        break
    }
  }
  
  /**
   * 🧠 LLM 감성 분석 수행
   */
  async performLLMAnalysis() {
    console.log('🧠 LLM 감성 분석 시작:', this.chatData)
    
    // 분석할 텍스트 준비
    const userText = this.chatData.userInput || this.chatData.selection || ''
    if (!userText) {
      console.warn('⚠️ 분석할 텍스트가 없음')
      return
    }
    
    // 🔧 분석 옵션 설정 (백엔드 호환성: 'mood' → 'emotion' 변환)
    const backendInputType = this.chatData.type === 'mood' ? 'emotion' : this.chatData.type
    const analysisOptions = {
      inputType: backendInputType, // 'emotion' | 'topic'
      maxKeywords: 8,
      responseFormat: 'full'
    }
    
    try {
      // 분석 중 상태 표시
      this.isAnalyzing = true
      
      // LLM 분석 실행
      const result = await llmService.analyzeEmotionalCuration(userText, analysisOptions)
      
      console.log('🧠 LLM 분석 결과:', result)
      
      // 결과 저장
      this.llmAnalysisResult = result
      
    } catch (error) {
      console.error('❌ LLM 분석 실패:', error)
      this.llmAnalysisResult = null
    } finally {
      this.isAnalyzing = false
    }
  }
  
  /**
   * 🎯 감성 문장 클릭 추적
   */
  async trackCurationClick(cardData) {
    try {
      console.log('🎯 감성 문장 클릭 추적:', cardData)
      
      const result = await llmService.trackCurationClick(
        cardData.curationId,
        null, // userId - 익명 사용자
        cardData.clickData
      )
      
      if (result.success) {
        console.log('✅ 클릭 추적 성공:', result.message)
      } else {
        console.warn('⚠️ 클릭 추적 실패:', result.error)
      }
      
    } catch (error) {
      console.error('❌ 클릭 추적 오류:', error)
    }
  }
  
  /**
   * 입력 전송 처리
   */
  async handleInputSend(value) {
    switch (this.currentStep) {
      case 2:
        this.chatData.userInput = value
        this.chatData.selection = null // 입력 시 카드 선택 초기화
        this.clearCardSelections()
        
        // 🧠 2단계에서 3단계로 넘어갈 때 LLM 분석 실행
        await this.performLLMAnalysis()
        this.nextStep()
        break
        
      case 3:
        this.chatData.keywordInput = value
        this.chatData.keyword = null // 입력 시 카드 선택 초기화
        this.clearCardSelections()
        this.nextStep()
        break
        
      case 4:
        this.chatData.finalInput = value
        this.chatData.finalAction = null // 입력 시 카드 선택 초기화
        this.clearCardSelections()
        this.handleFinalAction()
        break
    }
  }
  
  /**
   * 입력 변경 처리
   */
  handleInputChange(value) {
    if (value.trim()) {
      this.clearCardSelections()
    }
  }
  
  /**
   * 카드 선택 초기화
   */
  clearCardSelections() {
    if (!Array.isArray(this.cards)) {
      console.warn('⚠️ this.cards is not an array in clearCardSelections:', this.cards)
      this.cards = []
      return
    }
    
    this.cards.forEach(card => {
      if (card && typeof card.deselect === 'function') {
        card.deselect()
      }
    })
  }
  
  /**
   * 다음 단계로 이동
   */
  nextStep() {
    if (this.currentStep < 4) {
      this.currentStep++
      this.animateStepTransition()
    } else {
      this.handleFinalAction()
    }
  }
  
  /**
   * 이전 단계로 이동
   */
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--
      this.animateStepTransition(true)
    }
  }
  
  /**
   * 단계 전환 (애니메이션 제거됨)
   */
  animateStepTransition(backward = false) {
    // 애니메이션 없이 즉시 렌더링
    this.renderStep()
  }
  
  /**
   * 최종 액션 처리
   */
  async handleFinalAction() {
    const { finalAction, finalInput } = this.chatData
    
    if (finalAction === 'refine' || finalInput?.includes('다시') || finalInput?.includes('바꿔')) {
      // 키워드 단계로 돌아가기
      this.currentStep = 3
      this.animateStepTransition(true)
    } else if (finalAction === 'start' || finalInput?.includes('보여') || finalInput?.includes('시작')) {
      // 🔍 실제 영상 검색 실행
      await this.executeVideoSearch()
    } else if (finalInput) {
      // 새로운 키워드로 다시 검색
      this.chatData.keywordInput = finalInput
      this.currentStep = 3
      this.animateStepTransition(true)
    }
  }
  
  /**
   * 🔍 영상 검색 실행
   */
  async executeVideoSearch() {
    // 🎯 description에서 실제 키워드 추출
    const selectedCardData = this.getSelectedCardData()
    const actualKeyword = this.extractKeywordFromDescription(selectedCardData)
    
    try {
      // 검색 중 상태 표시
      this.isSearching = true
      this.showSearchingState()
      
      console.log('🔍 영상 검색 시작:', actualKeyword)
      console.log('📋 원본 선택 데이터:', selectedCardData)
      console.log('🚂 Railway 서버로 realtime API 호출 시작...')
      
      // 키워드에서 카테고리 자동 추출
      const category = searchService.extractCategory(actualKeyword)
      
      // 🎯 검색 파라미터는 keyword만 전달 (다른 파라미터 건들지 않음)
      const searchOptions = {
        category: category  // 카테고리 추가로 더 정확한 검색
      }
      
      // ⏱️ 실시간 검색 실행 (완료까지 대기 - 최대 120초)
      console.log('🚀 realtime 검색 시작... 완료까지 대기 중 (최대 120초)')
      const searchStartTime = Date.now()
      
      const searchResult = await searchService.searchRealtime(actualKeyword, searchOptions)
      
      const searchEndTime = Date.now()
      const actualDuration = Math.round((searchEndTime - searchStartTime) / 1000)
      
      if (searchResult.success) {
        console.log('✅ realtime 검색 완료:', searchResult)
        console.log(`⏱️ 실제 검색 시간: ${actualDuration}초`)
        console.log(`📊 백엔드 처리 시간: ${searchResult.duration}초`)
        
        // 성공 메시지 표시 (실제 처리 시간 표시)
        this.showSearchSuccess(actualKeyword, actualDuration, searchResult.duration)
        
        // 🎯 realtime 검색이 완료되었으므로 VideoPlayer로 이동
        // 성공 메시지를 잠깐 보여준 후 이동
        setTimeout(() => {
          console.log(`🎬 VideoPlayer로 이동: "${actualKeyword}" (realtime 검색 완료됨)`)
          this.navigateToVideoPlayer(actualKeyword)
        }, 2000)  // 2초 후 이동 (성공 메시지 확인 시간)
        
      } else {
        console.error('❌ realtime 검색 실패:', searchResult.error)
        this.showSearchError(searchResult.error)
      }
      
    } catch (error) {
      console.error('❌ realtime 검색 오류:', error)
      this.showSearchError('네트워크 오류가 발생했습니다: ' + error.message)
    } finally {
      this.isSearching = false
    }
  }
  
  /**
   * 🎯 선택된 카드 데이터 가져오기
   * @returns {Object} 선택된 카드 데이터
   */
  getSelectedCardData() {
    // chatData에서 선택된 키워드 정보 가져오기
    const keyword = this.chatData.keyword || this.chatData.keywordInput || '선택된 키워드'
    
    // 현재 3단계에서 생성된 카드들에서 선택된 것 찾기
    const cardsData = this.getLLMKeywordRecommendations()
    const selectedCard = cardsData.find(card => card.value === keyword)
    
    if (selectedCard) {
      console.log('🎯 선택된 카드 데이터 발견:', selectedCard)
      return selectedCard
    }
    
    // 폴백: 기본 데이터 생성
    console.warn('⚠️ 선택된 카드 데이터를 찾을 수 없음, 폴백 데이터 사용')
    return {
      description: `추천 키워드: ${keyword}`,
      keywords: [keyword],
      value: keyword
    }
  }
  
  /**
   * 🔧 description에서 키워드 추출
   * @param {Object} cardData - 선택된 카드 데이터
   * @returns {string} 추출된 첫 번째 키워드
   */
  extractKeywordFromDescription(cardData) {
    if (!cardData) {
      console.warn('⚠️ cardData가 없음, 기본 키워드 반환')
      return '일반'
    }

    // 1순위: keywords 배열이 있으면 첫 번째 사용
    if (cardData.keywords && Array.isArray(cardData.keywords) && cardData.keywords.length > 0) {
      const firstKeyword = cardData.keywords[0]
      console.log(`🎯 keywords 배열에서 첫 번째 키워드 추출: "${firstKeyword}"`)
      return firstKeyword
    }

    // 2순위: description에서 "추천 키워드: xxx, yyy" 패턴 파싱
    if (cardData.description && cardData.description.includes('추천 키워드:')) {
      const keywordPart = cardData.description.split('추천 키워드:')[1]
      if (keywordPart) {
        const keywords = keywordPart
          .trim()
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0)
        
        if (keywords.length > 0) {
          const firstKeyword = keywords[0]
          console.log(`🎯 description에서 키워드 추출: "${cardData.description}" → "${firstKeyword}"`)
          return firstKeyword
        }
      }
    }

    // 3순위: value에서 키워드 추출 (기존 로직)
    if (cardData.value) {
      const simplified = this.simplifyKeyword(cardData.value)
      console.log(`🎯 value에서 키워드 추출: "${cardData.value}" → "${simplified}"`)
      return simplified
    }

    // 최종 폴백
    console.warn(`⚠️ 키워드 추출 실패, 기본값 사용:`, cardData)
    return '일반'
  }
  
  /**
   * 🔧 긴 LLM 문장을 간단한 키워드로 요약
   * @param {string} keyword - 원본 키워드 (LLM 생성 문장일 수 있음)
   * @returns {string} 요약된 키워드
   */
  simplifyKeyword(keyword) {
    // LLM 생성 문장에서 핵심 키워드 추출
    const keywordMap = {
      // 감정 기반 매핑
      '지친': '휴식',
      '휴식': '휴식',
      '위로': '위로',
      '힐링': '힐링',
      '편안': '힐링',
      '평화': '힐링',
      '기분': '기분전환',
      '좋은': '긍정',
      '행복': '행복',
      '즐거운': '즐거움',
      '신나는': '신남',
      '웃긴': '웃긴',
      '재미': '재미',
      '먹방': '먹방',
      '요리': '요리',
      '음식': '음식',
      '여행': '여행',
      '브이로그': '브이로그',
      '일상': '일상',
      '운동': '운동',
      '댄스': '댄스',
      '음악': '음악',
      '게임': '게임',
      '공부': '공부',
      '뷰티': '뷰티',
      '패션': '패션'
    }

    // 키워드 매칭 시도
    for (const [pattern, simple] of Object.entries(keywordMap)) {
      if (keyword.includes(pattern)) {
        console.log(`🔧 키워드 간소화: "${keyword}" → "${simple}"`)
        return simple
      }
    }

    // 매칭되지 않으면 첫 번째 의미있는 단어 추출
    const words = keyword
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .filter(word => !['이', '그', '저', '의', '를', '을', '는', '은', '가', '에서', '으로', '에게'].includes(word))
    
    if (words.length > 0) {
      const extractedKeyword = words[0]
      console.log(`🔧 키워드 추출: "${keyword}" → "${extractedKeyword}"`)
      return extractedKeyword
    }

    // 최종 폴백
    console.log(`🔧 키워드 폴백: "${keyword}" → "힐링"`)
    return '힐링'
  }
  
  /**
   * 🔍 검색 중 상태 표시
   */
  showSearchingState() {
    const contentContainer = this.el.querySelector('#content-container')
    const keyword = this.chatData.keyword || this.chatData.keywordInput || '키워드'
    
    contentContainer.innerHTML = `
      <div class="llm-analyzing">
        <div class="analyzing-spinner">
        </div>
        <div class="analyzing-text">
          <h3>🔍 "${keyword}" 관련 영상을 찾고 있어요</h3>
          <p>🚀 YouTube에서 최고의 쇼츠 영상들을 큐레이션하는 중...</p>
          <div style="
            margin-top: 16px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.4;
          ">
            <div>📺 영상 검색 및 품질 필터링</div>
            <div>🏷️ AI 분류 및 태깅</div>
            <div>💾 데이터베이스 저장</div>
            <div style="margin-top: 8px; color: #ffeb3b;">⏱️ 약 30-60초 소요됩니다</div>
          </div>
        </div>
      </div>
    `
  }
  
  /**
   * ✅ 검색 성공 상태 표시
   */
  showSearchSuccess(keyword, actualDuration, backendDuration) {
    const contentContainer = this.el.querySelector('#content-container')
    
    contentContainer.innerHTML = `
      <div class="llm-analyzing">
        <div style="
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          margin-bottom: 16px;
        ">✅</div>
        <div class="analyzing-text">
          <h3>🎉 "${keyword}" 영상 큐레이션 완료!</h3>
          <p>총 처리 시간: ${actualDuration}초 • 백엔드 처리: ${backendDuration}초</p>
          <div style="
            margin-top: 12px;
            font-size: 14px;
            opacity: 0.9;
          ">곧 영상 페이지로 이동합니다...</div>
        </div>
      </div>
    `
  }
  
  /**
   * ❌ 검색 실패 상태 표시
   */
  showSearchError(errorMessage) {
    const contentContainer = this.el.querySelector('#content-container')
    
    contentContainer.innerHTML = `
      <div class="llm-analyzing">
        <div style="
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f44336, #d32f2f);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          margin-bottom: 16px;
        ">❌</div>
        <div class="analyzing-text">
          <h3>검색 중 문제가 발생했습니다</h3>
          <p>${errorMessage}</p>
        </div>
        <button onclick="location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          cursor: pointer;
        ">다시 시도</button>
      </div>
    `
  }
  
  /**
   * 🎬 VideoPlayer로 이동
   */
  navigateToVideoPlayer(keyword) {
    // realtime 검색 완료 플래그 추가
    const params = new URLSearchParams({
      keyword: keyword,
      realtime_completed: 'true',  // 🔧 realtime 검색 완료 표시
      timestamp: Date.now()        // 캐시 방지용 타임스탬프
    })
    
    const url = `#/video-player?${params.toString()}`
    console.log('🎬 VideoPlayer로 이동:', url)
    
    if (window.app && typeof window.app.navigateTo === 'function') {
      window.app.navigateTo(url)
    } else {
      // 폴백: 직접 URL 변경
      window.location.hash = url
    }
  }
  
  /**
   * 컴포넌트 정리
   */
  destroy() {
    try {
      if (this.header && typeof this.header.destroy === 'function') {
        this.header.destroy()
      }
      
      if (this.input && typeof this.input.destroy === 'function') {
        this.input.destroy()
      }
      
      if (Array.isArray(this.cards)) {
        this.cards.forEach(card => {
          if (card && typeof card.destroy === 'function') {
            card.destroy()
          }
        })
      }
      
      super.destroy()
    } catch (error) {
      console.error('❌ Error during ChatFlow destroy:', error)
    }
  }
} 