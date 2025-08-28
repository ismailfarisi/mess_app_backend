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
    for (const [, metadata] of Object.entries(ROLE_METADATA)) {
      await queryRunner.query(
        `
        INSERT INTO roles (name, description, metadata)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE 
        SET description = $2, metadata = $3
        RETURNING id;
        `,
        [metadata.name, metadata.description, metadata],
      );
    }
    console.log('✅ Roles seeded successfully');
  }

  private async seedVendors(queryRunner: any) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const vendorRole = await queryRunner.query(
      `SELECT id FROM roles WHERE name = $1`,
      [ROLES.VENDOR],
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
      {
        name: 'Spice Route Kitchen',
        email: 'contact@spiceroute.ae',
        password: hashedPassword,
        businessName: 'Spice Route Kitchen LLC',
        address: 'Dubai Marina, Block 4, Marina Walk, Dubai',
        phone: '+971-4-987-6543',
        isVerified: true,
        rating: 4.7,
        totalRatings: 987,
        profilePhotoUrl: 'https://storage.vendor.com/spice-route-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/spice-route-cover.jpg',
        cuisineTypes: ['Indian', 'Pakistani', 'Middle Eastern'],
        foodTypes: ['Non-Veg', 'Veg', 'Halal'],
        businessHours: {
          monday: { open: '08:00', close: '23:00' },
          tuesday: { open: '08:00', close: '23:00' },
          wednesday: { open: '08:00', close: '23:00' },
          thursday: { open: '08:00', close: '23:00' },
          friday: { open: '08:00', close: '24:00' },
          saturday: { open: '08:00', close: '24:00' },
          sunday: { open: '09:00', close: '23:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.1369, 25.0772), 4326)`,
        serviceRadius: 12,
        description: 'Authentic Indian and Middle Eastern spices and flavors',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.6,
        averageDeliveryTime: 25,
        minimumOrderAmount: 45,
      },
      {
        name: 'Mediterranean Delights',
        email: 'hello@mediterraneandelights.ae',
        password: hashedPassword,
        businessName: 'Mediterranean Delights Restaurant',
        address: 'JBR - The Beach, Dubai',
        phone: '+971-4-555-7890',
        isVerified: true,
        rating: 4.5,
        totalRatings: 742,
        profilePhotoUrl: 'https://storage.vendor.com/med-delights-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/med-delights-cover.jpg',
        cuisineTypes: ['Mediterranean', 'Greek', 'Turkish'],
        foodTypes: ['Non-Veg', 'Veg', 'Seafood'],
        businessHours: {
          monday: { open: '10:00', close: '22:00' },
          tuesday: { open: '10:00', close: '22:00' },
          wednesday: { open: '10:00', close: '22:00' },
          thursday: { open: '10:00', close: '22:00' },
          friday: { open: '10:00', close: '23:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '22:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.1286, 25.0713), 4326)`,
        serviceRadius: 8,
        description: 'Fresh Mediterranean cuisine with a modern twist',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay'],
        deliveryRating: 4.4,
        averageDeliveryTime: 35,
        minimumOrderAmount: 60,
      },
      {
        name: 'Dragon Palace',
        email: 'orders@dragonpalace.ae',
        password: hashedPassword,
        businessName: 'Dragon Palace Chinese Restaurant',
        address: 'Mall of the Emirates, Al Barsha, Dubai',
        phone: '+971-4-333-9999',
        isVerified: true,
        rating: 4.3,
        totalRatings: 1543,
        profilePhotoUrl: 'https://storage.vendor.com/dragon-palace-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/dragon-palace-cover.jpg',
        cuisineTypes: ['Chinese', 'Thai', 'Asian Fusion'],
        foodTypes: ['Non-Veg', 'Veg', 'Seafood'],
        businessHours: {
          monday: { open: '11:00', close: '23:00' },
          tuesday: { open: '11:00', close: '23:00' },
          wednesday: { open: '11:00', close: '23:00' },
          thursday: { open: '11:00', close: '23:00' },
          friday: { open: '11:00', close: '24:00' },
          saturday: { open: '11:00', close: '24:00' },
          sunday: { open: '11:00', close: '23:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2002, 25.1177), 4326)`,
        serviceRadius: 15,
        description: 'Authentic Chinese cuisine with traditional recipes',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.2,
        averageDeliveryTime: 40,
        minimumOrderAmount: 55,
      },
      {
        name: 'Healthy Bites',
        email: 'info@healthybites.ae',
        password: hashedPassword,
        businessName: 'Healthy Bites Nutrition Center',
        address: 'Business Bay, Bay Avenue, Dubai',
        phone: '+971-4-777-1234',
        isVerified: true,
        rating: 4.6,
        totalRatings: 658,
        profilePhotoUrl: 'https://storage.vendor.com/healthy-bites-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/healthy-bites-cover.jpg',
        cuisineTypes: ['Healthy', 'Organic', 'Protein'],
        foodTypes: ['Veg', 'Vegan', 'Gluten-Free'],
        businessHours: {
          monday: { open: '06:00', close: '20:00' },
          tuesday: { open: '06:00', close: '20:00' },
          wednesday: { open: '06:00', close: '20:00' },
          thursday: { open: '06:00', close: '20:00' },
          friday: { open: '06:00', close: '20:00' },
          saturday: { open: '07:00', close: '20:00' },
          sunday: { open: '07:00', close: '19:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2661, 25.1889), 4326)`,
        serviceRadius: 10,
        description: 'Nutritious and delicious meals for a healthy lifestyle',
        acceptedPaymentMethods: ['card', 'apple_pay', 'google_pay'],
        deliveryRating: 4.7,
        averageDeliveryTime: 20,
        minimumOrderAmount: 35,
      },
      {
        name: 'Burger Kingdom',
        email: 'orders@burgerkingdom.ae',
        password: hashedPassword,
        businessName: 'Burger Kingdom Fast Food',
        address: 'Downtown Dubai, Sheikh Mohammed Bin Rashid Blvd, Dubai',
        phone: '+971-4-444-5678',
        isVerified: true,
        rating: 4.2,
        totalRatings: 2341,
        profilePhotoUrl:
          'https://storage.vendor.com/burger-kingdom-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/burger-kingdom-cover.jpg',
        cuisineTypes: ['American', 'Fast Food', 'Burgers'],
        foodTypes: ['Non-Veg', 'Veg'],
        businessHours: {
          monday: { open: '10:00', close: '24:00' },
          tuesday: { open: '10:00', close: '24:00' },
          wednesday: { open: '10:00', close: '24:00' },
          thursday: { open: '10:00', close: '01:00' },
          friday: { open: '10:00', close: '02:00' },
          saturday: { open: '10:00', close: '02:00' },
          sunday: { open: '10:00', close: '24:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2744, 25.1972), 4326)`,
        serviceRadius: 12,
        description: 'Gourmet burgers and American comfort food',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.1,
        averageDeliveryTime: 15,
        minimumOrderAmount: 25,
      },
      {
        name: 'Pasta & More',
        email: 'contact@pastamore.ae',
        password: hashedPassword,
        businessName: 'Pasta & More Italian Kitchen',
        address: 'City Walk, Al Wasl Road, Dubai',
        phone: '+971-4-888-9012',
        isVerified: true,
        rating: 4.4,
        totalRatings: 876,
        profilePhotoUrl: 'https://storage.vendor.com/pasta-more-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/pasta-more-cover.jpg',
        cuisineTypes: ['Italian', 'European', 'Pizza'],
        foodTypes: ['Non-Veg', 'Veg', 'Seafood'],
        businessHours: {
          monday: { open: '12:00', close: '23:00' },
          tuesday: { open: '12:00', close: '23:00' },
          wednesday: { open: '12:00', close: '23:00' },
          thursday: { open: '12:00', close: '23:00' },
          friday: { open: '12:00', close: '24:00' },
          saturday: { open: '12:00', close: '24:00' },
          sunday: { open: '12:00', close: '23:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2632, 25.2292), 4326)`,
        serviceRadius: 8,
        description: 'Authentic Italian pasta and wood-fired pizzas',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay'],
        deliveryRating: 4.3,
        averageDeliveryTime: 30,
        minimumOrderAmount: 50,
      },
      {
        name: 'Sushi Zen',
        email: 'reservations@sushizen.ae',
        password: hashedPassword,
        businessName: 'Sushi Zen Japanese Restaurant',
        address: 'DIFC, Gate Village 4, Dubai',
        phone: '+971-4-999-8888',
        isVerified: true,
        rating: 4.8,
        totalRatings: 567,
        profilePhotoUrl: 'https://storage.vendor.com/sushi-zen-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/sushi-zen-cover.jpg',
        cuisineTypes: ['Japanese', 'Sushi', 'Asian'],
        foodTypes: ['Non-Veg', 'Seafood', 'Raw'],
        businessHours: {
          monday: { open: '17:00', close: '24:00' },
          tuesday: { open: '17:00', close: '24:00' },
          wednesday: { open: '17:00', close: '24:00' },
          thursday: { open: '17:00', close: '24:00' },
          friday: { open: '17:00', close: '01:00' },
          saturday: { open: '17:00', close: '01:00' },
          sunday: { open: '17:00', close: '23:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2787, 25.2138), 4326)`,
        serviceRadius: 6,
        description: 'Premium sushi and Japanese cuisine experience',
        acceptedPaymentMethods: ['card', 'apple_pay', 'google_pay'],
        deliveryRating: 4.9,
        averageDeliveryTime: 45,
        minimumOrderAmount: 80,
      },
      {
        name: 'Levantine Feast',
        email: 'orders@levantinefeast.ae',
        password: hashedPassword,
        businessName: 'Levantine Feast Restaurant',
        address: 'Jumeirah 1, Beach Road, Dubai',
        phone: '+971-4-666-7777',
        isVerified: true,
        rating: 4.5,
        totalRatings: 934,
        profilePhotoUrl:
          'https://storage.vendor.com/levantine-feast-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/levantine-feast-cover.jpg',
        cuisineTypes: ['Lebanese', 'Syrian', 'Middle Eastern'],
        foodTypes: ['Non-Veg', 'Veg', 'Halal'],
        businessHours: {
          monday: { open: '11:00', close: '23:00' },
          tuesday: { open: '11:00', close: '23:00' },
          wednesday: { open: '11:00', close: '23:00' },
          thursday: { open: '11:00', close: '23:00' },
          friday: { open: '11:00', close: '24:00' },
          saturday: { open: '11:00', close: '24:00' },
          sunday: { open: '11:00', close: '23:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2593, 25.2285), 4326)`,
        serviceRadius: 9,
        description: 'Traditional Levantine dishes with authentic flavors',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.4,
        averageDeliveryTime: 35,
        minimumOrderAmount: 55,
      },
      {
        name: 'Thai Street Food',
        email: 'hello@thaistreet.ae',
        password: hashedPassword,
        businessName: 'Thai Street Food Kitchen',
        address: 'Souk Madinat Jumeirah, Dubai',
        phone: '+971-4-222-3333',
        isVerified: true,
        rating: 4.3,
        totalRatings: 712,
        profilePhotoUrl: 'https://storage.vendor.com/thai-street-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/thai-street-cover.jpg',
        cuisineTypes: ['Thai', 'Southeast Asian', 'Street Food'],
        foodTypes: ['Non-Veg', 'Veg', 'Seafood', 'Spicy'],
        businessHours: {
          monday: { open: '12:00', close: '22:00' },
          tuesday: { open: '12:00', close: '22:00' },
          wednesday: { open: '12:00', close: '22:00' },
          thursday: { open: '12:00', close: '22:00' },
          friday: { open: '12:00', close: '23:00' },
          saturday: { open: '12:00', close: '23:00' },
          sunday: { open: '12:00', close: '22:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.1849, 25.1320), 4326)`,
        serviceRadius: 7,
        description: 'Authentic Thai street food flavors and recipes',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay'],
        deliveryRating: 4.2,
        averageDeliveryTime: 28,
        minimumOrderAmount: 40,
      },
      {
        name: 'Fresh & Green',
        email: 'info@freshgreen.ae',
        password: hashedPassword,
        businessName: 'Fresh & Green Salad Bar',
        address: 'The Dubai Mall, Downtown Dubai',
        phone: '+971-4-111-2222',
        isVerified: true,
        rating: 4.4,
        totalRatings: 523,
        profilePhotoUrl: 'https://storage.vendor.com/fresh-green-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/fresh-green-cover.jpg',
        cuisineTypes: ['Salads', 'Healthy', 'Vegan'],
        foodTypes: ['Veg', 'Vegan', 'Gluten-Free', 'Organic'],
        businessHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '23:00' },
          saturday: { open: '08:00', close: '23:00' },
          sunday: { open: '09:00', close: '22:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2796, 25.1975), 4326)`,
        serviceRadius: 11,
        description: 'Fresh salads and healthy bowls made daily',
        acceptedPaymentMethods: ['card', 'apple_pay', 'google_pay'],
        deliveryRating: 4.5,
        averageDeliveryTime: 18,
        minimumOrderAmount: 30,
      },
      {
        name: 'BBQ Masters',
        email: 'orders@bbqmasters.ae',
        password: hashedPassword,
        businessName: 'BBQ Masters Grill House',
        address: 'Al Karama, Sheikh Khalifa Bin Zayed Road, Dubai',
        phone: '+971-4-555-4444',
        isVerified: true,
        rating: 4.6,
        totalRatings: 1876,
        profilePhotoUrl: 'https://storage.vendor.com/bbq-masters-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/bbq-masters-cover.jpg',
        cuisineTypes: ['BBQ', 'Grilled', 'American'],
        foodTypes: ['Non-Veg', 'Smoked', 'Halal'],
        businessHours: {
          monday: { open: '16:00', close: '24:00' },
          tuesday: { open: '16:00', close: '24:00' },
          wednesday: { open: '16:00', close: '24:00' },
          thursday: { open: '16:00', close: '01:00' },
          friday: { open: '16:00', close: '02:00' },
          saturday: { open: '16:00', close: '02:00' },
          sunday: { open: '16:00', close: '24:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.3061, 25.2467), 4326)`,
        serviceRadius: 13,
        description: 'Slow-smoked BBQ and grilled specialties',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.5,
        averageDeliveryTime: 35,
        minimumOrderAmount: 65,
      },
      {
        name: 'Coffee & Croissant',
        email: 'hello@coffeecroissant.ae',
        password: hashedPassword,
        businessName: 'Coffee & Croissant French Cafe',
        address: 'La Mer, Jumeirah 1, Dubai',
        phone: '+971-4-333-2222',
        isVerified: true,
        rating: 4.5,
        totalRatings: 445,
        profilePhotoUrl:
          'https://storage.vendor.com/coffee-croissant-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/coffee-croissant-cover.jpg',
        cuisineTypes: ['French', 'Cafe', 'Bakery'],
        foodTypes: ['Veg', 'Pastries', 'Coffee'],
        businessHours: {
          monday: { open: '06:00', close: '20:00' },
          tuesday: { open: '06:00', close: '20:00' },
          wednesday: { open: '06:00', close: '20:00' },
          thursday: { open: '06:00', close: '20:00' },
          friday: { open: '06:00', close: '21:00' },
          saturday: { open: '06:00', close: '21:00' },
          sunday: { open: '07:00', close: '20:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2647, 25.2369), 4326)`,
        serviceRadius: 5,
        description: 'French pastries and artisanal coffee',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay'],
        deliveryRating: 4.6,
        averageDeliveryTime: 15,
        minimumOrderAmount: 20,
      },
      {
        name: 'Desert Oasis',
        email: 'info@desertoasis.ae',
        password: hashedPassword,
        businessName: 'Desert Oasis Traditional Kitchen',
        address: 'Al Fahidi Historical Neighbourhood, Dubai',
        phone: '+971-4-888-7777',
        isVerified: true,
        rating: 4.7,
        totalRatings: 389,
        profilePhotoUrl: 'https://storage.vendor.com/desert-oasis-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/desert-oasis-cover.jpg',
        cuisineTypes: ['Emirati', 'Traditional', 'Arabic'],
        foodTypes: ['Non-Veg', 'Veg', 'Halal', 'Traditional'],
        businessHours: {
          monday: { open: '10:00', close: '22:00' },
          tuesday: { open: '10:00', close: '22:00' },
          wednesday: { open: '10:00', close: '22:00' },
          thursday: { open: '10:00', close: '22:00' },
          friday: { open: '10:00', close: '23:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '22:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2972, 25.2631), 4326)`,
        serviceRadius: 8,
        description: 'Traditional Emirati cuisine and cultural dining',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.6,
        averageDeliveryTime: 40,
        minimumOrderAmount: 70,
      },
      {
        name: 'Pizza Corner',
        email: 'orders@pizzacorner.ae',
        password: hashedPassword,
        businessName: 'Pizza Corner Italian Pizzeria',
        address: 'Dubai Hills Mall, Al Khail Road, Dubai',
        phone: '+971-4-777-8888',
        isVerified: true,
        rating: 4.1,
        totalRatings: 1567,
        profilePhotoUrl: 'https://storage.vendor.com/pizza-corner-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/pizza-corner-cover.jpg',
        cuisineTypes: ['Italian', 'Pizza', 'Fast Food'],
        foodTypes: ['Non-Veg', 'Veg', 'Cheese'],
        businessHours: {
          monday: { open: '11:00', close: '23:00' },
          tuesday: { open: '11:00', close: '23:00' },
          wednesday: { open: '11:00', close: '23:00' },
          thursday: { open: '11:00', close: '24:00' },
          friday: { open: '11:00', close: '01:00' },
          saturday: { open: '11:00', close: '01:00' },
          sunday: { open: '11:00', close: '23:00' },
        },
        location: () => `ST_SetSRID(ST_MakePoint(55.2441, 25.1069), 4326)`,
        serviceRadius: 14,
        description: 'Wood-fired pizzas and Italian favorites',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        deliveryRating: 4.0,
        averageDeliveryTime: 22,
        minimumOrderAmount: 35,
      },
    ];

    for (const vendorData of vendors) {
      try {
        // Create user first
        const userResult = await queryRunner.query(
          `
          INSERT INTO "user" (name)
          VALUES ($1)
          RETURNING id;
          `,
          [vendorData.name],
        );

        const userId = userResult[0].id;

        // Create auth record linked to user
        await queryRunner.query(
          `
          INSERT INTO "auth" (email, phone, password, entity_type, entity_id, is_verified)
          VALUES ($1, $2, $3, $4, $5, true);
          `,
          [
            vendorData.email,
            vendorData.phone,
            vendorData.password,
            'user',
            userId,
          ],
        );

        // Assign vendor role
        await queryRunner.query(
          `
          INSERT INTO user_roles ("userId", "roleId", "isActive")
          VALUES ($1, $2, true);
          `,
          [userId, vendorRoleId],
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
          ],
        );

        console.log(`✅ Created vendor: ${vendorData.businessName}`);
      } catch (error) {
        console.error(
          `❌ Failed to create vendor ${vendorData.businessName}:`,
          error,
        );
        throw error;
      }
    }

    // Now seed vendor menus
    console.log('🌱 Seeding vendor menus...');
    await this.seedVendorMenus(queryRunner);

    // Seed admin users
    console.log('🌱 Seeding admin users...');
    await this.seedAdminUsers(queryRunner);

    // Seed regular customers
    console.log('🌱 Seeding customer users...');
    await this.seedCustomerUsers(queryRunner);
  }

  private async seedVendorMenus(queryRunner: any) {
    // Get all vendors to create menus for them
    const vendors = await queryRunner.query(
      `SELECT id, "businessName" FROM vendors`,
    );

    const menuTemplates = [
      // Breakfast Menu Template
      {
        mealType: 'breakfast',
        description: 'Nutritious breakfast options to start your day right',
        price: 25.0,
        weeklyMenu: {
          monday: {
            items: [
              'Scrambled Eggs with Toast',
              'Fresh Fruit Bowl',
              'Arabic Coffee',
            ],
            sideDishes: ['Hash Browns', 'Grilled Tomatoes'],
            extras: ['Extra Toast', 'Fresh Orange Juice'],
          },
          tuesday: {
            items: [
              'Pancakes with Maple Syrup',
              'Greek Yogurt',
              'Tea Selection',
            ],
            sideDishes: ['Turkey Bacon', 'Fresh Berries'],
            extras: ['Whipped Cream', 'Honey'],
          },
          wednesday: {
            items: ['Oatmeal with Nuts', 'Croissant', 'Cappuccino'],
            sideDishes: ['Sliced Banana', 'Granola'],
            extras: ['Almond Milk', 'Brown Sugar'],
          },
          thursday: {
            items: ['French Toast', 'Smoothie Bowl', 'Espresso'],
            sideDishes: ['Crispy Bacon', 'Mixed Nuts'],
            extras: ['Maple Syrup', 'Coconut Flakes'],
          },
          friday: {
            items: ['Breakfast Sandwich', 'Avocado Toast', 'Fresh Juice'],
            sideDishes: ['Roasted Potatoes', 'Cherry Tomatoes'],
            extras: ['Extra Avocado', 'Cheese Slice'],
          },
          saturday: {
            items: ['Full English Breakfast', 'Muesli', 'Latte'],
            sideDishes: ['Baked Beans', 'Sautéed Mushrooms'],
            extras: ['Extra Egg', 'Sourdough Bread'],
          },
          sunday: {
            items: ['Eggs Benedict', 'Granola Bowl', 'Arabic Tea'],
            sideDishes: ['Hollandaise Sauce', 'Fresh Mint'],
            extras: ['Smoked Salmon', 'Capers'],
          },
        },
      },
      // Lunch Menu Template
      {
        mealType: 'lunch',
        description: 'Satisfying lunch meals with balanced nutrition',
        price: 35.0,
        weeklyMenu: {
          monday: {
            items: ['Grilled Chicken Salad', 'Lentil Soup', 'Pita Bread'],
            sideDishes: ['Hummus', 'Tabbouleh', 'Pickled Vegetables'],
            extras: ['Extra Chicken', 'Olive Oil Dressing'],
          },
          tuesday: {
            items: ['Beef Shawarma Wrap', 'French Fries', 'Garlic Sauce'],
            sideDishes: ['Coleslaw', 'Pickles', 'Tahini'],
            extras: ['Extra Meat', 'Cheese'],
          },
          wednesday: {
            items: ['Salmon Fillet', 'Rice Pilaf', 'Steamed Vegetables'],
            sideDishes: ['Lemon Wedges', 'Herb Butter'],
            extras: ['Extra Salmon', 'Quinoa Substitution'],
          },
          thursday: {
            items: ['Chicken Biryani', 'Raita', 'Papadum'],
            sideDishes: ['Pickle', 'Fried Onions'],
            extras: ['Extra Chicken', 'Boiled Egg'],
          },
          friday: {
            items: ['Mixed Grill Platter', 'Arabic Rice', 'Grilled Vegetables'],
            sideDishes: ['Garlic Paste', 'Hot Sauce'],
            extras: ['Extra Kebab', 'Naan Bread'],
          },
          saturday: {
            items: ['Fish and Chips', 'Mushy Peas', 'Tartar Sauce'],
            sideDishes: ['Lemon Slice', 'Malt Vinegar'],
            extras: ['Extra Fish', 'Onion Rings'],
          },
          sunday: {
            items: ['Roast Lamb', 'Roasted Potatoes', 'Mint Sauce'],
            sideDishes: ['Yorkshire Pudding', 'Gravy'],
            extras: ['Extra Lamb', 'Seasonal Vegetables'],
          },
        },
      },
      // Dinner Menu Template
      {
        mealType: 'dinner',
        description: 'Hearty dinner options for a perfect evening meal',
        price: 45.0,
        weeklyMenu: {
          monday: {
            items: ['Grilled Steak', 'Mashed Potatoes', 'Green Beans'],
            sideDishes: ['Mushroom Sauce', 'Garlic Bread'],
            extras: ['Extra Steak', 'Peppercorn Sauce'],
          },
          tuesday: {
            items: ['Seafood Paella', 'Garden Salad', 'Aioli'],
            sideDishes: ['Lemon Wedges', 'Crusty Bread'],
            extras: ['Extra Prawns', 'Saffron Rice'],
          },
          wednesday: {
            items: ['Lamb Tagine', 'Couscous', 'Moroccan Bread'],
            sideDishes: ['Preserved Lemons', 'Olives'],
            extras: ['Extra Lamb', 'Harissa Sauce'],
          },
          thursday: {
            items: ['Duck Confit', 'Roasted Root Vegetables', 'Red Wine Jus'],
            sideDishes: ['Potato Gratin', 'French Beans'],
            extras: ['Extra Duck Leg', 'Truffle Oil'],
          },
          friday: {
            items: [
              'Whole Roasted Chicken',
              'Herb Stuffing',
              'Roasted Vegetables',
            ],
            sideDishes: ['Gravy', 'Cranberry Sauce'],
            extras: ['Extra Chicken', 'Seasonal Sides'],
          },
          saturday: {
            items: ['BBQ Ribs', 'Corn on the Cob', 'Coleslaw'],
            sideDishes: ['BBQ Sauce', 'Pickled Cucumbers'],
            extras: ['Extra Ribs', 'Mac and Cheese'],
          },
          sunday: {
            items: ['Beef Wellington', 'Duchess Potatoes', 'Asparagus'],
            sideDishes: ['Mushroom Duxelles', 'Béarnaise Sauce'],
            extras: ['Extra Beef', 'Truffle Mashed Potatoes'],
          },
        },
      },
    ];

    // Create menus for each vendor
    for (const vendor of vendors) {
      try {
        console.log(`Creating menus for ${vendor.businessName}...`);

        for (const menuTemplate of menuTemplates) {
          await queryRunner.query(
            `
            INSERT INTO vendor_menus (
              "vendorId", "mealType", status, description, price, "weeklyMenu", "isActive"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
            [
              vendor.id,
              menuTemplate.mealType,
              'active',
              menuTemplate.description,
              menuTemplate.price,
              menuTemplate.weeklyMenu,
              true,
            ],
          );
        }

        console.log(`✅ Created menus for: ${vendor.businessName}`);
      } catch (error) {
        console.error(
          `❌ Failed to create menus for ${vendor.businessName}:`,
          error,
        );
        throw error;
      }
    }

    console.log('✅ Vendor menus seeded successfully');
  }

  private async seedAdminUsers(queryRunner: any) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE name = $1`,
      [ROLES.ADMIN],
    );

    if (!adminRole || adminRole.length === 0) {
      throw new Error('Admin role not found');
    }

    const adminRoleId = adminRole[0].id;

    const adminUsers = [
      {
        name: 'System Administrator',
        email: 'admin@messapp.ae',
        phone: '+971-50-123-4567',
        password: hashedPassword,
      },
      {
        name: 'Super Admin',
        email: 'superadmin@messapp.ae',
        phone: '+971-50-765-4321',
        password: hashedPassword,
      },
    ];

    for (const adminData of adminUsers) {
      try {
        // Create user first
        const userResult = await queryRunner.query(
          `
          INSERT INTO "user" (name)
          VALUES ($1)
          RETURNING id;
          `,
          [adminData.name],
        );

        const userId = userResult[0].id;

        // Create auth record linked to user
        await queryRunner.query(
          `
          INSERT INTO "auth" (email, phone, password, entity_type, entity_id, is_verified)
          VALUES ($1, $2, $3, $4, $5, true);
          `,
          [
            adminData.email,
            adminData.phone,
            adminData.password,
            'user',
            userId,
          ],
        );

        // Assign admin role
        await queryRunner.query(
          `
          INSERT INTO user_roles ("userId", "roleId", "isActive")
          VALUES ($1, $2, true);
          `,
          [userId, adminRoleId],
        );

        console.log(
          `✅ Created admin user: ${adminData.name} (${adminData.email})`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to create admin user ${adminData.email}:`,
          error,
        );
        throw error;
      }
    }

    console.log('✅ Admin users seeded successfully');
  }

  private async seedCustomerUsers(queryRunner: any) {
    const hashedPassword = await bcrypt.hash('customer123', 10);
    const userRole = await queryRunner.query(
      `SELECT id FROM roles WHERE name = $1`,
      [ROLES.USER],
    );

    if (!userRole || userRole.length === 0) {
      throw new Error('User role not found');
    }

    const userRoleId = userRole[0].id;

    const customerUsers = [
      {
        name: 'Ahmed Al Maktoum',
        email: 'ahmed@example.ae',
        phone: '+971-56-111-2222',
        password: hashedPassword,
      },
      {
        name: 'Fatima Hassan',
        email: 'fatima@example.ae',
        phone: '+971-55-333-4444',
        password: hashedPassword,
      },
      {
        name: 'Mohammed Ali',
        email: 'mohammed@example.ae',
        phone: '+971-50-555-6666',
        password: hashedPassword,
      },
      {
        name: 'Sarah Abdullah',
        email: 'sarah@example.ae',
        phone: '+971-56-777-8888',
        password: hashedPassword,
      },
      {
        name: 'Omar Al Zaabi',
        email: 'omar@example.ae',
        phone: '+971-55-999-0000',
        password: hashedPassword,
      },
      {
        name: 'Aisha Rahman',
        email: 'aisha@example.ae',
        phone: '+971-50-111-3333',
        password: hashedPassword,
      },
      {
        name: 'Khalid Al Shamsi',
        email: 'khalid@example.ae',
        phone: '+971-56-222-4444',
        password: hashedPassword,
      },
      {
        name: 'Mariam Al Mansoori',
        email: 'mariam@example.ae',
        phone: '+971-55-333-5555',
        password: hashedPassword,
      },
    ];

    for (const customerData of customerUsers) {
      try {
        // Create user first
        const userResult = await queryRunner.query(
          `
          INSERT INTO "user" (name)
          VALUES ($1)
          RETURNING id;
          `,
          [customerData.name],
        );

        const userId = userResult[0].id;

        // Create auth record linked to user
        await queryRunner.query(
          `
          INSERT INTO "auth" (email, phone, password, entity_type, entity_id, is_verified)
          VALUES ($1, $2, $3, $4, $5, true);
          `,
          [
            customerData.email,
            customerData.phone,
            customerData.password,
            'user',
            userId,
          ],
        );

        // Assign user role
        await queryRunner.query(
          `
          INSERT INTO user_roles ("userId", "roleId", "isActive")
          VALUES ($1, $2, true);
          `,
          [userId, userRoleId],
        );

        console.log(
          `✅ Created customer user: ${customerData.name} (${customerData.email})`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to create customer user ${customerData.email}:`,
          error,
        );
        throw error;
      }
    }

    console.log('✅ Customer users seeded successfully');
  }
}
