import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeedModule } from './seed.module';
import { VendorSeedService } from './vendor-seed.service';

const logger = new Logger('Seed');

async function bootstrap() {
  const app = await NestFactory.create(SeedModule);
  const seedService = app.get(VendorSeedService);

  try {
    await seedService.seed();
    logger.debug('Seeding complete!');
  } catch (error) {
    logger.error('Seeding failed!', error);
  } finally {
    await app.close();
  }
}

bootstrap();
