import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole, UserStatus, AuthProvider } from '../user/users.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const dbUrl = process.env.DATABASE_URL || '';
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: (() => {
      // Remove sslmode parameter from connection string - we'll handle SSL via config
      let cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]*/g, '');
      cleanUrl = cleanUrl.replace(/[?&]$/, '');
      return cleanUrl;
    })(),
    entities: [UserEntity],
    synchronize: false,
    ssl: (() => {
      // Local development - disable SSL for localhost
      if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
        return false;
      }
      // Production/Live database - enable SSL with self-signed certificate support
      return {
        rejectUnauthorized: false,
      };
    })(),
  });

  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    const userRepository = dataSource.getRepository(UserEntity);

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@ainexus.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping...');
    } else {
      // Create Admin User
      const adminPassword = await bcrypt.hash('Admin@123', 10);
      const now = new Date();
      const admin = userRepository.create({
        username: 'admin',
        firstname: 'Admin',
        lastname: 'User',
        email: 'admin@ainexus.com',
        password: adminPassword,
        authProvider: AuthProvider.LOCAL,
        role: UserRole.Admin,
        status: UserStatus.Active,
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
        resetToken: null,
        resetTokenExpires: null,
        createdAt: now,
        updatedAt: now,
      });

      await userRepository.save(admin);
      console.log('✅ Admin user created successfully');
      console.log('   Email: admin@ainexus.com');
      console.log('   Password: Admin@123');
    }

    // Check if regular user already exists
    const existingUser = await userRepository.findOne({
      where: { email: 'user@ainexus.com' },
    });

    if (existingUser) {
      console.log('Regular user already exists. Skipping...');
    } else {
      // Create Regular User
      const userPassword = await bcrypt.hash('User@123', 10);
      const now = new Date();
      const user = userRepository.create({
        username: 'user',
        firstname: 'Test',
        lastname: 'User',
        email: 'user@ainexus.com',
        password: userPassword,
        authProvider: AuthProvider.LOCAL,
        role: UserRole.User,
        status: UserStatus.Active,
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
        resetToken: null,
        resetTokenExpires: null,
        createdAt: now,
        updatedAt: now,
      });

      await userRepository.save(user);
      console.log('✅ Regular user created successfully');
      console.log('   Email: user@ainexus.com');
      console.log('   Password: User@123');
    }

    console.log('\n🎉 Seed completed successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();

