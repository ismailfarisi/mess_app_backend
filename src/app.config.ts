export const corsConfig = {
    development: {
      origin: ['http://localhost:3001'],
      credentials: true,
    },
    production: {
      origin: ['https://yourproductionurl.com'],
      credentials: true,
    },
  };