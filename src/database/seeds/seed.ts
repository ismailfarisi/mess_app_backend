// src/database/seeds/seed.ts
import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';

import { UserRoleSeedService } from './vendor-user.seed';
import { Logger } from '@nestjs/common';
import { SeedService } from './vendor-seed.service';


const logger = new Logger('Seed');
async function bootstrap() {
  
  const app = await NestFactory.create(SeedModule);
  const userRoleSeedService = app.get(SeedService
  );
  logger.log('✅ User and role seeding ');
  try {


    // Then seed users and roles
    
    await userRoleSeedService.seed();
    console.log('✅ User and role seeding completed');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();