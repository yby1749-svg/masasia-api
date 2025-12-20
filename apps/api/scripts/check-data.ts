import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  const provider = await prisma.provider.findFirst({
    where: { user: { email: 'provider@test.com' } },
    include: { user: true, services: true }
  });

  console.log('Provider:', provider?.id);
  console.log('User:', provider?.user?.email);
  console.log('Services:', provider?.services?.length);
  provider?.services?.forEach(s => {
    console.log('  -', s.id, s.name);
  });

  // Check all services
  const allServices = await prisma.service.findMany({ take: 5 });
  console.log('\nAll services:');
  allServices.forEach(s => {
    console.log('  -', s.id, s.name, 'provider:', s.providerId);
  });

  await prisma.$disconnect();
}

checkData();
