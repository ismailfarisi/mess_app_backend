import { SeedModule } from './seed.module';
import { CommandFactory } from 'nest-commander';

async function bootstrap() {
  await CommandFactory.run(SeedModule, ['warn']);
}

bootstrap();
