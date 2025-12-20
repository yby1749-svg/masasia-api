import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createScheduleBookings() {
  // Get provider and customer
  const provider = await prisma.provider.findFirst({
    where: { user: { email: 'provider@test.com' } },
    include: { user: true, services: true }
  });

  const customer = await prisma.user.findFirst({
    where: { email: 'customer@test.com' }
  });

  if (!provider || !customer) {
    console.log('Provider or customer not found');
    return;
  }

  // Get a service - prefer one with a name
  let service = provider.services.find(s => s.name);
  if (!service) {
    // Fallback to any global service
    service = await prisma.service.findFirst({
      where: { name: { not: undefined } }
    }) as any;
  }
  if (!service) {
    console.log('No service found');
    return;
  }

  console.log('Provider:', provider.user.firstName, provider.user.lastName);
  console.log('Customer:', customer.firstName, customer.lastName);
  console.log('Service:', service.id, service.name);

  // Generate booking number
  let counter = 0;
  const generateBookingNumber = () => {
    counter++;
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BK${timestamp}${random}${counter}`;
  };

  // Create bookings for this week
  const now = new Date();
  const bookings: any[] = [];

  // Today - 2 bookings
  const today1 = new Date(now);
  today1.setHours(10, 0, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'ACCEPTED',
    scheduledAt: today1,
    duration: 60,
    serviceAmount: 500,
    totalAmount: 500,
    platformFee: 50,
    providerEarning: 450,
    latitude: 14.5995,
    longitude: 120.9842,
    addressText: '123 Makati Ave, Makati City',
  });

  const today2 = new Date(now);
  today2.setHours(14, 30, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'PENDING',
    scheduledAt: today2,
    duration: 90,
    serviceAmount: 750,
    totalAmount: 750,
    platformFee: 75,
    providerEarning: 675,
    latitude: 14.5547,
    longitude: 121.0244,
    addressText: '456 BGC Taguig',
  });

  // Tomorrow - 1 booking
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'ACCEPTED',
    scheduledAt: tomorrow,
    duration: 60,
    serviceAmount: 500,
    totalAmount: 500,
    platformFee: 50,
    providerEarning: 450,
    latitude: 14.6091,
    longitude: 121.0223,
    addressText: '789 Ortigas Center',
  });

  // Day after tomorrow - 2 bookings
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(9, 0, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'PENDING',
    scheduledAt: dayAfter,
    duration: 120,
    serviceAmount: 1000,
    totalAmount: 1000,
    platformFee: 100,
    providerEarning: 900,
    latitude: 14.5764,
    longitude: 121.0851,
    addressText: '321 Eastwood City',
  });

  const dayAfter2 = new Date(now);
  dayAfter2.setDate(dayAfter2.getDate() + 2);
  dayAfter2.setHours(15, 0, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'ACCEPTED',
    scheduledAt: dayAfter2,
    duration: 60,
    serviceAmount: 500,
    totalAmount: 500,
    platformFee: 50,
    providerEarning: 450,
    latitude: 14.5378,
    longitude: 121.0014,
    addressText: '654 Pasig City',
  });

  // History - completed and cancelled
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'COMPLETED',
    scheduledAt: yesterday,
    duration: 60,
    serviceAmount: 500,
    totalAmount: 500,
    platformFee: 50,
    providerEarning: 450,
    latitude: 14.5995,
    longitude: 120.9842,
    addressText: '111 Completed St',
  });

  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 3);
  lastWeek.setHours(14, 0, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'CANCELLED',
    scheduledAt: lastWeek,
    duration: 90,
    serviceAmount: 750,
    totalAmount: 750,
    platformFee: 75,
    providerEarning: 675,
    latitude: 14.5547,
    longitude: 121.0244,
    addressText: '222 Cancelled Ave',
  });

  const lastWeek2 = new Date(now);
  lastWeek2.setDate(lastWeek2.getDate() - 5);
  lastWeek2.setHours(11, 0, 0, 0);
  bookings.push({
    bookingNumber: generateBookingNumber(),
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    status: 'COMPLETED',
    scheduledAt: lastWeek2,
    duration: 60,
    serviceAmount: 500,
    totalAmount: 500,
    platformFee: 50,
    providerEarning: 450,
    latitude: 14.6091,
    longitude: 121.0223,
    addressText: '333 Done Blvd',
  });

  // Create all bookings
  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
  }

  console.log('\nCreated ' + bookings.length + ' test bookings');
  console.log('\nSchedule:');
  console.log('- Today: 2 bookings (10:00 AM Accepted, 2:30 PM Pending)');
  console.log('- Tomorrow: 1 booking (11:00 AM Accepted)');
  console.log('- Day after: 2 bookings (9:00 AM Pending, 3:00 PM Accepted)');
  console.log('\nHistory:');
  console.log('- Yesterday: 1 Completed');
  console.log('- 3 days ago: 1 Cancelled');
  console.log('- 5 days ago: 1 Completed');
}

createScheduleBookings()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
