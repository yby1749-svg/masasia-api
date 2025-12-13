# Call MSG - On-Demand Massage Platform

[![CI](https://github.com/yby1749-svg/callmsg-api/actions/workflows/ci.yml/badge.svg)](https://github.com/yby1749-svg/callmsg-api/actions/workflows/ci.yml)

> 필리핀 메트로 마닐라 대상 온디맨드 출장 마사지 플랫폼

## 📋 프로젝트 구조

```
callmsg/
├── apps/
│   ├── api/                    # Backend API (Node.js/Express)
│   │   ├── src/
│   │   │   ├── config/         # 설정 (DB, Redis)
│   │   │   ├── middleware/     # 미들웨어 (Auth, Error)
│   │   │   ├── routes/         # API 라우트
│   │   │   ├── controllers/    # 컨트롤러
│   │   │   ├── services/       # 비즈니스 로직
│   │   │   ├── socket/         # Socket.IO
│   │   │   └── utils/          # 유틸리티
│   │   └── prisma/             # DB 스키마 & 시드
│   ├── customer-app/           # 고객 앱 (React Native) - TODO
│   ├── provider-app/           # 프로바이더 앱 (React Native) - TODO
│   └── admin-web/              # 관리자 웹 (React) - TODO
├── packages/
│   └── shared-types/           # 공유 타입
├── docs/                       # 문서
└── docker-compose.yml          # 개발 환경
```

## 🚀 빠른 시작

### 1. 필수 요구사항

- Node.js 20+
- Docker & Docker Compose
- npm 또는 yarn

### 2. 개발 환경 설정

```bash
# 저장소 클론
git clone <repository-url>
cd callmsg

# Docker로 PostgreSQL & Redis 실행
docker-compose up -d

# 의존성 설치
npm install

# 환경 변수 설정
cp apps/api/.env.example apps/api/.env
# .env 파일 수정

# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate

# 시드 데이터 삽입
npm run db:seed

# API 서버 실행
npm run api:dev
```

### 3. 접속 URL

- API: http://localhost:3000
- Health Check: http://localhost:3000/health
- Adminer (DB): http://localhost:8080
- Redis Commander: http://localhost:8081

## 🔐 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Admin | admin@callmsg.com | admin123! |
| Customer | customer@test.com | customer123! |
| Provider | provider@test.com | provider123! |

## 📚 API 문서

### 인증
```
POST /api/v1/auth/register    # 회원가입
POST /api/v1/auth/login       # 로그인
POST /api/v1/auth/refresh     # 토큰 갱신
POST /api/v1/auth/logout      # 로그아웃
```

### 사용자
```
GET  /api/v1/users/me         # 내 프로필
PATCH /api/v1/users/me        # 프로필 수정
GET  /api/v1/users/me/addresses  # 주소 목록
POST /api/v1/users/me/addresses  # 주소 추가
```

### 프로바이더
```
GET  /api/v1/providers        # 프로바이더 목록
GET  /api/v1/providers/:id    # 프로바이더 상세
POST /api/v1/providers/register  # 프로바이더 등록
PATCH /api/v1/provider/me/status # 온라인 상태 변경
```

### 예약
```
GET  /api/v1/bookings         # 예약 목록
POST /api/v1/bookings         # 예약 생성
GET  /api/v1/bookings/:id     # 예약 상세
POST /api/v1/bookings/:id/accept  # 예약 수락 (프로바이더)
POST /api/v1/bookings/:id/cancel  # 예약 취소
```

### 관리자
```
GET  /api/v1/admin/dashboard  # 대시보드
GET  /api/v1/admin/providers  # 프로바이더 관리
POST /api/v1/admin/providers/:id/approve  # 승인
GET  /api/v1/admin/payouts    # 정산 관리
GET  /api/v1/admin/reports    # 신고 관리
```

## 🔌 Socket.IO Events

### Client → Server
```typescript
socket.emit('join:booking', { bookingId });     // 예약 룸 참가
socket.emit('location:update', { bookingId, lat, lng });  // 위치 업데이트
socket.emit('provider:status', { status: 'ONLINE' });     // 상태 변경
```

### Server → Client
```typescript
socket.on('booking:new', (data) => {});         // 새 예약 (프로바이더)
socket.on('booking:updated', (data) => {});     // 예약 상태 변경
socket.on('location:provider', (data) => {});   // 프로바이더 위치
socket.on('notification', (data) => {});        // 알림
```

## 🛠 기술 스택

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Real-time**: Socket.IO

### External Services
- **Payment**: PayMongo
- **Maps**: Google Maps API
- **Push**: Firebase Cloud Messaging
- **SMS**: Twilio
- **Email**: SendGrid

### Infrastructure (AWS)
- ECS Fargate (Container)
- RDS PostgreSQL
- ElastiCache Redis
- S3 (Storage)
- CloudFront (CDN)
- ALB (Load Balancer)

## 📁 문서

- [시스템 아키텍처](./docs/architecture.md)
- [API 설계 (OpenAPI)](./docs/openapi.yaml)
- [화면 플로우](./docs/screen-flow.md)
- [실시간 기능 설계](./docs/realtime-features.md)
- [사업 기획서](./docs/business-plan.md)

## 📊 핵심 지표

| 항목 | 목표 |
|------|------|
| 필요 자금 | ₱3,250,000 (~$58,000) |
| 개발 기간 | 20주 (5개월) |
| 손익분기점 | Month 9 |
| 플랫폼 수수료 | 20% (얼리버드 15%) |
| Year 1 GMV | ₱14.5M |

## 🔧 스크립트

```bash
npm run api:dev        # API 개발 서버
npm run api:build      # API 빌드
npm run db:generate    # Prisma 클라이언트 생성
npm run db:migrate     # 마이그레이션 실행
npm run db:seed        # 시드 데이터 삽입
npm run db:studio      # Prisma Studio (DB GUI)
```

## 📝 라이선스

Private - All Rights Reserved
