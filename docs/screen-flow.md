# ============================================================================
# MASASIA - App Screen Flow & Navigation
# ============================================================================
# Version: 1.0
# ============================================================================

# =============================================================================
# 1. CUSTOMER APP - SCREEN MAP
# =============================================================================

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER APP - SCREEN MAP                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                              ┌─────────────┐                                    │
│                              │   Splash    │                                    │
│                              └──────┬──────┘                                    │
│                                     │                                           │
│                    ┌────────────────┼────────────────┐                         │
│                    │                │                │                         │
│                    ▼                ▼                ▼                         │
│             ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│             │  Onboarding │  │    Login    │  │    Home     │                  │
│             │  (처음만)   │  │  (비로그인) │  │  (로그인됨) │                  │
│             └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│                    │                │                │                         │
│                    └───────>────────┤                │                         │
│                                     │                │                         │
│  ┌──────────────────────────────────┼────────────────┼──────────────────────┐  │
│  │                                  │                │                      │  │
│  │  AUTH STACK                      │                │                      │  │
│  │  ─────────────────────────────   │                │                      │  │
│  │                                  ▼                │                      │  │
│  │  ┌─────────────┐          ┌─────────────┐        │                      │  │
│  │  │   Login     │ <───────>│  Register   │        │                      │  │
│  │  └──────┬──────┘          └──────┬──────┘        │                      │  │
│  │         │                        │               │                      │  │
│  │         ▼                        ▼               │                      │  │
│  │  ┌─────────────┐          ┌─────────────┐        │                      │  │
│  │  │   Forgot    │          │  OTP Verify │        │                      │  │
│  │  │  Password   │          └──────┬──────┘        │                      │  │
│  │  └─────────────┘                 │               │                      │  │
│  │                                  │               │                      │  │
│  │                                  ▼               │                      │  │
│  │                           ┌─────────────┐        │                      │  │
│  │                           │  Complete   │────────┘                      │  │
│  │                           │   Profile   │                               │  │
│  │                           └─────────────┘                               │  │
│  │                                                                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                         │  │
│  │  MAIN TAB NAVIGATOR (Bottom Tabs)                                       │  │
│  │  ═══════════════════════════════════════════════════════════════════   │  │
│  │                                                                         │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│  │  │  Home   │  │ Search  │  │Bookings │  │  Inbox  │  │ Profile │      │  │
│  │  │   🏠    │  │   🔍    │  │   📅    │  │   💬    │  │   👤    │      │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │  │
│  │       │            │            │            │            │            │  │
│  │       ▼            ▼            ▼            ▼            ▼            │  │
│  │                                                                         │  │
│  │  HOME STACK        SEARCH STACK    BOOKINGS STACK   INBOX      PROFILE │  │
│  │  ───────────       ────────────    ──────────────   STACK      STACK   │  │
│  │                                                                         │  │
│  │  ┌─────────┐      ┌─────────┐     ┌─────────┐    ┌─────────┐ ┌───────┐│  │
│  │  │  Home   │      │ Search  │     │ Booking │    │  Inbox  │ │Profile││  │
│  │  │  List   │      │ Filter  │     │  List   │    │  List   │ │ Main  ││  │
│  │  └────┬────┘      └────┬────┘     └────┬────┘    └────┬────┘ └───┬───┘│  │
│  │       │                │               │              │          │    │  │
│  │       ▼                ▼               ▼              ▼          ▼    │  │
│  │  ┌─────────┐      ┌─────────┐     ┌─────────┐    ┌─────────┐ ┌───────┐│  │
│  │  │Provider │      │Provider │     │ Booking │    │  Chat   │ │Address││  │
│  │  │  List   │      │  List   │     │ Detail  │    │ Detail  │ │ List  ││  │
│  │  └────┬────┘      └────┬────┘     └────┬────┘    └─────────┘ └───┬───┘│  │
│  │       │                │               │                         │    │  │
│  │       └───────┬────────┘               │                         ▼    │  │
│  │               ▼                        ▼                    ┌─────────┐│  │
│  │          ┌─────────┐              ┌─────────┐               │Emergency││  │
│  │          │Provider │              │ Review  │               │ Contact ││  │
│  │          │ Detail  │              │ Write   │               └─────────┘│  │
│  │          └────┬────┘              └─────────┘                         │  │
│  │               │                                                        │  │
│  │               ▼                                                        │  │
│  │          ┌─────────────────────────────────────────────────────────┐  │  │
│  │          │                    BOOKING FLOW                          │  │  │
│  │          ├─────────────────────────────────────────────────────────┤  │  │
│  │          │                                                         │  │  │
│  │          │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐ │  │  │
│  │          │  │ Service │──>│DateTime │──>│ Address │──>│ Confirm │ │  │  │
│  │          │  │ Select  │   │ Select  │   │ Select  │   │ & Pay   │ │  │  │
│  │          │  └─────────┘   └─────────┘   └─────────┘   └────┬────┘ │  │  │
│  │          │                                                  │      │  │  │
│  │          │                                                  ▼      │  │  │
│  │          │                                            ┌─────────┐  │  │  │
│  │          │                                            │ Payment │  │  │  │
│  │          │                                            │ (Web)   │  │  │  │
│  │          │                                            └────┬────┘  │  │  │
│  │          │                                                 │       │  │  │
│  │          │                                                 ▼       │  │  │
│  │          │                                            ┌─────────┐  │  │  │
│  │          │                                            │ Success │  │  │  │
│  │          │                                            └─────────┘  │  │  │
│  │          │                                                         │  │  │
│  │          └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                         │  │
│  │          ┌─────────────────────────────────────────────────────────┐  │  │
│  │          │                    TRACKING MODAL                        │  │  │
│  │          ├─────────────────────────────────────────────────────────┤  │  │
│  │          │                                                         │  │  │
│  │          │  ┌─────────────────────────────────────────────────┐   │  │  │
│  │          │  │                                                 │   │  │  │
│  │          │  │                    MAP VIEW                     │   │  │  │
│  │          │  │              (Provider Location)                │   │  │  │
│  │          │  │                                                 │   │  │  │
│  │          │  └─────────────────────────────────────────────────┘   │  │  │
│  │          │                                                         │  │  │
│  │          │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │  │
│  │          │  │  Provider   │  │     ETA     │  │    SOS      │     │  │  │
│  │          │  │    Info     │  │   Display   │  │   Button    │     │  │  │
│  │          │  └─────────────┘  └─────────────┘  └─────────────┘     │  │  │
│  │          │                                                         │  │  │
│  │          └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

# =============================================================================
# 2. PROVIDER APP - SCREEN MAP
# =============================================================================

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PROVIDER APP - SCREEN MAP                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                              ┌─────────────┐                                    │
│                              │   Splash    │                                    │
│                              └──────┬──────┘                                    │
│                                     │                                           │
│                    ┌────────────────┼────────────────┐                         │
│                    │                │                │                         │
│                    ▼                ▼                ▼                         │
│             ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│             │    Login    │  │  Pending    │  │  Dashboard  │                  │
│             │  (비로그인) │  │  (심사중)   │  │  (승인됨)   │                  │
│             └──────┬──────┘  └─────────────┘  └──────┬──────┘                  │
│                    │                                 │                         │
│  ┌─────────────────┼─────────────────────────────────┼──────────────────────┐  │
│  │                 │                                 │                      │  │
│  │  AUTH & REGISTRATION STACK                        │                      │  │
│  │  ───────────────────────────────                  │                      │  │
│  │                 ▼                                 │                      │  │
│  │          ┌─────────────┐                          │                      │  │
│  │          │    Login    │                          │                      │  │
│  │          └──────┬──────┘                          │                      │  │
│  │                 │                                 │                      │  │
│  │                 ▼                                 │                      │  │
│  │          ┌─────────────┐                          │                      │  │
│  │          │  Register   │                          │                      │  │
│  │          │  (Basic)    │                          │                      │  │
│  │          └──────┬──────┘                          │                      │  │
│  │                 │                                 │                      │  │
│  │                 ▼                                 │                      │  │
│  │  ┌──────────────────────────────────────────┐    │                      │  │
│  │  │           REGISTRATION FLOW              │    │                      │  │
│  │  ├──────────────────────────────────────────┤    │                      │  │
│  │  │                                          │    │                      │  │
│  │  │  Step 1        Step 2        Step 3      │    │                      │  │
│  │  │ ┌────────┐   ┌────────┐   ┌────────┐    │    │                      │  │
│  │  │ │ Basic  │──>│Document│──>│Service │    │    │                      │  │
│  │  │ │  Info  │   │ Upload │   │ Setup  │    │    │                      │  │
│  │  │ └────────┘   └────────┘   └───┬────┘    │    │                      │  │
│  │  │                               │          │    │                      │  │
│  │  │                               ▼          │    │                      │  │
│  │  │  Step 4        Step 5                    │    │                      │  │
│  │  │ ┌────────┐   ┌────────┐                  │    │                      │  │
│  │  │ │  Bank  │──>│ Review │─────────────────────>│                      │  │
│  │  │ │Account │   │& Submit│                  │    │                      │  │
│  │  │ └────────┘   └────────┘                  │    │                      │  │
│  │  │                                          │    │                      │  │
│  │  └──────────────────────────────────────────┘    │                      │  │
│  │                                                   │                      │  │
│  └───────────────────────────────────────────────────┼──────────────────────┘  │
│                                                      │                         │
│  ┌───────────────────────────────────────────────────┼──────────────────────┐  │
│  │                                                   │                      │  │
│  │  MAIN TAB NAVIGATOR (Bottom Tabs)                 │                      │  │
│  │  ═══════════════════════════════════════════════  │                      │  │
│  │                                                   │                      │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┴─┐                     │  │
│  │  │Dashboard│  │Bookings │  │Earnings │  │ Settings │                     │  │
│  │  │   🏠    │  │   📅    │  │   💰    │  │    ⚙️    │                     │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                     │  │
│  │       │            │            │            │                           │  │
│  │       ▼            ▼            ▼            ▼                           │  │
│  │                                                                          │  │
│  │  DASHBOARD        BOOKINGS      EARNINGS     SETTINGS                    │  │
│  │  ─────────        ────────      ────────     ────────                    │  │
│  │                                                                          │  │
│  │  ┌─────────┐    ┌─────────┐   ┌─────────┐   ┌─────────┐                 │  │
│  │  │Dashboard│    │ Booking │   │Earnings │   │ Profile │                 │  │
│  │  │  Main   │    │  List   │   │ Summary │   │  Edit   │                 │  │
│  │  │         │    └────┬────┘   └────┬────┘   └────┬────┘                 │  │
│  │  │ ┌─────┐ │         │             │             │                      │  │
│  │  │ │ON/  │ │         ▼             ▼             ▼                      │  │
│  │  │ │OFF  │ │    ┌─────────┐   ┌─────────┐   ┌─────────┐                 │  │
│  │  │ │Toggle│    │ Booking │   │ Payout  │   │ Service │                 │  │
│  │  │ └─────┘ │    │ Detail  │   │ Request │   │ Setup   │                 │  │
│  │  │         │    └────┬────┘   └─────────┘   └────┬────┘                 │  │
│  │  │ ┌─────┐ │         │                          │                      │  │
│  │  │ │Today│ │         ▼                          ▼                      │  │
│  │  │ │Stats│ │    ┌─────────┐                ┌─────────┐                 │  │
│  │  │ └─────┘ │    │Navigation                │Availability               │  │
│  │  │         │    │  (Map)  │                │ Schedule│                 │  │
│  │  └────┬────┘    └─────────┘                └────┬────┘                 │  │
│  │       │                                         │                      │  │
│  │       ▼                                         ▼                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    NEW BOOKING MODAL                            │  │  │
│  │  ├─────────────────────────────────────────────────────────────────┤  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │  │  │
│  │  │  │                                                           │ │  │  │
│  │  │  │   New Booking Request!                                    │ │  │  │
│  │  │  │                                                           │ │  │  │
│  │  │  │   Customer: John D.                                       │ │  │  │
│  │  │  │   Service: Thai Massage 90min                            │ │  │  │
│  │  │  │   Address: Makati, 3.2km away                            │ │  │  │
│  │  │  │   Time: Today 3:00 PM                                    │ │  │  │
│  │  │  │   Amount: ₱1,500 + ₱100 travel                          │ │  │  │
│  │  │  │                                                           │ │  │  │
│  │  │  │   ┌─────────────────────────────────────────────┐        │ │  │  │
│  │  │  │   │              ⏱️ 0:25 remaining              │        │ │  │  │
│  │  │  │   └─────────────────────────────────────────────┘        │ │  │  │
│  │  │  │                                                           │ │  │  │
│  │  │  │   ┌───────────────┐      ┌───────────────┐               │ │  │  │
│  │  │  │   │    REJECT     │      │    ACCEPT     │               │ │  │  │
│  │  │  │   │     ❌        │      │      ✅       │               │ │  │  │
│  │  │  │   └───────────────┘      └───────────────┘               │ │  │  │
│  │  │  │                                                           │ │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘ │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    ACTIVE BOOKING SCREEN                        │  │  │
│  │  ├─────────────────────────────────────────────────────────────────┤  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │  │  │
│  │  │  │                       MAP VIEW                            │ │  │  │
│  │  │  │                (Route to Customer)                        │ │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘ │  │  │
│  │  │                                                                 │  │  │
│  │  │  Customer Info:  John Doe | ☎️ Call                            │  │  │
│  │  │  Address: Unit 1234, Gramercy Residences                       │  │  │
│  │  │                                                                 │  │  │
│  │  │  Status Buttons:                                                │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │  │
│  │  │  │  START   │  │ ARRIVED  │  │  BEGIN   │  │ COMPLETE │       │  │  │
│  │  │  │  ROUTE   │  │          │  │ SERVICE  │  │          │       │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │  │  │
│  │  │                                                                 │  │  │
│  │  │                        ┌───────────────┐                       │  │  │
│  │  │                        │   SOS 🆘      │                       │  │  │
│  │  │                        └───────────────┘                       │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

# =============================================================================
# 3. ADMIN WEB - SCREEN MAP
# =============================================================================

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN WEB - SCREEN MAP                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                              SIDEBAR                                     │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │  🏠 Dashboard                                                           │   │
│  │  👥 Providers                                                           │   │
│  │     └─ Pending Review                                                   │   │
│  │     └─ All Providers                                                    │   │
│  │  📅 Bookings                                                            │   │
│  │     └─ Active                                                           │   │
│  │     └─ All Bookings                                                     │   │
│  │  💰 Payouts                                                             │   │
│  │     └─ Pending                                                          │   │
│  │     └─ History                                                          │   │
│  │  🚨 Reports                                                             │   │
│  │     └─ Open Cases                                                       │   │
│  │     └─ All Reports                                                      │   │
│  │  📊 Analytics                                                           │   │
│  │  ⚙️ Settings                                                            │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                              PAGES                                       │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │  DASHBOARD (/admin)                                                     │   │
│  │  ──────────────────────────────────────────────────────────────────    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                                 │   │   │
│  │  │   Today's Stats                                                 │   │   │
│  │  │   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐               │   │   │
│  │  │   │Bookings│  │  GMV   │  │Revenue │  │Provider│               │   │   │
│  │  │   │  125   │  │₱225K   │  │ ₱45K   │  │Online:45              │   │   │
│  │  │   └────────┘  └────────┘  └────────┘  └────────┘               │   │   │
│  │  │                                                                 │   │   │
│  │  │   Alerts                         Recent Activity                │   │   │
│  │  │   ┌──────────────────┐           ┌──────────────────┐          │   │   │
│  │  │   │ 🔴 3 SOS Active  │           │ • New booking    │          │   │   │
│  │  │   │ 🟡 12 Pending    │           │ • Provider approved          │   │   │
│  │  │   │    Reviews       │           │ • Payout processed│          │   │   │
│  │  │   │ 🟡 5 Open Reports│           │ • ...            │          │   │   │
│  │  │   └──────────────────┘           └──────────────────┘          │   │   │
│  │  │                                                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  PROVIDERS (/admin/providers)                                           │   │
│  │  ──────────────────────────────────────────────────────────────────    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Filter: [Status ▼] [Search...]                                │   │   │
│  │  │                                                                 │   │   │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │   │   │
│  │  │  │ Name     │ Status  │ Rating │ Bookings │ Joined  │ Action │ │   │   │
│  │  │  ├──────────┼─────────┼────────┼──────────┼─────────┼────────┤ │   │   │
│  │  │  │ Maria S. │ Pending │  -     │   -      │ Today   │ Review │ │   │   │
│  │  │  │ John D.  │ Approved│  4.8   │   52     │ 2mo ago │ View   │ │   │   │
│  │  │  │ ...      │         │        │          │         │        │ │   │   │
│  │  │  └───────────────────────────────────────────────────────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  PROVIDER REVIEW (/admin/providers/:id/review)                          │   │
│  │  ──────────────────────────────────────────────────────────────────    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                                 │   │   │
│  │  │   Profile Info          Documents                               │   │   │
│  │  │   ┌──────────────┐     ┌──────────────┐                        │   │   │
│  │  │   │ Photo: ✅    │     │ ID: [View]   │  ✅ / ❌               │   │   │
│  │  │   │ Name: Maria  │     │ Cert: [View] │  ✅ / ❌               │   │   │
│  │  │   │ Phone: ...   │     │ Photo: [View]│  ✅ / ❌               │   │   │
│  │  │   │ Bio: ...     │     └──────────────┘                        │   │   │
│  │  │   └──────────────┘                                             │   │   │
│  │  │                                                                 │   │   │
│  │  │   Services Setup        Bank Account                            │   │   │
│  │  │   ┌──────────────┐     ┌──────────────┐                        │   │   │
│  │  │   │ Thai: ₱800   │     │ BDO: ***1234 │                        │   │   │
│  │  │   │ Aroma: ₱1000 │     │ Name: Maria  │                        │   │   │
│  │  │   └──────────────┘     └──────────────┘                        │   │   │
│  │  │                                                                 │   │   │
│  │  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │   │   │
│  │  │   │   REJECT    │  │    HOLD     │  │   APPROVE   │            │   │   │
│  │  │   └─────────────┘  └─────────────┘  └─────────────┘            │   │   │
│  │  │                                                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  BOOKINGS (/admin/bookings)                                             │   │
│  │  ──────────────────────────────────────────────────────────────────    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Filter: [Status ▼] [Date Range] [Search...]                   │   │   │
│  │  │                                                                 │   │   │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │   │   │
│  │  │  │ ID      │Customer │Provider│ Service │ Status │ Amount   │ │   │   │
│  │  │  ├─────────┼─────────┼────────┼─────────┼────────┼──────────┤ │   │   │
│  │  │  │ #12345  │ John D. │Maria S.│Thai 90m │In Prog │ ₱1,600   │ │   │   │
│  │  │  │ #12344  │ Jane K. │Pedro M.│Aroma60m │Complete│ ₱1,200   │ │   │   │
│  │  │  └───────────────────────────────────────────────────────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  PAYOUTS (/admin/payouts)                                               │   │
│  │  ──────────────────────────────────────────────────────────────────    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Pending: 12 requests | Total: ₱156,000                        │   │   │
│  │  │                                                                 │   │   │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │   │   │
│  │  │  │ Provider │ Amount  │ Method │ Account    │ Status │Action │ │   │   │
│  │  │  ├──────────┼─────────┼────────┼────────────┼────────┼───────┤ │   │   │
│  │  │  │ Maria S. │ ₱15,000 │ GCash  │ 0917***    │ Pending│Process│ │   │   │
│  │  │  │ John D.  │ ₱8,500  │ Bank   │ BDO ***    │ Pending│Process│ │   │   │
│  │  │  └───────────────────────────────────────────────────────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  REPORTS (/admin/reports)                                               │   │
│  │  ──────────────────────────────────────────────────────────────────    │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Filter: [Severity ▼] [Status ▼] [Type ▼]                      │   │   │
│  │  │                                                                 │   │   │
│  │  │  ┌───────────────────────────────────────────────────────────┐ │   │   │
│  │  │  │Severity│ Type      │ Reporter│ Reported │Status │ Action  │ │   │   │
│  │  │  ├────────┼───────────┼─────────┼──────────┼───────┼─────────┤ │   │   │
│  │  │  │ 🔴 HIGH│ Harassment│ John D. │ Maria S. │Open   │ Handle  │ │   │   │
│  │  │  │ 🟡 MED │ No-show   │ Maria S.│ John D.  │Open   │ Handle  │ │   │   │
│  │  │  └───────────────────────────────────────────────────────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

# =============================================================================
# 4. NAVIGATION CODE STRUCTURE
# =============================================================================

## Customer App Navigation (React Navigation)

```typescript
// navigation/index.tsx

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OTPVerify: { phone: string };
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  CompleteProfile: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  BookingsTab: undefined;
  InboxTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ProviderList: { category?: string };
  ProviderDetail: { providerId: string };
  Booking: { providerId: string };
  BookingService: { providerId: string };
  BookingDateTime: { providerId: string; serviceId: string; duration: number };
  BookingAddress: { providerId: string; serviceId: string; duration: number; datetime: string };
  BookingConfirm: { bookingData: BookingData };
  BookingSuccess: { bookingId: string };
};

export type BookingsStackParamList = {
  BookingList: undefined;
  BookingDetail: { bookingId: string };
  BookingTracking: { bookingId: string };
  ReviewWrite: { bookingId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  AddressList: undefined;
  AddAddress: undefined;
  EditAddress: { addressId: string };
  EmergencyContact: undefined;
  Settings: undefined;
  ChangePassword: undefined;
};

// Root Navigator
const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!hasCompletedOnboarding && (
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
      {!isAuthenticated ? (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <RootStack.Screen name="Main" component={MainTabNavigator} />
      )}
    </RootStack.Navigator>
  );
}

// Auth Navigator
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="OTPVerify" component={OTPVerifyScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'HomeTab': iconName = focused ? 'home' : 'home-outline'; break;
            case 'SearchTab': iconName = focused ? 'search' : 'search-outline'; break;
            case 'BookingsTab': iconName = focused ? 'calendar' : 'calendar-outline'; break;
            case 'InboxTab': iconName = focused ? 'chatbox' : 'chatbox-outline'; break;
            case 'ProfileTab': iconName = focused ? 'person' : 'person-outline'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1a365d',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="SearchTab" component={SearchNavigator} options={{ title: 'Search' }} />
      <Tab.Screen name="BookingsTab" component={BookingsNavigator} options={{ title: 'Bookings' }} />
      <Tab.Screen name="InboxTab" component={InboxNavigator} options={{ title: 'Inbox' }} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// Home Stack Navigator
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="ProviderList" component={ProviderListScreen} />
      <HomeStack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
      <HomeStack.Screen name="BookingService" component={BookingServiceScreen} />
      <HomeStack.Screen name="BookingDateTime" component={BookingDateTimeScreen} />
      <HomeStack.Screen name="BookingAddress" component={BookingAddressScreen} />
      <HomeStack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <HomeStack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
    </HomeStack.Navigator>
  );
}

// Bookings Stack Navigator
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();

function BookingsNavigator() {
  return (
    <BookingsStack.Navigator>
      <BookingsStack.Screen name="BookingList" component={BookingListScreen} />
      <BookingsStack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <BookingsStack.Screen 
        name="BookingTracking" 
        component={BookingTrackingScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <BookingsStack.Screen name="ReviewWrite" component={ReviewWriteScreen} />
    </BookingsStack.Navigator>
  );
}
```

## Provider App Navigation

```typescript
// Provider app has similar structure with different screens:

export type ProviderMainTabParamList = {
  DashboardTab: undefined;
  BookingsTab: undefined;
  EarningsTab: undefined;
  SettingsTab: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  ActiveBooking: { bookingId: string };
};

export type EarningsStackParamList = {
  Earnings: undefined;
  PayoutRequest: undefined;
  PayoutHistory: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  EditProfile: undefined;
  ServiceSetup: undefined;
  AvailabilitySchedule: undefined;
  BankAccount: undefined;
  Documents: undefined;
};
```

## Admin Web Routes (React Router)

```typescript
// routes/index.tsx

import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'providers', element: <ProvidersPage /> },
      { path: 'providers/pending', element: <PendingProvidersPage /> },
      { path: 'providers/:id', element: <ProviderDetailPage /> },
      { path: 'providers/:id/review', element: <ProviderReviewPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'bookings/active', element: <ActiveBookingsPage /> },
      { path: 'bookings/:id', element: <BookingDetailPage /> },
      { path: 'payouts', element: <PayoutsPage /> },
      { path: 'payouts/pending', element: <PendingPayoutsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'reports/open', element: <OpenReportsPage /> },
      { path: 'reports/:id', element: <ReportDetailPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```
