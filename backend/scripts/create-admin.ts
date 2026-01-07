import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@bissaugo.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME || 'User';

  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log(`✅ Admin avec l'email ${email} existe déjà`);
      return;
    }

    // Créer l'admin
    const admin = await prisma.adminUser.create({
      data: {
        email,
        password, // En production, devrait être hashé avec bcrypt
        firstName,
        lastName,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Admin créé avec succès !');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${admin.role}`);
    console.log('');
    console.log('⚠️  Note: En production, le mot de passe doit être hashé avec bcrypt');
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
