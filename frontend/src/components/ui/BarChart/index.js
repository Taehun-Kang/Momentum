import './BarChart.css'

export default class BarChart {
  constructor(container, options = {}) {
    this.container = container
    this.data = options.data || []
    this.labels = options.labels || ['월', '화', '수', '목', '금', '토', '일']
    this.maxHeight = options.maxHeight || 150
    this.showTooltip = options.showTooltip !== false
    this.onBarClick = options.onBarClick || null
    this.tooltipTimer = null
    
    this.init()
  }
  
  init() {
    this.render()
    this.bindEvents()
  }
  
  render() {
    const maxValue = Math.max(...this.data)
    // 컨테이너에서 여유공간을 고려한 실제 차트 높이 계산
    const availableHeight = this.maxHeight - 20 // 하단 라벨 공간만 고려
    
    this.container.innerHTML = `
      <div class="bar-chart" style="height: ${this.maxHeight + 30}px; padding-top: 5px;">
        ${this.data.map((value, index) => {
          // 가장 높은 차트는 항상 고정 높이 (15-100% 범위)
          const ratio = value / maxValue
          const minHeightRatio = 0.15 // 최소 15%
          const heightRatio = minHeightRatio + (ratio * (1 - minHeightRatio))
          const heightPx = Math.floor(heightRatio * availableHeight)
          
          return `
            <div class="chart-column">
              <div class="chart-bar" 
                   data-value="${value}" 
                   data-label="${this.labels[index]}"
                   style="height: ${heightPx}px"
                   title="${this.labels[index]}: ${value}분">
              </div>
              <div class="chart-label">${this.labels[index]}</div>
            </div>
          `
        }).join('')}
      </div>
    `
  }
  
  bindEvents() {
    const bars = this.container.querySelectorAll('.chart-bar')
    bars.forEach(bar => {
      bar.addEventListener('click', (e) => {
        if (this.showTooltip) {
          this.showTooltipForBar(e.target)
          // 클릭 시 3초 후 툴팁 자동 숨김
          this.tooltipTimer = setTimeout(() => {
            this.hideTooltip(e.target)
          }, 3000)
        }
        this.showBarInfo(e.target)
      })
      
      // 툴팁이 활성화된 경우에만 호버 이벤트 추가
      if (this.showTooltip) {
        bar.addEventListener('mouseenter', (e) => {
          this.showTooltipForBar(e.target)
        })
        
        bar.addEventListener('mouseleave', (e) => {
          this.hideTooltip(e.target)
        })
      }
    })
  }
  
  showTooltipForBar(bar) {
    // 기존 툴팁 제거
    this.hideTooltip(bar)
    
    // 기존 타이머 취소
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer)
      this.tooltipTimer = null
    }
    
    const value = bar.dataset.value
    const label = bar.dataset.label
    
    // 상단 정보 숨기기
    this.hideChartInfo()
    
    const tooltip = document.createElement('div')
    tooltip.className = 'chart-tooltip'
    tooltip.textContent = `${value}분`
    
    bar.appendChild(tooltip)
    
    // 애니메이션을 위해 다음 프레임에서 클래스 추가
    requestAnimationFrame(() => {
      tooltip.classList.add('visible')
    })
  }
  
  hideTooltip(bar) {
    const existingTooltip = bar.querySelector('.chart-tooltip')
    if (existingTooltip) {
      existingTooltip.remove()
      // 툴팁이 사라질 때 상단 정보 다시 표시
      this.showChartInfo()
    }
    
    // 타이머 정리
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer)
      this.tooltipTimer = null
    }
  }

  hideChartInfo() {
    // 차트 컨테이너의 부모에서 chart-info 찾기 (테스트 페이지와 MyPage 모두 대응)
    const chartInfo = this.container.closest('.test-section')?.querySelector('.chart-info') 
                   || this.container.closest('.mypage-section')?.querySelector('.chart-info')
                   || this.container.parentElement?.querySelector('.chart-info')
                   
    if (chartInfo) {
      chartInfo.style.transition = 'opacity 0.2s ease'
      chartInfo.style.opacity = '0'
    }
  }
  
  showChartInfo() {
    // 차트 컨테이너의 부모에서 chart-info 찾기 (테스트 페이지와 MyPage 모두 대응)
    const chartInfo = this.container.closest('.test-section')?.querySelector('.chart-info') 
                   || this.container.closest('.mypage-section')?.querySelector('.chart-info')
                   || this.container.parentElement?.querySelector('.chart-info')
                   
    if (chartInfo) {
      chartInfo.style.transition = 'opacity 0.2s ease'
      chartInfo.style.opacity = '1'
    }
  }

  showBarInfo(bar) {
    const value = bar.dataset.value
    const label = bar.dataset.label
    
    // 외부 콜백 함수가 있으면 호출 (상단 정보 변경용)
    if (this.onBarClick) {
      this.onBarClick(label, value)
    }
    
    // 차트 바에 클릭 효과 추가
    bar.style.transform = 'scaleY(1.1) scaleX(1.2)'
    bar.style.filter = 'brightness(1.2)'
    
    setTimeout(() => {
      bar.style.transform = ''
      bar.style.filter = ''
    }, 200)
  }
  
  // 데이터 업데이트 메서드
  updateData(newData) {
    this.data = newData
    this.render()
    this.bindEvents()
  }
  
  // 컴포넌트 정리
  destroy() {
    // 타이머 정리
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer)
      this.tooltipTimer = null
    }
    this.container.innerHTML = ''
  }
} 