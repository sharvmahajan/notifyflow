import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    where: { channel: 'email' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log(JSON.stringify(notifications, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
