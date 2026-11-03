const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with v2.0.0 entities...');

  const superAdminPasswordHash = await bcrypt.hash('SuperAdmin123!', 12);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 12);
  const userPasswordHash = await bcrypt.hash('UserPassword123!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@facialsimilarity.ai' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      name: 'Executive Super Admin',
      email: 'superadmin@facialsimilarity.ai',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: new Date(),
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@facialsimilarity.ai' },
    update: { role: 'ADMIN' },
    create: {
      name: 'System Administrator',
      email: 'admin@facialsimilarity.ai',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: new Date(),
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'user@facialsimilarity.ai' },
    update: {},
    create: {
      name: 'Alex Mercer',
      email: 'user@facialsimilarity.ai',
      passwordHash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: new Date(),
    },
  });

  // Seed sample comparison with retained images for demoUser
  const existingComparisons = await prisma.comparison.findMany({ where: { userId: demoUser.id } });
  if (existingComparisons.length === 0) {
    const sampleComp = await prisma.comparison.create({
      data: {
        userId: demoUser.id,
        similarityScore: 88.4,
        rawCosineScore: 0.6214,
        similarityCategory: 'High Similarity',
        modelVersion: 'ArcFace-SFace-r100-v2.4',
        imageQuality: 'Optimal (0.94 / 0.91)',
        processingStatus: 'COMPLETED',
        consentGiven: true,
        hasRetainedImages: true,
        aiDetectionStatus: 'AUTHENTIC',
        metadataJson: JSON.stringify({
          inference_time_ms: 124.5,
          calibrated_explanation: 'Strong biometric facial landmark congruence detected across eye distance, nasal bridge, and lip contours.',
        }),
      },
    });

    // Sample placeholder data URLs for retained images
    const samplePhotoBase64 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%231a0a33"/><circle cx="100" cy="80" r="45" fill="%23a855f7"/><circle cx="85" cy="75" r="5" fill="%23ffffff"/><circle cx="115" cy="75" r="5" fill="%23ffffff"/><ellipse cx="100" cy="100" rx="6" ry="10" fill="%23e9d5ff"/><path d="M 85 115 Q 100 130 115 115" stroke="%23ffffff" stroke-width="3" fill="none"/></svg>';

    await prisma.comparisonImage.createMany({
      data: [
        {
          comparisonId: sampleComp.id,
          userId: demoUser.id,
          slot: 'IMAGE_1',
          storageKey: samplePhotoBase64,
          mimeType: 'image/svg+xml',
        },
        {
          comparisonId: sampleComp.id,
          userId: demoUser.id,
          slot: 'IMAGE_2',
          storageKey: samplePhotoBase64,
          mimeType: 'image/svg+xml',
        },
      ],
    });
  }

  // Seed sample audit log
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: 'SYSTEM_UPGRADE_V2',
      eventType: 'SECURITY',
      severity: 'INFO',
      status: 'SUCCESS',
      details: JSON.stringify({
        message: 'System upgraded to v2.0.0 with high-concurrency worker support and AI detection screening.',
      }),
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
