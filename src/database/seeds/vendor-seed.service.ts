import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VendorSeedService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async seed() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`
        ALTER TABLE vendor_menus 
        DROP CONSTRAINT IF EXISTS "FK_vendor_menus_vendor_id";
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS vendor (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR NOT NULL,
          email VARCHAR UNIQUE NOT NULL,
          password VARCHAR NOT NULL,
          "businessName" VARCHAR NOT NULL,
          address VARCHAR NOT NULL,
          phone VARCHAR NOT NULL,
          "isVerified" BOOLEAN DEFAULT FALSE,
          rating DECIMAL(10,2) DEFAULT 0,
          "totalRatings" INTEGER DEFAULT 0,
          "profilePhotoUrl" VARCHAR,
          "coverPhotoUrl" VARCHAR,
          "cuisineTypes" TEXT[] DEFAULT '{}',
          "foodTypes" TEXT[] DEFAULT '{}',
          "businessHours" JSONB,
          "isOpen" BOOLEAN DEFAULT TRUE,
          "closureMessage" VARCHAR,
          location GEOGRAPHY(Point, 4326),
          "serviceRadius" DECIMAL NOT NULL,
          description VARCHAR,
          "acceptedPaymentMethods" TEXT[] DEFAULT '{}',
          "totalOrders" INTEGER DEFAULT 0,
          "deliveryRating" DECIMAL(10,2) DEFAULT 0,
          "averageDeliveryTime" INTEGER DEFAULT 30,
          "minimumOrderAmount" DECIMAL(10,2) DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE EXTENSION IF NOT EXISTS postgis;
      `);

      await queryRunner.query('TRUNCATE TABLE vendors CASCADE;');

      const hashedPassword = await bcrypt.hash('password123', 10);

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
          isOpen: true,
          location: () => `ST_SetSRID(ST_MakePoint(55.2708, 25.2084), 4326)`,
          serviceRadius: 10,
          description:
            'Authentic Emirati and Arab cuisine in the heart of Dubai',
          acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
          totalOrders: 25420,
          deliveryRating: 4.7,
          averageDeliveryTime: 30,
          minimumOrderAmount: 50,
        },
        {
          name: 'Bu Qtair Fish Restaurant',
          email: 'info@buqtair.ae',
          password: hashedPassword,
          businessName: 'Bu Qtair Restaurant LLC',
          address: 'Fishing Harbour 2, Al Sufouh Road, Dubai',
          phone: '+971-4-234-5678',
          isVerified: true,
          rating: 4.7,
          totalRatings: 2561,
          profilePhotoUrl: 'https://storage.vendor.com/buqtair-profile.jpg',
          coverPhotoUrl: 'https://storage.vendor.com/buqtair-cover.jpg',
          cuisineTypes: ['Seafood', 'Indian', 'Local'],
          foodTypes: ['Non-Veg', 'Seafood'],
          businessHours: {
            monday: { open: '11:30', close: '23:30' },
            tuesday: { open: '11:30', close: '23:30' },
            wednesday: { open: '11:30', close: '23:30' },
            thursday: { open: '11:30', close: '23:30' },
            friday: { open: '14:00', close: '23:30' },
            saturday: { open: '11:30', close: '23:30' },
            sunday: { open: '11:30', close: '23:30' },
          },
          isOpen: true,
          location: () => `ST_SetSRID(ST_MakePoint(55.2361, 25.1539), 4326)`,
          serviceRadius: 8,
          description: "Dubai's legendary fresh seafood restaurant since 1980s",
          acceptedPaymentMethods: ['cash', 'card'],
          totalOrders: 31250,
          deliveryRating: 4.5,
          averageDeliveryTime: 35,
          minimumOrderAmount: 60,
        },
        {
          name: 'Al Mallah Restaurant',
          email: 'contact@almallah.ae',
          password: hashedPassword,
          businessName: 'Al Mallah Restaurant & Cafeteria LLC',
          address: '2nd of December St, Satwa, Dubai',
          phone: '+971-4-398-4723',
          isVerified: true,
          rating: 4.6,
          totalRatings: 3845,
          profilePhotoUrl: 'https://storage.vendor.com/almallah-profile.jpg',
          coverPhotoUrl: 'https://storage.vendor.com/almallah-cover.jpg',
          cuisineTypes: ['Lebanese', 'Middle Eastern', 'Street Food'],
          foodTypes: ['Veg', 'Non-Veg'],
          businessHours: {
            monday: { open: '07:00', close: '03:00' },
            tuesday: { open: '07:00', close: '03:00' },
            wednesday: { open: '07:00', close: '03:00' },
            thursday: { open: '07:00', close: '03:00' },
            friday: { open: '13:00', close: '03:00' },
            saturday: { open: '07:00', close: '03:00' },
            sunday: { open: '07:00', close: '03:00' },
          },
          isOpen: true,
          location: () => `ST_SetSRID(ST_MakePoint(55.2667, 25.2048), 4326)`,
          serviceRadius: 5,
          description: 'Famous for shawarmas and fresh juices since 1979',
          acceptedPaymentMethods: ['cash', 'card', 'apple_pay'],
          totalOrders: 89450,
          deliveryRating: 4.8,
          averageDeliveryTime: 25,
          minimumOrderAmount: 25,
        },
        {
          name: 'Al Ustad Special Kabab',
          email: 'info@alustadkabab.ae',
          password: hashedPassword,
          businessName: 'Al Ustad Special Kabab Restaurant LLC',
          address: 'Al Mankhool Road, Bur Dubai',
          phone: '+971-4-397-1933',
          isVerified: true,
          rating: 4.9,
          totalRatings: 2876,
          profilePhotoUrl: 'https://storage.vendor.com/alustad-profile.jpg',
          coverPhotoUrl: 'https://storage.vendor.com/alustad-cover.jpg',
          cuisineTypes: ['Iranian', 'Persian', 'BBQ'],
          foodTypes: ['Non-Veg'],
          businessHours: {
            monday: { open: '12:00', close: '00:00' },
            tuesday: { open: '12:00', close: '00:00' },
            wednesday: { open: '12:00', close: '00:00' },
            thursday: { open: '12:00', close: '00:00' },
            friday: { open: '13:30', close: '00:00' },
            saturday: { open: '12:00', close: '00:00' },
            sunday: { open: '12:00', close: '00:00' },
          },
          isOpen: true,
          location: () => `ST_SetSRID(ST_MakePoint(55.2867, 25.2528), 4326)`,
          serviceRadius: 7,
          description: "Dubai's oldest Iranian restaurant famous for kababs",
          acceptedPaymentMethods: ['cash', 'card'],
          totalOrders: 42680,
          deliveryRating: 4.7,
          averageDeliveryTime: 40,
          minimumOrderAmount: 50,
        },
        {
          name: 'Al Safadi',
          email: 'contact@alsafadi.ae',
          password: hashedPassword,
          businessName: 'Al Safadi Restaurant LLC',
          address: 'Sheikh Zayed Road, Al Barsha',
          phone: '+971-4-329-9008',
          isVerified: true,
          rating: 4.5,
          totalRatings: 4562,
          profilePhotoUrl: 'https://storage.vendor.com/alsafadi-profile.jpg',
          coverPhotoUrl: 'https://storage.vendor.com/alsafadi-cover.jpg',
          cuisineTypes: ['Lebanese', 'Mediterranean', 'Grills'],
          foodTypes: ['Non-Veg', 'Veg'],
          businessHours: {
            monday: { open: '11:00', close: '01:00' },
            tuesday: { open: '11:00', close: '01:00' },
            wednesday: { open: '11:00', close: '01:00' },
            thursday: { open: '11:00', close: '02:00' },
            friday: { open: '13:00', close: '02:00' },
            saturday: { open: '11:00', close: '01:00' },
            sunday: { open: '11:00', close: '01:00' },
          },
          isOpen: true,
          location: () => `ST_SetSRID(ST_MakePoint(55.2097, 25.1107), 4326)`,
          serviceRadius: 15,
          description: 'Premium Lebanese dining experience',
          acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
          totalOrders: 67890,
          deliveryRating: 4.6,
          averageDeliveryTime: 45,
          minimumOrderAmount: 100,
        },
      ];

      for (const vendorData of vendors) {
        await queryRunner.query(
          `
          INSERT INTO vendor (
            name, email, password, "businessName", address, phone, 
            "isVerified", rating, "totalRatings", "profilePhotoUrl", 
            "coverPhotoUrl", "cuisineTypes", "foodTypes", "businessHours", 
            "isOpen", location, "serviceRadius", description, 
            "acceptedPaymentMethods", "totalOrders", "deliveryRating", 
            "averageDeliveryTime", "minimumOrderAmount"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, ${vendorData.location()}, $16, $17, $18, $19, $20, $21, $22
          )
        `,
          [
            vendorData.name,
            vendorData.email,
            vendorData.password,
            vendorData.businessName,
            vendorData.address,
            vendorData.phone,
            vendorData.isVerified,
            vendorData.rating,
            vendorData.totalRatings,
            vendorData.profilePhotoUrl,
            vendorData.coverPhotoUrl,
            vendorData.cuisineTypes,
            vendorData.foodTypes,
            vendorData.businessHours,
            vendorData.isOpen,
            vendorData.serviceRadius,
            vendorData.description,
            vendorData.acceptedPaymentMethods,
            vendorData.totalOrders,
            vendorData.deliveryRating,
            vendorData.averageDeliveryTime,
            vendorData.minimumOrderAmount,
          ],
        );
      }

      await queryRunner.query(`
        ALTER TABLE vendor_menus 
        ADD CONSTRAINT "FK_vendor_menus_vendor_id" 
        FOREIGN KEY ("vendorId") 
        REFERENCES vendor(id);
      `);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
