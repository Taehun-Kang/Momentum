/**
 * 💬 ChatFlow - 대화형 영상 검색 플로우
 * 
 * 4단계 플로우:
 * 1. 방식 선택 (감정/주제) - 2개 카드, 입력창 없음
 * 2. 세부 선택 (감정 또는 주제) - 4개 카드, 입력창 있음
 * 3. 키워드 추천 - 4개 카드, 입력창 있음
 * 4. 최종 확인 - 2개 카드, 입력창 있음
 */

import { Component } from '../core/Component.js'
import Header from '../components/layout/Header/index.js'
import SelectableCard from '../components/ui/Card/index.js'
import Input from '../components/ui/Input/index.js'
// navigateTo는 App 인스턴스에서 사용: window.app.navigateTo()
import './ChatFlow.css'

export default class ChatFlow extends Component {
  constructor() {
    super({ tagName: 'div' })
    
    // 컴포넌트 인스턴스들 먼저 초기화 (안전장치)
    this.header = null
    this.cards = []
    this.input = null
    
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
          greeting: '오늘의 영상 키워드,<br>추천드릴게요',
          title: '마음에 드는 키워드를<br>선택해주세요',
          subtitle: '아래에서 키워드를 선택하시거나, 원하는 키워드를 직접 말해주세요'
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
        return this.getKeywordRecommendations()
      
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
   * 키워드 추천 가져오기
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
  proceedToNextStep(cardData) {
    switch (this.currentStep) {
      case 1:
        this.chatData.type = cardData.value
        this.nextStep()
        break
        
      case 2:
        this.chatData.selection = cardData.value
        this.chatData.userInput = null // 카드 선택 시 입력 초기화
        if (this.input) this.input.clear()
        this.nextStep()
        break
        
      case 3:
        this.chatData.keyword = cardData.value
        this.chatData.keywordInput = null // 카드 선택 시 입력 초기화
        if (this.input) this.input.clear()
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
   * 입력 전송 처리
   */
  handleInputSend(value) {
    switch (this.currentStep) {
      case 2:
        this.chatData.userInput = value
        this.chatData.selection = null // 입력 시 카드 선택 초기화
        this.clearCardSelections()
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
  handleFinalAction() {
    const { finalAction, finalInput } = this.chatData
    
    if (finalAction === 'refine' || finalInput?.includes('다시') || finalInput?.includes('바꿔')) {
      // 키워드 단계로 돌아가기
      this.currentStep = 3
      this.animateStepTransition(true)
    } else if (finalAction === 'start' || finalInput?.includes('보여') || finalInput?.includes('시작')) {
      // 영상 플레이어로 이동
      const keyword = this.chatData.keyword || this.chatData.keywordInput || '선택된 키워드'
      window.app?.navigateTo(`#/video-player?keyword=${encodeURIComponent(keyword)}`)
    } else if (finalInput) {
      // 새로운 키워드로 다시 검색
      this.chatData.keywordInput = finalInput
      this.currentStep = 3
      this.animateStepTransition(true)
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