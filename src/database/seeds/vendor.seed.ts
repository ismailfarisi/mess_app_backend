import { DataSource } from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import * as bcrypt from 'bcrypt';
import { Point } from 'geojson';

export const seedVendors = async (dataSource: DataSource) => {
  const vendorRepository = dataSource.getRepository(Vendor);

  try {
    // Clear existing vendors
    await vendorRepository.clear();

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
        location: {
          type: 'Point',
          coordinates: [55.2708, 25.2084],
        } as Point,
        serviceRadius: 10,
        description: 'Authentic Emirati and Arab cuisine in the heart of Dubai',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        totalOrders: 25420,
        deliveryRating: 4.7,
        averageDeliveryTime: 30,
        minimumOrderAmount: 50,
      },
      {
        name: "Ravi's Special",
        email: 'info@ravisrestaurant.ae',
        password: hashedPassword,
        businessName: 'Ravi Restaurant Trading LLC',
        address: 'Shop 245, Al Sa8twa Road, Satwa, Dubai',
        phone: '+971-4-123-4568',
        isVerified: true,
        rating: 4.9,
        totalRatings: 3672,
        profilePhotoUrl: 'https://storage.vendor.com/ravis-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/ravis-cover.jpg',
        cuisineTypes: ['Pakistani', 'Indian', 'BBQ'],
        foodTypes: ['Non-Veg', 'Veg'],
        businessHours: {
          monday: { open: '05:00', close: '03:00' },
          tuesday: { open: '05:00', close: '03:00' },
          wednesday: { open: '05:00', close: '03:00' },
          thursday: { open: '05:00', close: '03:00' },
          friday: { open: '13:00', close: '03:00' },
          saturday: { open: '05:00', close: '03:00' },
          sunday: { open: '05:00', close: '03:00' },
        },
        isOpen: true,
        location: {
          type: 'Point',
          coordinates: [55.2667, 25.2048], // Dubai - Satwa
        } as Point,
        serviceRadius: 15,
        description: "Dubai's favorite Pakistani restaurant since 1978",
        acceptedPaymentMethods: ['card', 'cash'],
        totalOrders: 52350,
        deliveryRating: 4.6,
        averageDeliveryTime: 35,
        minimumOrderAmount: 30,
      },
      {
        name: 'Mandarin Palace',
        email: 'contact@mandarinpalace.ae',
        password: hashedPassword,
        businessName: 'Mandarin Palace Restaurant LLC',
        address: 'Unit 15, The Dubai Mall, Downtown Dubai',
        phone: '+971-4-123-4569',
        isVerified: true,
        rating: 4.7,
        totalRatings: 823,
        profilePhotoUrl: 'https://storage.vendor.com/mandarin-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/mandarin-cover.jpg',
        cuisineTypes: ['Chinese', 'Dim Sum', 'Seafood'],
        foodTypes: ['Non-Veg', 'Veg', 'Seafood'],
        businessHours: {
          monday: { open: '10:00', close: '00:00' },
          tuesday: { open: '10:00', close: '00:00' },
          wednesday: { open: '10:00', close: '00:00' },
          thursday: { open: '10:00', close: '01:00' },
          friday: { open: '13:00', close: '01:00' },
          saturday: { open: '10:00', close: '01:00' },
          sunday: { open: '10:00', close: '00:00' },
        },
        isOpen: true,
        location: {
          type: 'Point',
          coordinates: [55.2768, 25.1972], // Dubai Mall
        } as Point,
        serviceRadius: 12,
        description: 'Premium Chinese dining experience',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        totalOrders: 18940,
        deliveryRating: 4.8,
        averageDeliveryTime: 40,
        minimumOrderAmount: 100,
      },
      {
        name: 'Shawarma Express',
        email: 'info@shawarmaexpress.ae',
        password: hashedPassword,
        businessName: 'Shawarma Express Trading LLC',
        address: 'Shop 5, Al Barsha 1, Dubai',
        phone: '+971-4-123-4570',
        isVerified: true,
        rating: 4.6,
        totalRatings: 2205,
        profilePhotoUrl:
          'https://storage.vendor.com/shawarma-express-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/shawarma-express-cover.jpg',
        cuisineTypes: ['Lebanese', 'Arabic', 'Fast Food'],
        foodTypes: ['Non-Veg', 'Veg'],
        businessHours: {
          monday: { open: '10:00', close: '04:00' },
          tuesday: { open: '10:00', close: '04:00' },
          wednesday: { open: '10:00', close: '04:00' },
          thursday: { open: '10:00', close: '04:00' },
          friday: { open: '13:00', close: '04:00' },
          saturday: { open: '10:00', close: '04:00' },
          sunday: { open: '10:00', close: '04:00' },
        },
        isOpen: true,
        location: {
          type: 'Point',
          coordinates: [55.2097, 25.1107], // Al Barsha
        } as Point,
        serviceRadius: 8,
        description: 'Best shawarmas in Dubai, available 24/7',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay'],
        totalOrders: 40150,
        deliveryRating: 4.5,
        averageDeliveryTime: 25,
        minimumOrderAmount: 25,
      },
      {
        name: 'Seafood Market',
        email: 'contact@seafoodmarket.ae',
        password: hashedPassword,
        businessName: 'Seafood Market Restaurant LLC',
        address: 'Unit 7, The Walk JBR, Dubai Marina',
        phone: '+971-4-123-4571',
        isVerified: true,
        rating: 4.8,
        totalRatings: 1341,
        profilePhotoUrl:
          'https://storage.vendor.com/seafood-market-profile.jpg',
        coverPhotoUrl: 'https://storage.vendor.com/seafood-market-cover.jpg',
        cuisineTypes: ['Seafood', 'Mediterranean', 'Grills'],
        foodTypes: ['Seafood', 'Non-Veg'],
        businessHours: {
          monday: { open: '12:00', close: '00:00' },
          tuesday: { open: '12:00', close: '00:00' },
          wednesday: { open: '12:00', close: '00:00' },
          thursday: { open: '12:00', close: '01:00' },
          friday: { open: '13:00', close: '01:00' },
          saturday: { open: '12:00', close: '01:00' },
          sunday: { open: '12:00', close: '00:00' },
        },
        isOpen: true,
        location: {
          type: 'Point',
          coordinates: [55.1304, 25.0777], // Dubai Marina
        } as Point,
        serviceRadius: 10,
        description: 'Fresh seafood served with a Mediterranean twist',
        acceptedPaymentMethods: ['card', 'cash', 'apple_pay', 'google_pay'],
        totalOrders: 15670,
        deliveryRating: 4.7,
        averageDeliveryTime: 45,
        minimumOrderAmount: 150,
      },
    ];

    // Insert vendors
    for (const vendorData of vendors) {
      const vendor = vendorRepository.create(vendorData);
      await vendorRepository.save(vendor);
    }

    console.log('UAE Vendors seeded successfully');
  } catch (error) {
    console.error('Error seeding vendors:', error);
    throw error;
  }
};
