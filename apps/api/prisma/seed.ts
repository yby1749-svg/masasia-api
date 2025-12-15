// ============================================================================
// Database Seed
// ============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // =========================================================================
  // SERVICES
  // =========================================================================
  
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'svc-thai' },
      update: {},
      create: {
        id: 'svc-thai',
        name: 'Thai Massage',
        nameKo: '타이 마사지',
        description: 'Traditional Thai massage with stretching and pressure point techniques',
        descriptionKo: '스트레칭과 지압 기법을 활용한 전통 타이 마사지',
        category: 'THAI_MASSAGE',
        baseDuration: 60,
        basePrice: 800,
        sortOrder: 1,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-aroma' },
      update: {},
      create: {
        id: 'svc-aroma',
        name: 'Aromatherapy Massage',
        nameKo: '아로마 마사지',
        description: 'Relaxing massage with essential oils for stress relief',
        descriptionKo: '에센셜 오일을 사용한 스트레스 해소 마사지',
        category: 'AROMA_MASSAGE',
        baseDuration: 60,
        basePrice: 1000,
        sortOrder: 2,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-swedish' },
      update: {},
      create: {
        id: 'svc-swedish',
        name: 'Swedish Massage',
        nameKo: '스웨디시 마사지',
        description: 'Classic relaxation massage with long flowing strokes',
        descriptionKo: '긴 스트로크의 클래식 릴렉스 마사지',
        category: 'SWEDISH_MASSAGE',
        baseDuration: 60,
        basePrice: 1000,
        sortOrder: 3,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-deep' },
      update: {},
      create: {
        id: 'svc-deep',
        name: 'Deep Tissue Massage',
        nameKo: '딥티슈 마사지',
        description: 'Intense massage targeting deep muscle layers',
        descriptionKo: '깊은 근육층을 타겟으로 하는 강도 높은 마사지',
        category: 'DEEP_TISSUE',
        baseDuration: 60,
        basePrice: 1200,
        sortOrder: 4,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-scrub' },
      update: {},
      create: {
        id: 'svc-scrub',
        name: 'Body Scrub',
        nameKo: '바디 스크럽',
        description: 'Exfoliating body treatment for smooth skin',
        descriptionKo: '매끄러운 피부를 위한 각질 제거 트리트먼트',
        category: 'BODY_SCRUB',
        baseDuration: 60,
        basePrice: 1000,
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

  // =========================================================================
  // SERVICE AREAS
  // =========================================================================

  const areas = await Promise.all([
    prisma.serviceArea.upsert({
      where: { name: 'makati' },
      update: {},
      create: {
        name: 'makati',
        displayName: 'Makati',
        centerLat: 14.5547,
        centerLng: 121.0244,
        radius: 5,
        baseTravelFee: 0,
        sortOrder: 1,
      },
    }),
    prisma.serviceArea.upsert({
      where: { name: 'bgc' },
      update: {},
      create: {
        name: 'bgc',
        displayName: 'BGC (Bonifacio Global City)',
        centerLat: 14.5505,
        centerLng: 121.0455,
        radius: 3,
        baseTravelFee: 0,
        sortOrder: 2,
      },
    }),
    prisma.serviceArea.upsert({
      where: { name: 'pasay' },
      update: {},
      create: {
        name: 'pasay',
        displayName: 'Pasay (Mall of Asia Area)',
        centerLat: 14.5351,
        centerLng: 120.9831,
        radius: 4,
        baseTravelFee: 100,
        sortOrder: 3,
      },
    }),
    prisma.serviceArea.upsert({
      where: { name: 'ortigas' },
      update: {},
      create: {
        name: 'ortigas',
        displayName: 'Ortigas Center',
        centerLat: 14.5876,
        centerLng: 121.0614,
        radius: 4,
        baseTravelFee: 100,
        sortOrder: 4,
      },
    }),
    prisma.serviceArea.upsert({
      where: { name: 'quezon-city' },
      update: {},
      create: {
        name: 'quezon-city',
        displayName: 'Quezon City',
        centerLat: 14.6760,
        centerLng: 121.0437,
        radius: 8,
        baseTravelFee: 150,
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`✅ Created ${areas.length} service areas`);

  // =========================================================================
  // ADMIN USER
  // =========================================================================

  const adminPassword = await bcrypt.hash('admin123!', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@masasia.com' },
    update: {},
    create: {
      email: 'admin@masasia.com',
      phone: '+639000000001',
      phoneVerified: true,
      emailVerified: true,
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // =========================================================================
  // TEST CUSTOMER
  // =========================================================================

  const customerPassword = await bcrypt.hash('customer123!', 12);
  
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      phone: '+639000000002',
      phoneVerified: true,
      emailVerified: true,
      passwordHash: customerPassword,
      firstName: 'John',
      lastName: 'Customer',
      role: 'CUSTOMER',
    },
  });

  // Customer address
  await prisma.address.upsert({
    where: { id: 'addr-customer-1' },
    update: {},
    create: {
      id: 'addr-customer-1',
      userId: customer.id,
      label: 'Home',
      addressLine1: 'Gramercy Residences',
      addressLine2: 'Unit 2345',
      city: 'Makati',
      latitude: 14.5586,
      longitude: 121.0178,
      isDefault: true,
      notes: 'Ring doorbell twice',
    },
  });

  console.log(`✅ Created test customer: ${customer.email}`);

  // =========================================================================
  // TEST PROVIDER
  // =========================================================================

  const providerPassword = await bcrypt.hash('provider123!', 12);
  
  const providerUser = await prisma.user.upsert({
    where: { email: 'provider@test.com' },
    update: {},
    create: {
      email: 'provider@test.com',
      phone: '+639000000003',
      phoneVerified: true,
      emailVerified: true,
      passwordHash: providerPassword,
      firstName: 'Maria',
      lastName: 'Provider',
      role: 'PROVIDER',
      gender: 'FEMALE',
    },
  });

  const provider = await prisma.provider.upsert({
    where: { userId: providerUser.id },
    update: {},
    create: {
      userId: providerUser.id,
      displayName: 'Maria S.',
      bio: 'Certified massage therapist with 5 years of experience. Specializing in Thai and Swedish massage.',
      yearsOfExperience: 5,
      status: 'APPROVED',
      onlineStatus: 'OFFLINE',
      rating: 4.8,
      totalRatings: 45,
      completedBookings: 52,
      serviceAreas: ['makati', 'bgc', 'pasay'],
      maxTravelDistance: 10,
      gcashNumber: '09171234567',
      approvedAt: new Date(),
    },
  });

  // Provider services
  await Promise.all([
    prisma.providerService.upsert({
      where: { providerId_serviceId: { providerId: provider.id, serviceId: 'svc-thai' } },
      update: {},
      create: {
        providerId: provider.id,
        serviceId: 'svc-thai',
        price60: 800,
        price90: 1100,
        price120: 1400,
      },
    }),
    prisma.providerService.upsert({
      where: { providerId_serviceId: { providerId: provider.id, serviceId: 'svc-aroma' } },
      update: {},
      create: {
        providerId: provider.id,
        serviceId: 'svc-aroma',
        price60: 1000,
        price90: 1400,
        price120: 1800,
      },
    }),
    prisma.providerService.upsert({
      where: { providerId_serviceId: { providerId: provider.id, serviceId: 'svc-swedish' } },
      update: {},
      create: {
        providerId: provider.id,
        serviceId: 'svc-swedish',
        price60: 1000,
        price90: 1400,
        price120: 1800,
      },
    }),
  ]);

  // Provider availability (Mon-Sat 9am-9pm)
  for (let day = 1; day <= 6; day++) {
    await prisma.providerAvailability.upsert({
      where: { providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: day } },
      update: {},
      create: {
        providerId: provider.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '21:00',
        isAvailable: true,
      },
    });
  }

  console.log(`✅ Created test provider: ${providerUser.email}`);

  // =========================================================================
  // APP CONFIG
  // =========================================================================

  const configs = [
    { key: 'platform_fee_percentage', value: '20', type: 'number' },
    { key: 'early_bird_fee_percentage', value: '15', type: 'number' },
    { key: 'min_booking_hours_advance', value: '2', type: 'number' },
    { key: 'max_booking_days_advance', value: '14', type: 'number' },
    { key: 'booking_accept_timeout_seconds', value: '30', type: 'number' },
    { key: 'cancellation_full_refund_hours', value: '24', type: 'number' },
    { key: 'cancellation_partial_refund_hours', value: '12', type: 'number' },
    { key: 'cancellation_partial_refund_percentage', value: '70', type: 'number' },
    { key: 'min_payout_amount', value: '500', type: 'number' },
    { key: 'support_email', value: 'support@masasia.com', type: 'string' },
    { key: 'support_phone', value: '+639171234567', type: 'string' },
  ];

  for (const config of configs) {
    await prisma.appConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log(`✅ Created ${configs.length} app configs`);

  // =========================================================================
  // SAMPLE PROMOTION
  // =========================================================================

  await prisma.promotion.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      code: 'WELCOME20',
      name: 'Welcome Discount',
      description: '20% off your first booking',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscount: 500,
      minOrderAmount: 800,
      maxUsagePerUser: 1,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  });

  await prisma.promotion.upsert({
    where: { code: 'FLAT100' },
    update: {},
    create: {
      code: 'FLAT100',
      name: 'Flat ₱100 Off',
      description: '₱100 off orders above ₱1,000',
      discountType: 'FIXED',
      discountValue: 100,
      minOrderAmount: 1000,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('✅ Created promotions');

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin:    admin@masasia.com / admin123!');
  console.log('   Customer: customer@test.com / customer123!');
  console.log('   Provider: provider@test.com / provider123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
