-- =============================================================================
-- 📊 03_insert_keywords_data_v2.sql - KEYWORDS_FINAL_CLEAN.txt 236개 키워드 삽입 (V2)
-- =============================================================================
-- 
-- 🎯 목적: KEYWORDS_FINAL_CLEAN.txt 파일의 236개 키워드를 daily_keywords_v2 테이블에 삽입
-- 📋 매핑: 트렌드(10일) -> high, 인기(20일) -> medium, 에버그린(35일) -> low
-- 🔄 자동: sequence_number는 add_keyword_v2() 함수로 자동 할당됨
-- 📊 구성: HIGH 34개, MEDIUM 123개, LOW 79개 = 총 236개
--
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 daily_keywords_v2 테이블 키워드 삽입 시작...';
  RAISE NOTICE '';

-- =============================================================================
-- 🥇 HIGH 그룹 (트렌드, 10일 주기) - 매일 3개 선택 (34개)
-- =============================================================================

  RAISE NOTICE '🥇 HIGH 그룹 (트렌드) 키워드 삽입 중...';

  -- 음악 & 엔터테인먼트 (트렌드) - 7개
  PERFORM add_keyword_v2('K-pop', '음악 & 엔터테인먼트', 'high');
  PERFORM add_keyword_v2('댄스챌린지', '음악 & 엔터테인먼트', 'high');
  PERFORM add_keyword_v2('아이돌 직캠', '음악 & 엔터테인먼트', 'high');
  PERFORM add_keyword_v2('뮤직비디오', '음악 & 엔터테인먼트', 'high');
  PERFORM add_keyword_v2('콘서트', '음악 & 엔터테인먼트', 'high');
  PERFORM add_keyword_v2('안무 배우기', '음악 & 엔터테인먼트', 'high');
  PERFORM add_keyword_v2('스트릿댄스', '음악 & 엔터테인먼트', 'high');

  -- 코미디 & 챌린지 (트렌드) - 5개
  PERFORM add_keyword_v2('밈', '코미디 & 챌린지', 'high');
  PERFORM add_keyword_v2('챌린지', '코미디 & 챌린지', 'high');
  PERFORM add_keyword_v2('숏폼드라마', '코미디 & 챌린지', 'high');
  PERFORM add_keyword_v2('리액션', '코미디 & 챌린지', 'high');
  PERFORM add_keyword_v2('밸런스게임', '코미디 & 챌린지', 'high');

  -- 게임 & 테크 (트렌드) - 8개
  PERFORM add_keyword_v2('신작게임 리뷰', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('리그오브레전드', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('오버워치', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('발로란트', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('커뮤니티', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('언박싱', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('앱추천', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('PC세팅', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('로블록스', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('마인크래프트', '게임 & 테크', 'high');
  PERFORM add_keyword_v2('VR게임', '게임 & 테크', 'high');

  -- 교육 & 정보 (트렌드) - 5개
  PERFORM add_keyword_v2('AI 정보', '교육 & 정보', 'high');
  PERFORM add_keyword_v2('IT 뉴스', '교육 & 정보', 'high');
  PERFORM add_keyword_v2('재테크', '교육 & 정보', 'high');
  PERFORM add_keyword_v2('메타버스 정보', '교육 & 정보', 'high');
  PERFORM add_keyword_v2('NFT 정보', '교육 & 정보', 'high');

  -- 먹방 & 요리 (트렌드) - 2개
  PERFORM add_keyword_v2('편의점 신상', '먹방 & 요리', 'high');
  PERFORM add_keyword_v2('매운음식 도전', '먹방 & 요리', 'high');

  -- 뷰티 & 패션 (트렌드) - 2개
  PERFORM add_keyword_v2('OOTD', '뷰티 & 패션', 'high');
  PERFORM add_keyword_v2('화장품 리뷰', '뷰티 & 패션', 'high');

  -- 라이프스타일 & 건강 (트렌드) - 3개
  PERFORM add_keyword_v2('갓생', '라이프스타일 & 건강', 'high');
  PERFORM add_keyword_v2('다이어트 식단', '라이프스타일 & 건강', 'high');
  PERFORM add_keyword_v2('모닝루틴', '라이프스타일 & 건강', 'high');

  -- 여행 & 문화 (트렌드) - 2개
  PERFORM add_keyword_v2('해외반응', '여행 & 문화', 'high');
  PERFORM add_keyword_v2('항공권 꿀팁', '여행 & 문화', 'high');

-- =============================================================================
-- 🥈 MEDIUM 그룹 (인기, 20일 주기) - 매일 5개 선택 (123개)
-- =============================================================================

  RAISE NOTICE '🥈 MEDIUM 그룹 (인기) 키워드 삽입 중...';

  -- 먹방 & 요리 (인기) - 16개
  PERFORM add_keyword_v2('먹방', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('레시피', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('간단요리', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('자취요리', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('베이킹', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('홈카페', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('ASMR 먹방', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('길거리음식', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('디저트 만들기', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('밀키트 리뷰', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('야식', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('디저트 먹방', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('대식가 먹방', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('리뷰 먹방', '먹방 & 요리', 'medium');
  PERFORM add_keyword_v2('비건 요리', '먹방 & 요리', 'medium');

  -- 라이프스타일 & 건강 (인기) - 37개
  PERFORM add_keyword_v2('브이로그', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('홈트', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('강아지', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('고양이', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('다이어트', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('룸투어', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('인테리어', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('스트레칭', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('직장인 브이로그', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('학생 브이로그', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('자취 브이로그', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('청소', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('정리정돈', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('운동', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('요가', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('필라테스', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('헬스 루틴', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('러닝', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('마음챙김', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('공부', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('다꾸', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('DIY', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('건강정보', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('육아', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('임신출산', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('결혼 준비', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('제로웨이스트', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('업사이클링', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('다이소', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('이케아', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('쿠팡', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('크리스마스', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('발렌타인데이', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('여름휴가', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('할로윈', '라이프스타일 & 건강', 'medium');
  PERFORM add_keyword_v2('새해', '라이프스타일 & 건강', 'medium');

  -- 음악 & 엔터테인먼트 (인기) - 21개
  PERFORM add_keyword_v2('플레이리스트', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('커버댄스', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('방송댄스', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('힙합', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('팝송', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('피아노', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('기타', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('운동음악', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('노래방', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('밴드', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('EDM', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('R&B', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('한국 OST', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('웹툰', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('드라마 리뷰', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('영화 리뷰', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('팟캐스트', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('버튜버', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('애니메이션', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('랜덤플레이댄스', '음악 & 엔터테인먼트', 'medium');
  PERFORM add_keyword_v2('포토샵', '교육 & 정보', 'medium');

  -- 뷰티 & 패션 (인기) - 15개
  PERFORM add_keyword_v2('메이크업', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('룩북', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('데일리 메이크업', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('스킨케어 루틴', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('헤어스타일', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('네일아트', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('GRWM', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('패션', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('코디', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('패션하울', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('남자패션', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('신발 추천', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('남자 뷰티', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('올리브영', '뷰티 & 패션', 'medium');
  PERFORM add_keyword_v2('무신사', '뷰티 & 패션', 'medium');

  -- 게임 & 테크 (인기) - 11개  
  PERFORM add_keyword_v2('ChatGPT', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('스마트폰', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('테크리뷰', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('게임플레이', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('노트북', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('카메라', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('게이밍기어', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('게임 공략', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('가전제품', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('키보드', '게임 & 테크', 'medium');
  PERFORM add_keyword_v2('애플', '게임 & 테크', 'medium');

  -- ASMR & 힐링 (인기) - 1개
  PERFORM add_keyword_v2('ASMR 음악', 'ASMR & 힐링', 'medium');

  -- 교육 & 정보 (인기) - 11개
  PERFORM add_keyword_v2('영어공부', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('일본어공부', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('생활꿀팁', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('부동산', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('심리학', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('주식투자', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('부업', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('취업 준비', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('이직', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('경제 공부', '교육 & 정보', 'medium');
  PERFORM add_keyword_v2('신학기', '교육 & 정보', 'medium');

  -- 여행 & 문화 (인기) - 10개
  PERFORM add_keyword_v2('맛집', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('국내여행', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('해외여행', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('맛집투어', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('카페투어', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('캠핑', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('호캉스', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('유럽여행', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('동남아여행', '여행 & 문화', 'medium');
  PERFORM add_keyword_v2('일본여행', '여행 & 문화', 'medium');

  -- 코미디 & 챌린지 (인기) - 4개
  PERFORM add_keyword_v2('코미디', '코미디 & 챌린지', 'medium');
  PERFORM add_keyword_v2('상황극', '코미디 & 챌린지', 'medium');
  PERFORM add_keyword_v2('실험', '코미디 & 챌린지', 'medium');
  PERFORM add_keyword_v2('몰래카메라', '코미디 & 챌린지', 'medium');

-- =============================================================================
-- 🥉 LOW 그룹 (에버그린, 35일 주기) - 매일 2개 선택 (86개)
-- =============================================================================

  RAISE NOTICE '🥉 LOW 그룹 (에버그린) 키워드 삽입 중...';

  -- 음악 & 엔터테인먼트 (에버그린) - 22개
  PERFORM add_keyword_v2('클래식', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('재즈', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('로파이', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('록', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('어쿠스틱', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('바이올린', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('뉴에이지', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('국악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('집중음악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('수면음악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('카페음악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('공부음악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('명상음악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('힐링음악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('드라이브음악', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('발레', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('현대무용', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('단편영화', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('우쿨렐레', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('드럼', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('베이스', '음악 & 엔터테인먼트', 'low');
  PERFORM add_keyword_v2('태블릿', '게임 & 테크', 'low');

  -- 먹방 & 요리 (에버그린) - 5개
  PERFORM add_keyword_v2('한식', '먹방 & 요리', 'low');
  PERFORM add_keyword_v2('양식', '먹방 & 요리', 'low');
  PERFORM add_keyword_v2('일식', '먹방 & 요리', 'low');
  PERFORM add_keyword_v2('중식', '먹방 & 요리', 'low');
  PERFORM add_keyword_v2('건강식', '먹방 & 요리', 'low');

  -- 뷰티 & 패션 (에버그린) - 3개
  PERFORM add_keyword_v2('퍼스널컬러', '뷰티 & 패션', 'low');
  PERFORM add_keyword_v2('빈티지패션', '뷰티 & 패션', 'low');
  PERFORM add_keyword_v2('클린뷰티', '뷰티 & 패션', 'low');

  -- 라이프스타일 & 건강 (에버그린) - 6개
  PERFORM add_keyword_v2('미니멀라이프', '라이프스타일 & 건강', 'low');
  PERFORM add_keyword_v2('식물키우기', '라이프스타일 & 건강', 'low');
  PERFORM add_keyword_v2('독서', '라이프스타일 & 건강', 'low');
  PERFORM add_keyword_v2('자기계발', '라이프스타일 & 건강', 'low');
  PERFORM add_keyword_v2('친환경 생활', '라이프스타일 & 건강', 'low');
  PERFORM add_keyword_v2('도시락 만들기', '라이프스타일 & 건강', 'low');

  -- ASMR & 힐링 (에버그린) - 11개
  PERFORM add_keyword_v2('속삭임', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('탭핑', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('백색소음', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('파도소리', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('새소리', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('캠프파이어', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('카페소음', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('이팅 사운드', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('글씨 쓰는 소리', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('정리 ASMR', 'ASMR & 힐링', 'low');
  PERFORM add_keyword_v2('빗소리', 'ASMR & 힐링', 'low');

  -- 교육 & 정보 (에버그린) - 22개
  PERFORM add_keyword_v2('역사', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('과학', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('문화', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('예술', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('상식', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('인문학', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('우주', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('엑셀', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('영상 편집', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('중국어공부', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('영어 발음', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('법률상식', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('수학', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('물리학', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('화학', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('생물학', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('한국사', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('세계사', '교육 & 정보', 'low');
  PERFORM add_keyword_v2('철학', '교육 & 정보', 'low');

  -- 여행 & 문화 (에버그린) - 9개
  PERFORM add_keyword_v2('한국문화', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('서울여행', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('부산여행', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('제주도여행', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('강릉여행', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('경주여행', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('미국여행', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('워케이션', '여행 & 문화', 'low');
  PERFORM add_keyword_v2('가성비 여행', '여행 & 문화', 'low');

  -- 게임 & 테크 (에버그린) - 6개
  PERFORM add_keyword_v2('고전게임', '게임 & 테크', 'low');
  PERFORM add_keyword_v2('모바일게임', '게임 & 테크', 'low');
  PERFORM add_keyword_v2('PC게임', '게임 & 테크', 'low');
  PERFORM add_keyword_v2('콘솔게임', '게임 & 테크', 'low');
  PERFORM add_keyword_v2('자동차', '게임 & 테크', 'low');
  PERFORM add_keyword_v2('컴퓨터 조립', '게임 & 테크', 'low');

  -- 코미디 & 챌린지 (에버그린) - 2개
  PERFORM add_keyword_v2('개그', '코미디 & 챌린지', 'low');
  PERFORM add_keyword_v2('인터뷰', '코미디 & 챌린지', 'low');

END $$;

-- =============================================================================
-- 🎉 최종 완료 메시지 및 초기화 안내
-- =============================================================================

DO $$
DECLARE
  total_count integer;
  high_count integer;
  medium_count integer;
  low_count integer;
  high_sequences integer;
  medium_sequences integer;
  low_sequences integer;
BEGIN
  -- 삽입된 키워드 수 계산
  SELECT COUNT(*) INTO total_count FROM daily_keywords_v2;
  SELECT COUNT(*) INTO high_count FROM daily_keywords_v2 WHERE priority_tier = 'high';
  SELECT COUNT(*) INTO medium_count FROM daily_keywords_v2 WHERE priority_tier = 'medium';
  SELECT COUNT(*) INTO low_count FROM daily_keywords_v2 WHERE priority_tier = 'low';
  
  -- 각 그룹별 sequence_number 범위 확인
  SELECT MAX(sequence_number) INTO high_sequences FROM daily_keywords_v2 WHERE priority_tier = 'high';
  SELECT MAX(sequence_number) INTO medium_sequences FROM daily_keywords_v2 WHERE priority_tier = 'medium';
  SELECT MAX(sequence_number) INTO low_sequences FROM daily_keywords_v2 WHERE priority_tier = 'low';
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ===== 03_insert_keywords_data_v2.sql 완료! =====';
  RAISE NOTICE '📊 KEYWORDS_FINAL_CLEAN.txt 기반 236개 키워드 → daily_keywords_v2 테이블 삽입 완료';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 삽입 결과:';
  RAISE NOTICE '   전체 키워드: %개', total_count;
  RAISE NOTICE '   HIGH 그룹 (트렌드, 10일): %개 (sequence 1~%) - 매일 3개 선택', high_count, high_sequences;
  RAISE NOTICE '   MEDIUM 그룹 (인기, 20일): %개 (sequence 1~%) - 매일 5개 선택', medium_count, medium_sequences;
  RAISE NOTICE '   LOW 그룹 (에버그린, 35일): %개 (sequence 1~%) - 매일 2개 선택', low_count, low_sequences;
  RAISE NOTICE '   총 매일 선택: 10개 키워드';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 다음 단계:';
  RAISE NOTICE '   1. SELECT * FROM get_todays_keywords_v2(); -- 오늘의 키워드 10개 확인';
  RAISE NOTICE '   2. SELECT * FROM daily_keywords_v2 ORDER BY priority_tier, sequence_number; -- 전체 키워드 순서 확인';
  RAISE NOTICE '   3. 키워드 사용 후: SELECT update_keyword_usage_v2(''keyword''); -- 사용 기록 업데이트';
  RAISE NOTICE '   4. dailyKeywordUpdateService.js 연동하여 실제 YouTube API 검색 테스트';
  RAISE NOTICE '';
  RAISE NOTICE '📈 키워드 분포:';
  RAISE NOTICE '   음악 & 엔터테인먼트: 50개 (7 high + 21 medium + 22 low)';
  RAISE NOTICE '   먹방 & 요리: 21개 (2 high + 15 medium + 5 low)';
  RAISE NOTICE '   라이프스타일 & 건강: 46개 (3 high + 37 medium + 6 low)';
  RAISE NOTICE '   뷰티 & 패션: 20개 (2 high + 15 medium + 3 low)';
  RAISE NOTICE '   교육 & 정보: 38개 (5 high + 11 medium + 22 low)';
  RAISE NOTICE '   게임 & 테크: 25개 (8 high + 11 medium + 6 low)';
  RAISE NOTICE '   여행 & 문화: 21개 (2 high + 10 medium + 9 low)';
  RAISE NOTICE '   코미디 & 챌린지: 11개 (5 high + 4 medium + 2 low)';
  RAISE NOTICE '   ASMR & 힐링: 12개 (0 high + 1 medium + 11 low)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 daily_keywords_v2 시스템 준비 완료! YouTube Shorts AI 큐레이션을 시작하세요!';
END $$; 