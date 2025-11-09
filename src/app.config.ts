export const corsConfig = {
  development: {
    origin: ['http://localhost:3001'],
    credentials: true,
  },
  production: {
    origin: [
      'https://vendor.habllen.com',
      'https://habllen.com',
      'https://www.habllen.com',
      'https://switeaz.com',
      'https://www.switeaz.com',
      'https://vendor.switeaz.com',
    ],
    credentials: true,
  },
};
