import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const url = process.env.DATABASE_URL;

  if (url) {
    return {
      type: 'postgres',
      url,
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: { rejectUnauthorized: false },
      installExtensions: true,
      extensions: ['postgis'],
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    synchronize: process.env.NODE_ENV !== 'production',
    ssl: process.env.DB_HOST?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
    installExtensions: true,
    extensions: ['postgis'],
  };
});
