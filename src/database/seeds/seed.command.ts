// import { Command, CommandRunner } from 'nest-commander';
// import { DataSource } from 'typeorm';
// import { Injectable } from '@nestjs/common';
// import { seedVendors } from './vendor.seed';

// @Injectable()
// @Command({ name: 'seed', description: 'Seed the database with initial data' })
// export class SeedCommand extends CommandRunner {
//   constructor(private readonly dataSource: DataSource) {
//     super();
//   }

//   async run(): Promise<void> {
//     try {
//       await seedVendors(this.dataSource);
//       console.log('Database seeding completed successfully');
//     } catch (error) {
//       console.error('Error seeding database:', error);
//       process.exit(1);
//     }
//   }
// }
