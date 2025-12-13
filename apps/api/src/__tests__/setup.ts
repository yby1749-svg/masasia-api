import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});
