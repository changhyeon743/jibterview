# 🏠 Pattern-Language 기반 평면도 추천 시스템

본 프로젝트는 **Christopher Alexander**의 *Pattern Language* 이론을 바탕으로, **비전문가의 삶의 요구를 자연어로 입력받아 적합한 주거 평면도를 추천**하는 AI 기반 시스템입니다. 평면도는 체계적으로 분석되어 **Neo4j 그래프 데이터베이스**에 저장되며, 시스템은 자연어 대화 → 구조화된 질문 → Cypher 쿼리 생성 → 추천의 흐름으로 작동합니다.

## 🧬 프로젝트 핵심 철학

공간은 '기능'이 아니라 '삶의 패턴'을 중심으로 설계되어야 합니다.
* **비전문가**도 자신의 공간에 대해 말할 수 있어야 한다.
* 질문을 통해 **사용자의 잠재적 요구**를 발견한다.
* **Christopher Alexander의 패턴 언어**를 통해 삶의 패턴을 해석한다.
* 그 대화를 바탕으로 공간을 **그래프적으로 이해하고 추천**한다.

## 📂 시스템 구성도

```
사용자 입력
   ↓
① 자유 응답
   ↓
② 3개의 질문 (Pattern Language 기반)
   ↓
③ 대화 요약 및 패턴 처리
   ↓
④ Cypher 쿼리 자동 생성
   ↓
⑤ Neo4j로 평면도 검색 추천
   ↓
⑥ 우측 화면에 추천 결과 표시
```

## 💡 주요 기능

| 기능 | 설명 |
|------|------|
| 사용자 자연어 입력 | "혼자 살지만 친구들이 자주 와요." |
| 자동 질문 생성 | "공간은 주로 어떻게 활용되나요?" 등 |
| 대화 요약 + 패턴 매칭 | 거실 중심, 공용 공간, 대화/TV 게임 중심 |
| Cypher 쿼리 자동 생성 | `MATCH (r:Room) WHERE r.type = 'LivingRoom' ...` |
| 적합 평면도 추천 | Neo4j에서 조건에 맞는 `FloorPlan` 탐색 |
| 결과 시각화 | 평면도 이미지 또는 요약 정보 우측에 표시 |

## 💠 기술 스택

* **Frontend**: Vercel AI Chatbot Starter (Next.js, React, Tailwind)
* **Neo4j**: 평면도 구조를 그래프 모델로 저장 (Room, Wall, Door, Corner)
* **LangChain**: 자연어 → Cypher 쿼리 생성, 질문 생성기
* **OpenAI**: 의미 기반 응답 요약 및 패턴 추론
* **Python 파이프라인**: RPLAN 평면도 → JSON/Neo4j 변환
* **rplankit 확장**: 방/벽/문 검출 및 Blueprint-JS 포맷 생성

## 🏗️ 구성 디렉토리

```
/app
  /chat                # 대화 UI
  /components          # 추천 컴포넌트
/api
  /neo4j.ts            # Cypher 실행 API
  /question-engine.ts  # 질문 자동 생성
/lib
  /cypher_generator.ts # 자연어 → Cypher 변환기
  /analyzer.ts         # 대화 요약 및 패턴 처리
  /patterns.ts         # Pattern Language 기반 질문 사전
/output                # 추천 결과 JSON
/core-python           # RPLAN 변환 파이프라인
```

## 🥺 사용 예시

사용자: "혼자 살지만 친구들이 자주 와요."

시스템:
① 친구를 초대했을 때 중요한 공간은 무엇인가요?
② 그 공간은 개인적 공간인가요, 공용되는 공간인가요?
③ 그 공간에서 어떤 활동이 자주 이루어지나요?

→ `거실` 중심, `소통`, `TV 게임` → Neo4j Cypher 추론 → 적합 평면도 표시

## ✅ 설치 및 실행 (Vercel AI 기준)

```bash
pnpm install
pnpm dev
```

* Python 파이프라인은 별도 실행 (`core-python/` 참고)
* Neo4j는 Docker로 실행 (`docker-compose up -d`)
* `.env` 설정 예시:

```env
OPENAI_API_KEY=sk-...
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=rplanpassword
```

## 📌 개발 계획

* Pattern 기반 공간 추천에 대한 **설명 텍스트 생성**
* GPT가 사용자에게 **공간의 장점/단점 피드백**
* 평면도 이미지 내의 **실시간 영역 강조**
* 사용자 프로파일 저장 및 **추천 이력 관리**

## 🤝 기여

이 프로젝트는 **비전문가와 공간 간의 대화를 가능하게 하기 위한 실험**입니다. 누구나 자신의 공간을 이해하고 설계할 수 있도록 도움을 주는 시스템을 함께 만들어가고자 합니다.

Pull Request 및 이슈 제안을 환영합니다. 🤝
