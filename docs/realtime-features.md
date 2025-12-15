# ============================================================================
# MASASIA - Real-time Features Design (Socket.IO)
# ============================================================================
# Version: 1.0
# ============================================================================

# =============================================================================
# 1. OVERVIEW
# =============================================================================

## 실시간 기능 목록

| 기능 | 설명 | 사용자 |
|------|------|--------|
| 예약 알림 | 새 예약 요청, 수락/거절, 상태 변경 | 고객, 프로바이더 |
| 위치 추적 | 프로바이더 실시간 위치, ETA | 고객 |
| SOS 알림 | 긴급 상황 알림 | 관리자 |
| 온라인 상태 | 프로바이더 온라인/오프라인 | 시스템 |
| 푸시 알림 | 앱이 백그라운드일 때 | 모든 사용자 |

# =============================================================================
# 2. SOCKET.IO ARCHITECTURE
# =============================================================================

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SOCKET.IO ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                              CLIENTS                                     │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │   ┌─────────────────────┐         ┌─────────────────────┐              │   │
│  │   │    Customer App     │         │    Provider App     │              │   │
│  │   │                     │         │                     │              │   │
│  │   │  • 예약 상태 수신   │         │  • 예약 요청 수신   │              │   │
│  │   │  • 프로바이더 위치  │         │  • 위치 업데이트    │              │   │
│  │   │  • 알림 수신        │         │  • 온라인 상태 관리 │              │   │
│  │   │                     │         │  • 알림 수신        │              │   │
│  │   └──────────┬──────────┘         └──────────┬──────────┘              │   │
│  │              │                               │                          │   │
│  │              │      WebSocket (Socket.IO)    │                          │   │
│  │              └───────────────┬───────────────┘                          │   │
│  │                              │                                          │   │
│  └──────────────────────────────┼──────────────────────────────────────────┘   │
│                                 │                                               │
│                                 ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          SOCKET SERVER                                   │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │   │
│  │   │                     CONNECTION LAYER                             │  │   │
│  │   ├─────────────────────────────────────────────────────────────────┤  │   │
│  │   │  • JWT Authentication Middleware                                │  │   │
│  │   │  • Connection Management                                        │  │   │
│  │   │  • Heartbeat / Ping-Pong                                        │  │   │
│  │   └─────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                         │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │   │
│  │   │                      ROOM MANAGEMENT                             │  │   │
│  │   ├─────────────────────────────────────────────────────────────────┤  │   │
│  │   │                                                                 │  │   │
│  │   │  • user:{userId}        → 개인 알림 룸                          │  │   │
│  │   │  • booking:{bookingId}  → 예약별 실시간 추적 룸                 │  │   │
│  │   │  • provider:online      → 온라인 프로바이더 룸                  │  │   │
│  │   │  • admin:alerts         → 관리자 알림 룸                        │  │   │
│  │   │                                                                 │  │   │
│  │   └─────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                         │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │   │
│  │   │                      EVENT HANDLERS                              │  │   │
│  │   ├─────────────────────────────────────────────────────────────────┤  │   │
│  │   │                                                                 │  │   │
│  │   │  • Booking Events (new, update, cancel)                        │  │   │
│  │   │  • Location Events (update, broadcast)                         │  │   │
│  │   │  • Status Events (provider online/offline)                     │  │   │
│  │   │  • Notification Events (push to user)                          │  │   │
│  │   │                                                                 │  │   │
│  │   └─────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                 │                                               │
│                                 ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           DATA LAYER                                     │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │   ┌─────────────────────┐         ┌─────────────────────┐              │   │
│  │   │       Redis         │         │     PostgreSQL      │              │   │
│  │   │                     │         │                     │              │   │
│  │   │  • 실시간 위치 캐시 │         │  • 위치 로그 저장   │              │   │
│  │   │  • 세션 관리        │         │  • 예약 상태 업데이트│              │   │
│  │   │  • Pub/Sub (스케일링)         │  • 알림 저장        │              │   │
│  │   │                     │         │                     │              │   │
│  │   └─────────────────────┘         └─────────────────────┘              │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

# =============================================================================
# 3. EVENT SPECIFICATION
# =============================================================================

## 3.1 Client → Server Events

### 3.1.1 Authentication
```typescript
// 연결 시 인증 (handshake)
socket.auth = { token: 'JWT_ACCESS_TOKEN' };
socket.connect();

// 또는 연결 후 인증
socket.emit('authenticate', { token: 'JWT_ACCESS_TOKEN' });
```

### 3.1.2 Room Management
```typescript
// 예약 룸 참가 (위치 추적용)
socket.emit('join:booking', { bookingId: 'booking_123' });

// 예약 룸 퇴장
socket.emit('leave:booking', { bookingId: 'booking_123' });
```

### 3.1.3 Location Update (Provider Only)
```typescript
// 프로바이더가 위치 업데이트
socket.emit('location:update', {
  bookingId: 'booking_123',
  latitude: 14.5547,
  longitude: 121.0244,
  accuracy: 10,        // 미터 단위
  heading: 180,        // 방향 (선택)
  speed: 30,           // km/h (선택)
});
```

### 3.1.4 Provider Status
```typescript
// 온라인/오프라인 상태 변경
socket.emit('provider:status', { 
  status: 'ONLINE' // 또는 'OFFLINE'
});
```

## 3.2 Server → Client Events

### 3.2.1 Authentication Response
```typescript
socket.on('authenticated', (data) => {
  // { success: true, userId: 'user_123' }
});

socket.on('error', (data) => {
  // { code: 'AUTH_FAILED', message: 'Invalid token' }
});
```

### 3.2.2 Booking Events
```typescript
// 새 예약 요청 (프로바이더에게)
socket.on('booking:new', (data) => {
  /*
  {
    booking: {
      id: 'booking_123',
      bookingNumber: 'CM12345',
      customer: { firstName: 'John', avatarUrl: '...' },
      service: { name: 'Thai Massage' },
      duration: 90,
      scheduledAt: '2024-01-15T15:00:00Z',
      addressText: 'Gramercy Residences, Makati',
      distance: 3.2,  // km
      totalAmount: 1600,
      expiresAt: '2024-01-15T14:30:30Z',  // 30초 후 만료
    }
  }
  */
});

// 예약 상태 변경
socket.on('booking:updated', (data) => {
  /*
  {
    bookingId: 'booking_123',
    status: 'ACCEPTED',  // ACCEPTED, REJECTED, PROVIDER_EN_ROUTE, etc.
    updatedAt: '2024-01-15T14:30:00Z',
    // 상태별 추가 데이터
    eta: 15,  // 분 (EN_ROUTE 시)
    arrivedAt: '...',  // ARRIVED 시
    startedAt: '...',  // IN_PROGRESS 시
    completedAt: '...',  // COMPLETED 시
  }
  */
});

// 예약 취소
socket.on('booking:cancelled', (data) => {
  /*
  {
    bookingId: 'booking_123',
    cancelledBy: 'customer',  // 또는 'provider'
    reason: '고객 사정',
    refundAmount: 1600,
  }
  */
});
```

### 3.2.3 Location Events (Customer Receives)
```typescript
socket.on('location:provider', (data) => {
  /*
  {
    bookingId: 'booking_123',
    latitude: 14.5550,   // 마스킹된 위치 (~100m 정확도)
    longitude: 121.0240,
    eta: 12,             // 분 단위
    distance: 2.1,       // km
    updatedAt: '2024-01-15T14:35:00Z',
  }
  */
});
```

### 3.2.4 Notification Events
```typescript
socket.on('notification', (data) => {
  /*
  {
    id: 'notif_123',
    type: 'BOOKING_ACCEPTED',
    title: '예약이 확정되었습니다',
    body: 'Maria S.님이 예약을 수락했습니다.',
    data: {
      bookingId: 'booking_123',
      action: 'VIEW_BOOKING',
    },
    createdAt: '2024-01-15T14:30:00Z',
  }
  */
});
```

# =============================================================================
# 4. REAL-TIME LOCATION TRACKING FLOW
# =============================================================================

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      LOCATION TRACKING SEQUENCE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Provider App              Server                    Customer App              │
│       │                       │                           │                    │
│       │  1. 예약 수락         │                           │                    │
│       │  emit('accept')       │                           │                    │
│       │ ─────────────────────>│                           │                    │
│       │                       │                           │                    │
│       │                       │  2. 상태 변경 알림        │                    │
│       │                       │  emit('booking:updated')  │                    │
│       │                       │ ─────────────────────────>│                    │
│       │                       │                           │                    │
│       │                       │                           │  3. join:booking   │
│       │                       │ <─────────────────────────│                    │
│       │                       │                           │                    │
│       │  4. 이동 시작         │                           │                    │
│       │  status: EN_ROUTE     │                           │                    │
│       │ ─────────────────────>│                           │                    │
│       │                       │                           │                    │
│       │                       │  5. 상태 + ETA 알림       │                    │
│       │                       │ ─────────────────────────>│                    │
│       │                       │                           │                    │
│       │                       │                           │                    │
│       │  ┌────────────────────┼───────────────────────────┼──────────────┐    │
│       │  │            REAL-TIME TRACKING LOOP             │              │    │
│       │  │                    │                           │              │    │
│       │  │  6. GPS 위치 전송 (3~5초마다)                  │              │    │
│       │  │  location:update   │                           │              │    │
│       │  │  {lat, lng, acc}   │                           │              │    │
│       │  │ ──────────────────>│                           │              │    │
│       │  │                    │                           │              │    │
│       │  │                    │  7. Redis에 위치 저장     │              │    │
│       │  │                    │     (5분 TTL)             │              │    │
│       │  │                    │                           │              │    │
│       │  │                    │  8. Google Maps API       │              │    │
│       │  │                    │     ETA 계산              │              │    │
│       │  │                    │                           │              │    │
│       │  │                    │  9. 마스킹된 위치 브로드캐스트            │    │
│       │  │                    │     (~100m 반올림)        │              │    │
│       │  │                    │  location:provider        │              │    │
│       │  │                    │ ─────────────────────────>│              │    │
│       │  │                    │                           │              │    │
│       │  │                    │                           │  10. 지도에 │    │
│       │  │                    │                           │      마커 업데이트 │
│       │  │                    │                           │              │    │
│       │  │         (3~5초마다 반복)                       │              │    │
│       │  │                    │                           │              │    │
│       │  └────────────────────┼───────────────────────────┼──────────────┘    │
│       │                       │                           │                    │
│       │  11. 도착             │                           │                    │
│       │  status: ARRIVED      │                           │                    │
│       │ ─────────────────────>│                           │                    │
│       │                       │                           │                    │
│       │                       │  12. 도착 알림 + 푸시     │                    │
│       │                       │ ─────────────────────────>│                    │
│       │                       │                           │                    │
│       │  13. 서비스 시작      │                           │                    │
│       │  status: IN_PROGRESS  │                           │                    │
│       │ ─────────────────────>│                           │                    │
│       │                       │                           │                    │
│       │                       │  14. 위치 추적 종료       │                    │
│       │                       │      (leave:booking)      │                    │
│       │                       │                           │                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

# =============================================================================
# 5. LOCATION PRIVACY & MASKING
# =============================================================================

## 5.1 위치 마스킹 전략

```typescript
// 정확한 위치를 ~100m 정확도로 마스킹
function maskLocation(lat: number, lng: number): { lat: number; lng: number } {
  // 소수점 3자리로 반올림 (약 100m 정확도)
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}

// 예시:
// 원본: { lat: 14.55478, lng: 121.02443 }
// 마스킹: { lat: 14.555, lng: 121.024 }
```

## 5.2 위치 데이터 저장

```typescript
// Redis에 실시간 위치 저장 (5분 TTL)
// Key: location:booking:{bookingId}
{
  "lat": 14.55478,      // 정확한 위치 (관리자/긴급용)
  "lng": 121.02443,
  "maskedLat": 14.555,  // 마스킹된 위치 (고객용)
  "maskedLng": 121.024,
  "eta": 12,            // 분
  "distance": 2.1,      // km
  "updatedAt": 1705323300000
}

// PostgreSQL에 위치 로그 저장 (분쟁/기록용)
// Table: LocationLog
{
  "bookingId": "booking_123",
  "providerId": "provider_456",
  "latitude": 14.55478,
  "longitude": 121.02443,
  "accuracy": 10,
  "timestamp": "2024-01-15T14:35:00Z"
}
```

# =============================================================================
# 6. ETA CALCULATION
# =============================================================================

## 6.1 Google Maps Distance Matrix API

```typescript
import axios from 'axios';

interface ETAResult {
  eta: number;           // 분
  distance: number;      // km
  durationText: string;  // "15 mins"
  distanceText: string;  // "3.2 km"
}

async function calculateETA(
  providerLat: number,
  providerLng: number,
  customerLat: number,
  customerLng: number
): Promise<ETAResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  const response = await axios.get(
    'https://maps.googleapis.com/maps/api/distancematrix/json',
    {
      params: {
        origins: `${providerLat},${providerLng}`,
        destinations: `${customerLat},${customerLng}`,
        mode: 'driving',
        departure_time: 'now',  // 실시간 교통 반영
        key: apiKey,
      },
    }
  );

  const element = response.data.rows[0].elements[0];
  
  if (element.status !== 'OK') {
    // Fallback: 직선 거리 기반 추정
    const distance = haversineDistance(
      providerLat, providerLng,
      customerLat, customerLng
    );
    const eta = Math.ceil(distance / 0.5); // 30km/h 평균 속도 가정
    
    return {
      eta,
      distance,
      durationText: `약 ${eta}분`,
      distanceText: `${distance.toFixed(1)} km`,
    };
  }

  return {
    eta: Math.ceil(element.duration_in_traffic.value / 60),
    distance: element.distance.value / 1000,
    durationText: element.duration_in_traffic.text,
    distanceText: element.distance.text,
  };
}

// Haversine 공식 (직선 거리)
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

## 6.2 ETA 업데이트 주기

| 거리 | 업데이트 주기 | ETA API 호출 |
|------|--------------|--------------|
| > 5km | 10초 | 매 30초 |
| 2-5km | 5초 | 매 20초 |
| < 2km | 3초 | 매 15초 |
| < 500m | 3초 | 사용 안함 (도착 임박) |

# =============================================================================
# 7. PUSH NOTIFICATION INTEGRATION
# =============================================================================

## 7.1 FCM (Firebase Cloud Messaging) 연동

```typescript
import admin from 'firebase-admin';

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendPushNotification(payload: PushPayload): Promise<void> {
  // Get user's FCM token from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) {
    console.log(`No FCM token for user ${payload.userId}`);
    return;
  }

  try {
    await admin.messaging().send({
      token: user.fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'booking_updates',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    
    console.log(`Push sent to user ${payload.userId}`);
  } catch (error) {
    console.error(`Push failed for user ${payload.userId}:`, error);
    
    // Invalid token - remove from database
    if ((error as any).code === 'messaging/invalid-registration-token') {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { fcmToken: null },
      });
    }
  }
}
```

## 7.2 Socket + Push 조합

```typescript
// 알림 전송 함수 (Socket + Push)
async function notifyUser(
  userId: string,
  notification: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
) {
  // 1. DB에 알림 저장
  const saved = await prisma.notification.create({
    data: {
      userId,
      type: notification.type as any,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    },
  });

  // 2. Socket으로 실시간 전송 (앱이 열려있을 때)
  sendNotificationToUser(userId, {
    id: saved.id,
    ...notification,
    createdAt: saved.createdAt.toISOString(),
  });

  // 3. Push 알림 전송 (앱이 백그라운드일 때)
  await sendPushNotification({
    userId,
    title: notification.title,
    body: notification.body,
    data: {
      notificationId: saved.id,
      type: notification.type,
      ...Object.fromEntries(
        Object.entries(notification.data || {}).map(([k, v]) => [k, String(v)])
      ),
    },
  });
}
```

# =============================================================================
# 8. SCALING CONSIDERATIONS
# =============================================================================

## 8.1 Redis Pub/Sub for Multiple Instances

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// 여러 서버 인스턴스에서 Socket.IO 동기화
async function setupRedisAdapter(io: Server) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
  
  console.log('✅ Redis adapter configured for Socket.IO');
}
```

## 8.2 Sticky Sessions (AWS ALB)

```yaml
# ALB Target Group 설정
TargetGroupAttributes:
  - Key: stickiness.enabled
    Value: "true"
  - Key: stickiness.type
    Value: "lb_cookie"
  - Key: stickiness.lb_cookie.duration_seconds
    Value: "86400"  # 24시간
```

## 8.3 Connection Limits

```typescript
// 서버당 최대 연결 수 제한
const MAX_CONNECTIONS = 10000;
let connectionCount = 0;

io.use((socket, next) => {
  if (connectionCount >= MAX_CONNECTIONS) {
    return next(new Error('Server at capacity'));
  }
  connectionCount++;
  next();
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    connectionCount--;
  });
});
```

# =============================================================================
# 9. ERROR HANDLING
# =============================================================================

## 9.1 Client-side Reconnection

```typescript
// React Native Socket.IO 클라이언트
const socket = io(API_URL, {
  auth: { token: accessToken },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
  
  if (error.message === 'Authentication required') {
    // 토큰 갱신 후 재연결
    refreshToken().then(() => {
      socket.auth = { token: newAccessToken };
      socket.connect();
    });
  }
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // 서버가 연결 끊음 - 수동 재연결 필요
    socket.connect();
  }
  // 다른 이유는 자동 재연결
});
```

## 9.2 Server-side Error Events

```typescript
// Error codes
const SocketErrors = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
  RATE_LIMITED: 'RATE_LIMITED',
};

// 에러 전송
socket.emit('error', {
  code: SocketErrors.PERMISSION_DENIED,
  message: 'Only providers can update location',
});
```

# =============================================================================
# 10. MONITORING & DEBUGGING
# =============================================================================

## 10.1 Socket.IO Admin UI

```typescript
import { instrument } from '@socket.io/admin-ui';

// 개발 환경에서만 Admin UI 활성화
if (process.env.NODE_ENV === 'development') {
  instrument(io, {
    auth: {
      type: 'basic',
      username: 'admin',
      password: process.env.SOCKET_ADMIN_PASSWORD || 'admin',
    },
    mode: 'development',
  });
  
  console.log('Socket.IO Admin UI: https://admin.socket.io');
}
```

## 10.2 Logging

```typescript
// 연결/이벤트 로깅
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id} | User: ${socket.userId}`);
  
  socket.onAny((event, ...args) => {
    console.log(`[Socket] Event: ${event} | User: ${socket.userId} | Data:`, args);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} | Reason: ${reason}`);
  });
});
```

## 10.3 Metrics (CloudWatch)

```typescript
// 메트릭 수집
setInterval(() => {
  const sockets = io.sockets.sockets;
  const rooms = io.sockets.adapter.rooms;
  
  console.log({
    activeConnections: sockets.size,
    activeRooms: rooms.size,
    onlineProviders: io.sockets.adapter.rooms.get('provider:online')?.size || 0,
  });
  
  // CloudWatch에 메트릭 전송
  // cloudwatch.putMetricData(...)
}, 60000); // 1분마다
```
