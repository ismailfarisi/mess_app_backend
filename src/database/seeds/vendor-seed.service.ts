// src/database/seeds/seed.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ROLE_METADATA, ROLES } from 'src/auth/constants/roles.contant';


@Injectable()
export class SeedService {
  constructor(private dataSource: DataSource) {}

  async seed() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // First seed roles
      console.log('🌱 Seeding roles...');
      await this.seedRoles(queryRunner);

      // Then seed vendors
      console.log('🌱 Seeding vendors...');
      await this.seedVendors(queryRunner);

      await queryRunner.commitTransaction();
      console.log('✅ Seeding completed successfully');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async seedRoles(queryRunner: any) {
    // Insert roles
    for (const [key, metadata] of Object.entries(ROLE_METADATA)) {
      await queryRunner.query(
        `
        INSERT INTO roles (name, description, metadata)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE 
        SET description = $2, metadata = $3
        RETURNING id;
        `,
        [metadata.name, metadata.description, metadata]
      );
    }
    console.log('✅ Roles seeded successfully');
  }

  private async seedVendors(queryRunner: any) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const vendorRole = await queryRunner.query(
      `SELECT id FROM roles WHERE name = $1`,
      [ROLES.VENDOR]
    );

    if (!vendorRole || vendorRole.length === 0) {
      throw new Error('Vendor role not found');
    }

    const vendorRoleId = vendorRole[0].id;

    const vendors = [
      {
        name: 'Al Arabiya Restaurant',
        email: 'contact@alarabiya.ae',
        password: hashedPassword,
        businessName: 'Al Arabiya Restaurant LLC',
        address: 'Shop 12, Al Wasl Road, Jumeirah 1, Dubai',
        phone: '+971-4-123-4567',
        isVerified: true,
        rating: 4.8,
        totalRatings: 1256,
        profilePhotoUrl: 'https://storage.vendor.com/al-arabiya-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/al-arabiya-cover.jpg',
        cuisineTypes: ['Emirati', 'Lebanese', 'Arabic'],
        foodTypes: ['Non-Veg', 'Veg'],
        businessHours: {
          monday: { open: '10:00', close: '00:00' },
          tuesday: { open: '10:00', close: '00:00' },
          wednesday: { open: '10:00', close: '00:00' },
          thursday: { open: '10:00', close: '01:00' },
          friday: { open: '13:00', close: '01:00' },
          saturday: { open: '10:00', close: '00:00' },
          sunday: { open: '10:00', close: '00:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2708, 25.2084), 4326)`,
        serviceRadius: 10,
        description: 'Authentic Emirati and Arab cuisine in the heart of Dubai',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.7,
        averageDeliveryTime: 30,
        minimumOrderAmount: 50,
      },
      // Add other vendors here...
    ];

    for (const vendorData of vendors) {
      try {
        // Create user first
        const userResult = await queryRunner.query(
          `
          INSERT INTO "user" (name, email, phone, password)
          VALUES ($1, $2, $3, $4)
          RETURNING id;
          `,
          [vendorData.name, vendorData.email, vendorData.phone, vendorData.password]
        );

        const userId = userResult[0].id;

        // Assign vendor role
        await queryRunner.query(
          `
          INSERT INTO user_roles ("userId", "roleId", "isActive")
          VALUES ($1, $2, true);
          `,
          [userId, vendorRoleId]
        );

        // Create vendor profile
        await queryRunner.query(
          `
          INSERT INTO vendors (
            "userId", "businessName", address, rating, "totalRatings",
            "profilePhotoUrl", "coverPhotoUrl", "cuisineTypes", "foodTypes",
            "businessHours", "isOpen", location, "serviceRadius",
            description, "acceptedPaymentMethods", "deliveryRating",
            "averageDeliveryTime", "minimumOrderAmount"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            ${vendorData.location()}, $12, $13, $14, $15, $16, $17
          );
          `,
          [
            userId,
            vendorData.businessName,
            vendorData.address,
            vendorData.rating,
            vendorData.totalRatings,
            vendorData.profilePhotoUrl,
            vendorData.coverPhotoUrl,
            vendorData.cuisineTypes,
            vendorData.foodTypes,
            vendorData.businessHours,
            true, // isOpen
            vendorData.serviceRadius,
            vendorData.description,
            vendorData.acceptedPaymentMethods,
            vendorData.deliveryRating,
            vendorData.averageDeliveryTime,
            vendorData.minimumOrderAmount,
          ]
        );

        console.log(`✅ Created vendor: ${vendorData.businessName}`);
      } catch (error) {
        console.error(`❌ Failed to create vendor ${vendorData.businessName}:`, error);
        throw error;
      }
    }
  }
}