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
        baseDuration: 90,
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
        baseDuration: 90,
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
        baseDuration: 90,
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
        baseDuration: 90,
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
        baseDuration: 90,
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
    update: {
      balance: 4600, // Available for payout (92% of completed bookings)
      totalEarnings: 4600,
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
      // Location: Makati CBD area
      lastLatitude: 14.5547,
      lastLongitude: 121.0244,
      lastLocationAt: new Date(),
      // Promotion bid: High bid for top visibility
      promotionBid: 200,
    },
    create: {
      userId: providerUser.id,
      displayName: 'Maria S.',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
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
      balance: 4600, // Available for payout (92% of completed bookings)
      totalEarnings: 4600,
      // Location: Makati CBD area
      lastLatitude: 14.5547,
      lastLongitude: 121.0244,
      lastLocationAt: new Date(),
      // Promotion bid: High bid for top visibility
      promotionBid: 200,
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
  // TEST SHOP OWNER
  // =========================================================================

  const shopOwnerPassword = await bcrypt.hash('shopowner123!', 12);

  const shopOwner = await prisma.user.upsert({
    where: { email: 'shopowner@test.com' },
    update: {},
    create: {
      email: 'shopowner@test.com',
      phone: '+639000000004',
      phoneVerified: true,
      emailVerified: true,
      passwordHash: shopOwnerPassword,
      firstName: 'Shop',
      lastName: 'Owner',
      role: 'SHOP_OWNER',
    },
  });

  const shop = await prisma.shop.upsert({
    where: { ownerId: shopOwner.id },
    update: {},
    create: {
      ownerId: shopOwner.id,
      name: 'Serenity Spa Manila',
      description: 'Premium massage services in Metro Manila. Our trained therapists provide relaxing and rejuvenating experiences.',
      phone: '+639171234568',
      email: 'serenity@masasia.com',
      status: 'APPROVED',
      bankName: 'BDO',
      bankAccountNumber: '001234567890',
      bankAccountName: 'Serenity Spa Manila',
      gcashNumber: '09171234568',
      balance: 15000,
      totalEarnings: 45000,
      approvedAt: new Date(),
    },
  });

  // Note: The test provider (Maria) stays independent - not linked to any shop
  // She earns 92% (Platform 8%, Provider 92%)
  // Shop therapists earn 55% (Platform 8%, Shop 37%, Provider 55%)

  // Create sample bookings for independent provider (Maria) showing 92% earnings
  for (let b = 0; b < 5; b++) {
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 30));

    const amount = [800, 1000, 1100, 1200, 1400][Math.floor(Math.random() * 5)];
    const platformFee = amount * 0.08; // 8% platform
    const providerAmount = amount * 0.92; // 92% provider (independent)

    const bookingNumber = `CMM${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: customer.id,
        providerId: provider.id,
        serviceId: ['svc-thai', 'svc-swedish', 'svc-aroma'][Math.floor(Math.random() * 3)],
        // No shopId - independent provider
        status: 'COMPLETED',
        scheduledAt: bookingDate,
        duration: [60, 90, 120][Math.floor(Math.random() * 3)],
        serviceAmount: amount,
        totalAmount: amount,
        platformFee,
        providerEarning: providerAmount,
        // No shopEarning - independent provider keeps 92%
        addressText: 'Gramercy Residences, Makati',
        latitude: 14.5586,
        longitude: 121.0178,
        completedAt: bookingDate,
      },
    });
  }

  console.log(`✅ Created 5 sample bookings for independent provider (Maria)`);

  // =========================================================================
  // SHOP THERAPISTS (10 therapists with KPI data)
  // =========================================================================

  // Sample therapist photos (professional headshots from Unsplash)
  const therapistPhotos = [
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face', // Anna
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face', // Bella
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face', // Carmen
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face', // Diana
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', // Elena
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face', // Faith
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face', // Grace
    'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face', // Hannah
    'https://images.unsplash.com/photo-1548142813-c348350df52b?w=400&h=400&fit=crop&crop=face', // Isabel
    'https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop&crop=face', // Julia
  ];

  // Therapist locations around Metro Manila
  const therapistLocations = [
    { lat: 14.5505, lng: 121.0455 }, // BGC
    { lat: 14.5567, lng: 121.0234 }, // Makati Salcedo
    { lat: 14.5351, lng: 120.9831 }, // Pasay MOA
    { lat: 14.5876, lng: 121.0614 }, // Ortigas
    { lat: 14.5495, lng: 121.0508 }, // BGC High Street
    { lat: 14.5615, lng: 121.0170 }, // Makati Legaspi
    { lat: 14.5547, lng: 121.0244 }, // Makati CBD
    { lat: 14.5430, lng: 121.0510 }, // BGC Market Market
    { lat: 14.5580, lng: 121.0200 }, // Makati Ayala
    { lat: 14.5660, lng: 121.0300 }, // Makati Rockwell
  ];

  const therapistData = [
    { firstName: 'Anna', lastName: 'Santos', rating: 4.9, bookings: 87, earnings: 78300, thisMonth: 12500, photo: therapistPhotos[0], promotionBid: 500, location: therapistLocations[0] },
    { firstName: 'Bella', lastName: 'Cruz', rating: 4.7, bookings: 65, earnings: 58500, thisMonth: 9800, photo: therapistPhotos[1], promotionBid: 100, location: therapistLocations[1] },
    { firstName: 'Carmen', lastName: 'Reyes', rating: 4.8, bookings: 72, earnings: 64800, thisMonth: 11200, photo: therapistPhotos[2], promotionBid: 200, location: therapistLocations[2] },
    { firstName: 'Diana', lastName: 'Garcia', rating: 4.6, bookings: 45, earnings: 40500, thisMonth: 7500, photo: therapistPhotos[3], promotionBid: 0, location: therapistLocations[3] },
    { firstName: 'Elena', lastName: 'Lopez', rating: 4.5, bookings: 38, earnings: 34200, thisMonth: 6200, photo: therapistPhotos[4], promotionBid: 50, location: therapistLocations[4] },
    { firstName: 'Faith', lastName: 'Mendoza', rating: 4.9, bookings: 92, earnings: 82800, thisMonth: 14500, photo: therapistPhotos[5], promotionBid: 300, location: therapistLocations[5] },
    { firstName: 'Grace', lastName: 'Torres', rating: 4.4, bookings: 28, earnings: 25200, thisMonth: 4800, photo: therapistPhotos[6], promotionBid: 0, location: therapistLocations[6] },
    { firstName: 'Hannah', lastName: 'Flores', rating: 4.7, bookings: 56, earnings: 50400, thisMonth: 8900, photo: therapistPhotos[7], promotionBid: 100, location: therapistLocations[7] },
    { firstName: 'Isabel', lastName: 'Rivera', rating: 4.8, bookings: 68, earnings: 61200, thisMonth: 10500, photo: therapistPhotos[8], promotionBid: 150, location: therapistLocations[8] },
    { firstName: 'Julia', lastName: 'Dela Cruz', rating: 4.3, bookings: 22, earnings: 19800, thisMonth: 3200, photo: therapistPhotos[9], promotionBid: 0, location: therapistLocations[9] },
  ];

  const shopTherapists = [];

  for (let i = 0; i < therapistData.length; i++) {
    const t = therapistData[i];
    const email = `therapist${i + 1}@test.com`;
    const phone = `+6390000001${i.toString().padStart(2, '0')}`;

    const therapistUser = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        phone,
        phoneVerified: true,
        emailVerified: true,
        passwordHash: shopOwnerPassword, // Same password for testing
        firstName: t.firstName,
        lastName: t.lastName,
        role: 'PROVIDER',
        gender: 'FEMALE',
      },
    });

    const therapist = await prisma.provider.upsert({
      where: { userId: therapistUser.id },
      update: {
        photoUrl: t.photo,
        lastLatitude: t.location.lat,
        lastLongitude: t.location.lng,
        lastLocationAt: new Date(),
        promotionBid: t.promotionBid,
      },
      create: {
        userId: therapistUser.id,
        shopId: shop.id,
        displayName: `${t.firstName} ${t.lastName.charAt(0)}.`,
        photoUrl: t.photo,
        bio: `Professional massage therapist specializing in relaxation and therapeutic massage.`,
        yearsOfExperience: Math.floor(Math.random() * 8) + 2,
        status: 'APPROVED',
        onlineStatus: i < 5 ? 'ONLINE' : 'OFFLINE',
        rating: t.rating,
        totalRatings: Math.floor(t.bookings * 0.7),
        completedBookings: t.bookings,
        serviceAreas: ['makati', 'bgc', 'pasay'],
        maxTravelDistance: 10,
        gcashNumber: `0917${Math.floor(1000000 + Math.random() * 9000000)}`,
        approvedAt: new Date(),
        // Location
        lastLatitude: t.location.lat,
        lastLongitude: t.location.lng,
        lastLocationAt: new Date(),
        // Promotion bid for visibility ranking
        promotionBid: t.promotionBid,
      },
    });

    // Add services for each therapist
    await Promise.all([
      prisma.providerService.upsert({
        where: { providerId_serviceId: { providerId: therapist.id, serviceId: 'svc-thai' } },
        update: {},
        create: {
          providerId: therapist.id,
          serviceId: 'svc-thai',
          price60: 800,
          price90: 1100,
          price120: 1400,
        },
      }),
      prisma.providerService.upsert({
        where: { providerId_serviceId: { providerId: therapist.id, serviceId: 'svc-swedish' } },
        update: {},
        create: {
          providerId: therapist.id,
          serviceId: 'svc-swedish',
          price60: 1000,
          price90: 1400,
          price120: 1800,
        },
      }),
    ]);

    // Create completed bookings with earnings for KPI
    const bookingsToCreate = Math.min(t.bookings, 10); // Create up to 10 sample bookings
    for (let b = 0; b < bookingsToCreate; b++) {
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 30));

      const amount = [800, 1000, 1100, 1200, 1400][Math.floor(Math.random() * 5)];
      const platformFee = amount * 0.08; // 8% platform
      const shopFee = amount * 0.37; // 37% shop
      const providerAmount = amount * 0.55; // 55% provider

      const bookingNumber = `CMM${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await prisma.booking.create({
        data: {
          bookingNumber,
          customerId: customer.id,
          providerId: therapist.id,
          serviceId: ['svc-thai', 'svc-swedish'][Math.floor(Math.random() * 2)],
          shopId: shop.id,
          status: 'COMPLETED',
          scheduledAt: bookingDate,
          duration: [60, 90, 120][Math.floor(Math.random() * 3)],
          serviceAmount: amount,
          totalAmount: amount,
          platformFee,
          providerEarning: providerAmount,
          shopEarning: shopFee,
          addressText: 'Gramercy Residences, Makati',
          latitude: 14.5586,
          longitude: 121.0178,
          completedAt: bookingDate,
        },
      });
    }

    shopTherapists.push(therapist);
  }

  // Update shop totals
  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      balance: 45000,
      totalEarnings: 185000,
    },
  });

  console.log(`✅ Created ${shopTherapists.length} shop therapists with KPI data`);
  console.log(`✅ Created shop owner: ${shopOwner.email}`);
  console.log(`✅ Created shop: ${shop.name}`);

  // =========================================================================
  // APP CONFIG
  // =========================================================================

  const configs = [
    { key: 'platform_fee_percentage', value: '8', type: 'number' },
    { key: 'shop_fee_percentage', value: '37', type: 'number' },
    { key: 'provider_shop_percentage', value: '55', type: 'number' },
    { key: 'provider_independent_percentage', value: '92', type: 'number' },
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
  console.log('   Admin:      admin@masasia.com / admin123!');
  console.log('   Customer:   customer@test.com / customer123!');
  console.log('   Provider:   provider@test.com / provider123!');
  console.log('   Shop Owner: shopowner@test.com / shopowner123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
