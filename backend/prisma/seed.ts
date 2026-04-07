import { PrismaClient, Channel, Environment, NotificationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Reset existing data
  await prisma.notification.deleteMany();
  await prisma.template.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@notifyflow.dev',
      passwordHash,
    },
  });

  // Create API keys
  const liveKeyStr = crypto.randomBytes(8).toString('hex');
  const liveKeyPrefix = `nf_live_${liveKeyStr.substring(0, 4)}`;
  const liveKeyHash = await bcrypt.hash(`nf_live_${liveKeyStr}`, 12);

  const keyLive = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'Production Key',
      keyHash: liveKeyHash,
      prefix: liveKeyPrefix,
      environment: Environment.live,
    },
  });

  const testKeyStr = crypto.randomBytes(8).toString('hex');
  const testKeyPrefix = `nf_test_${testKeyStr.substring(0, 4)}`;
  const testKeyHash = await bcrypt.hash(`nf_test_${testKeyStr}`, 12);

  const keyTest = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'Development Key',
      keyHash: testKeyHash,
      prefix: testKeyPrefix,
      environment: Environment.test,
    },
  });

  // Create templates
  const templateWelcome = await prisma.template.create({
    data: {
      userId: user.id,
      name: 'Welcome Email',
      channel: Channel.email,
      subject: 'Welcome to our platform, {{name}}!',
      body: 'Hi {{name}},\\n\\nThanks for signing up.',
      variables: ['name'],
    },
  });

  const templateReset = await prisma.template.create({
    data: {
      userId: user.id,
      name: 'Password Reset',
      channel: Channel.email,
      subject: 'Password Reset Request',
      body: 'Click here to reset: {{link}}',
      variables: ['link'],
    },
  });

  const templateOTP = await prisma.template.create({
    data: {
      userId: user.id,
      name: 'OTP SMS',
      channel: Channel.sms,
      body: 'Your OTP code is {{code}}.',
      variables: ['code'],
    },
  });

  // Create 50 sample notifications across 30 days
  for (let i = 0; i < 50; i++) {
    const channels = Object.values(Channel);
    const statuses = Object.values(NotificationStatus);
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    let recipient = 'user@example.com';
    if (channel === Channel.sms) recipient = '+1555010' + Math.floor(Math.random() * 999);
    if (channel === Channel.inapp) recipient = 'user_' + Math.floor(Math.random() * 1000);

    const isDelivered = status === NotificationStatus.delivered;

    await prisma.notification.create({
      data: {
        userId: user.id,
        apiKeyId: Math.random() > 0.5 ? keyLive.id : keyTest.id,
        channel,
        recipient,
        subject: channel === Channel.email ? 'Sample Notification' : null,
        body: 'This is a sample generated for the dashboard.',
        status,
        latencyMs: isDelivered ? Math.floor(Math.random() * 1500) + 100 : null,
        sentAt: isDelivered ? date : null,
        createdAt: date,
        updatedAt: date,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
