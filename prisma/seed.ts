import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.deliveryLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationChannel.deleteMany();
  await prisma.event.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create seed user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@notification-hub.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  console.log('Created user:', user);

  // Create seed project
  const project = await prisma.project.create({
    data: {
      name: 'Default Project',
      description: 'Default project for testing',
      userId: user.id,
      apiKey: 'test-api-key-12345',
      rateLimit: 1000,
      rateLimitWindow: 3600,
    },
  });

  console.log('Created project:', project);

  const apiKey = await prisma.apiKey.create({
    data: {
      key: 'test-managed-api-key-12345',
      userId: user.id,
      projectId: project.id,
      name: 'Default ingest key',
      scopes: ['events:ingest'],
      rateLimit: 1000,
      rateLimitWindow: 3600,
    },
  });

  console.log('Created API key:', apiKey);

  // Create notification channels
  const emailChannel = await prisma.notificationChannel.create({
    data: {
      projectId: project.id,
      type: 'EMAIL',
      name: 'Email Channel',
      config: {
        to: 'alerts@notification-hub.com',
        provider: 'smtp',
        from: 'noreply@notification-hub.com',
      },
    },
  });

  const telegramChannel = await prisma.notificationChannel.create({
    data: {
      projectId: project.id,
      type: 'TELEGRAM',
      name: 'Telegram Channel',
      config: {
        chatId: '@notification_hub_alerts',
        botToken: process.env.TELEGRAM_BOT_TOKEN || 'test-token',
      },
    },
  });

  const webhookChannel = await prisma.notificationChannel.create({
    data: {
      projectId: project.id,
      type: 'WEBHOOK',
      name: 'Webhook Channel',
      config: {
        url: 'https://example.com/webhook',
        headers: {},
      },
    },
  });

  console.log('Created channels:', {
    emailChannel,
    telegramChannel,
    webhookChannel,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed successfully');
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
