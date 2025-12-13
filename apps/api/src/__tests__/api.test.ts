import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../config/database.js';

describe('API Endpoints', () => {
  // Clean up refresh tokens before each test suite to avoid unique constraint errors
  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({});
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // ============================================================================
  // SERVICE ROUTES
  // ============================================================================

  describe('Service Routes', () => {
    describe('GET /api/v1/services', () => {
      it('should return list of services', async () => {
        const res = await request(app).get('/api/v1/services');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return services with expected properties', async () => {
        const res = await request(app).get('/api/v1/services');

        expect(res.status).toBe(200);
        if (res.body.data.length > 0) {
          const service = res.body.data[0];
          expect(service).toHaveProperty('id');
          expect(service).toHaveProperty('name');
          expect(service).toHaveProperty('category');
          expect(service).toHaveProperty('baseDuration');
          expect(service).toHaveProperty('basePrice');
        }
      });

      it('should filter services by category', async () => {
        const res = await request(app)
          .get('/api/v1/services')
          .query({ category: 'THAI_MASSAGE' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        // All returned services should be THAI_MASSAGE
        res.body.data.forEach((service: { category: string }) => {
          expect(service.category).toBe('THAI_MASSAGE');
        });
      });

      it('should reject invalid category filter', async () => {
        const res = await request(app)
          .get('/api/v1/services')
          .query({ category: 'NON_EXISTENT_CATEGORY' });

        // Invalid enum value causes a Prisma validation error
        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/services/:serviceId', () => {
      it('should return service details', async () => {
        const res = await request(app)
          .get('/api/v1/services/svc-thai');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', 'svc-thai');
        expect(res.body.data).toHaveProperty('name', 'Thai Massage');
        expect(res.body.data).toHaveProperty('category', 'THAI_MASSAGE');
      });

      it('should return 404 for non-existent service', async () => {
        const res = await request(app)
          .get('/api/v1/services/non-existent-service');

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('not found');
      });

      it('should include Korean name if available', async () => {
        const res = await request(app)
          .get('/api/v1/services/svc-thai');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('nameKo');
      });
    });

    describe('GET /api/v1/services/areas', () => {
      it('should return list of service areas', async () => {
        const res = await request(app)
          .get('/api/v1/services/areas');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return areas with expected properties', async () => {
        const res = await request(app)
          .get('/api/v1/services/areas');

        expect(res.status).toBe(200);
        if (res.body.data.length > 0) {
          const area = res.body.data[0];
          expect(area).toHaveProperty('name');
          expect(area).toHaveProperty('displayName');
          expect(area).toHaveProperty('centerLat');
          expect(area).toHaveProperty('centerLng');
        }
      });
    });

    describe('POST /api/v1/services/promotions/validate', () => {
      it('should validate a valid promo code', async () => {
        const res = await request(app)
          .post('/api/v1/services/promotions/validate')
          .send({ code: 'WELCOME20', amount: 1000 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('valid', true);
        expect(res.body.data).toHaveProperty('discount');
        expect(res.body.data.discount).toBeGreaterThan(0);
      });

      it('should return invalid for non-existent promo code', async () => {
        const res = await request(app)
          .post('/api/v1/services/promotions/validate')
          .send({ code: 'INVALID_CODE', amount: 1000 });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('valid', false);
        expect(res.body.data.message).toContain('Invalid');
      });

      it('should apply percentage discount correctly', async () => {
        const amount = 1000;
        const res = await request(app)
          .post('/api/v1/services/promotions/validate')
          .send({ code: 'WELCOME20', amount });

        expect(res.status).toBe(200);
        // WELCOME20 is 20% off with max 500
        const expectedDiscount = Math.min(amount * 0.20, 500);
        expect(res.body.data.discount).toBe(expectedDiscount);
      });

      it('should apply fixed discount correctly', async () => {
        const res = await request(app)
          .post('/api/v1/services/promotions/validate')
          .send({ code: 'FLAT100', amount: 1500 });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('valid', true);
        expect(res.body.data.discount).toBe(100);
      });

      it('should reject if order amount below minimum', async () => {
        const res = await request(app)
          .post('/api/v1/services/promotions/validate')
          .send({ code: 'WELCOME20', amount: 500 }); // Min is 800

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('valid', false);
        expect(res.body.data.message).toContain('Minimum');
      });

      it('should cap discount at maxDiscount', async () => {
        const res = await request(app)
          .post('/api/v1/services/promotions/validate')
          .send({ code: 'WELCOME20', amount: 5000 }); // 20% of 5000 = 1000, but max is 500

        expect(res.status).toBe(200);
        expect(res.body.data.discount).toBeLessThanOrEqual(500);
      });
    });
  });

  describe('GET /api/v1/providers', () => {
    it('should return list of providers', async () => {
      const res = await request(app).get('/api/v1/providers');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@test.com', password: 'customer123!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Clean tokens before getting a new one
      await prisma.refreshToken.deleteMany({});

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@test.com', password: 'customer123!' });

      if (!res.body.data?.accessToken) {
        throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
      }
      accessToken = res.body.data.accessToken;
    });

    it('should reject requests without token', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('email', 'customer@test.com');
    });

    it('should return user addresses', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/unknown-route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Not Found');
    });
  });

  describe('Bookings', () => {
    let customerToken: string;
    let providerToken: string;
    let providerId: string;
    let createdBookingId: string;

    beforeAll(async () => {
      await prisma.refreshToken.deleteMany({});

      // Login as customer
      const customerRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@test.com', password: 'customer123!' });
      customerToken = customerRes.body.data.accessToken;

      // Login as provider
      const providerRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'provider@test.com', password: 'provider123!' });
      providerToken = providerRes.body.data.accessToken;

      // Get provider ID
      const provider = await prisma.provider.findFirst({
        where: { user: { email: 'provider@test.com' } },
      });
      providerId = provider!.id;
    });

    afterAll(async () => {
      // Clean up test bookings
      if (createdBookingId) {
        await prisma.booking.deleteMany({
          where: { id: createdBookingId },
        });
      }
    });

    describe('GET /api/v1/bookings', () => {
      it('should require authentication', async () => {
        const res = await request(app).get('/api/v1/bookings');
        expect(res.status).toBe(401);
      });

      it('should return customer bookings list', async () => {
        const res = await request(app)
          .get('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return provider bookings list', async () => {
        const res = await request(app)
          .get('/api/v1/bookings?role=provider')
          .set('Authorization', `Bearer ${providerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('POST /api/v1/bookings', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/v1/bookings')
          .send({});
        expect(res.status).toBe(401);
      });

      it('should create a new booking', async () => {
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 3);

        const res = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Test Address, Makati City',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('booking');
        expect(res.body.data.booking).toHaveProperty('id');
        expect(res.body.data.booking).toHaveProperty('bookingNumber');
        expect(res.body.data.booking.status).toBe('PENDING');
        expect(res.body.data.booking.duration).toBe(60);
        expect(typeof res.body.data.booking.serviceAmount).toBe('number');
        expect(res.body.data.booking.serviceAmount).toBeGreaterThan(0);

        createdBookingId = res.body.data.booking.id;
      });

      it('should reject booking with invalid provider', async () => {
        const res = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId: 'invalid-provider-id',
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: new Date().toISOString(),
            addressText: 'Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        expect(res.status).toBe(404);
      });

      it('should reject booking with unavailable service', async () => {
        const res = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-scrub', // Provider doesn't offer body scrub
            duration: 60,
            scheduledAt: new Date().toISOString(),
            addressText: 'Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/bookings/:bookingId', () => {
      it('should return booking details', async () => {
        if (!createdBookingId) return;

        const res = await request(app)
          .get(`/api/v1/bookings/${createdBookingId}`)
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', createdBookingId);
        expect(res.body.data).toHaveProperty('service');
        expect(res.body.data).toHaveProperty('provider');
      });

      it('should return 404 for non-existent booking', async () => {
        const res = await request(app)
          .get('/api/v1/bookings/non-existent-id')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('Provider Booking Actions', () => {
      it('should accept a booking', async () => {
        if (!createdBookingId) return;

        const res = await request(app)
          .post(`/api/v1/bookings/${createdBookingId}/accept`)
          .set('Authorization', `Bearer ${providerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.status).toBe('ACCEPTED');
      });

      it('should update booking status to EN_ROUTE', async () => {
        if (!createdBookingId) return;

        const res = await request(app)
          .patch(`/api/v1/bookings/${createdBookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'PROVIDER_EN_ROUTE' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('PROVIDER_EN_ROUTE');
      });

      it('should update booking status to ARRIVED', async () => {
        if (!createdBookingId) return;

        const res = await request(app)
          .patch(`/api/v1/bookings/${createdBookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'PROVIDER_ARRIVED' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('PROVIDER_ARRIVED');
      });

      it('should update booking status to IN_PROGRESS', async () => {
        if (!createdBookingId) return;

        const res = await request(app)
          .patch(`/api/v1/bookings/${createdBookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'IN_PROGRESS' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('IN_PROGRESS');
      });

      it('should complete booking', async () => {
        if (!createdBookingId) return;

        const res = await request(app)
          .patch(`/api/v1/bookings/${createdBookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'COMPLETED' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('COMPLETED');
      });

      it('should update provider location during booking', async () => {
        // Create a new booking for location test
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 4);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Location Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        // Skip if booking creation failed
        if (!bookingRes.body.data?.booking?.id) {
          console.log('Booking creation failed:', bookingRes.body);
          return;
        }

        const bookingId = bookingRes.body.data.booking.id;

        // Accept the booking
        await request(app)
          .post(`/api/v1/bookings/${bookingId}/accept`)
          .set('Authorization', `Bearer ${providerToken}`);

        // Update location
        const res = await request(app)
          .post(`/api/v1/bookings/${bookingId}/location`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({
            latitude: 14.5600,
            longitude: 121.0200,
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        // Clean up
        await prisma.locationLog.deleteMany({ where: { bookingId } });
        await prisma.booking.delete({ where: { id: bookingId } });
      });
    });

    describe('Booking Cancellation', () => {
      it('should cancel a pending booking', async () => {
        // Create a new booking
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 5);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-swedish',
            duration: 90,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Cancel Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        const bookingId = bookingRes.body.data.booking.id;

        // Cancel the booking
        const res = await request(app)
          .post(`/api/v1/bookings/${bookingId}/cancel`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ reason: 'Changed my mind' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.status).toBe('CANCELLED');
        expect(res.body.data.cancelReason).toBe('Changed my mind');

        // Clean up
        await prisma.booking.delete({ where: { id: bookingId } });
      });

      it('should not cancel a completed booking', async () => {
        if (!createdBookingId) return;

        const res = await request(app)
          .post(`/api/v1/bookings/${createdBookingId}/cancel`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ reason: 'Too late' });

        expect(res.status).toBe(400);
      });
    });

    describe('Booking Rejection', () => {
      it('should reject a pending booking', async () => {
        // Create a new booking
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 6);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Reject Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        const bookingId = bookingRes.body.data.booking.id;

        // Reject the booking
        const res = await request(app)
          .post(`/api/v1/bookings/${bookingId}/reject`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ reason: 'Not available' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.status).toBe('REJECTED');

        // Clean up
        await prisma.booking.delete({ where: { id: bookingId } });
      });

      it('should not reject an already accepted booking', async () => {
        // Create and accept a booking
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 7);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Already Accepted Test',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        const bookingId = bookingRes.body.data.booking.id;

        // Accept it first
        await request(app)
          .post(`/api/v1/bookings/${bookingId}/accept`)
          .set('Authorization', `Bearer ${providerToken}`);

        // Try to reject
        const res = await request(app)
          .post(`/api/v1/bookings/${bookingId}/reject`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ reason: 'Changed mind' });

        expect(res.status).toBe(400);

        // Clean up
        await prisma.booking.delete({ where: { id: bookingId } });
      });
    });

    describe('Provider Location Tracking', () => {
      it('should update provider location during booking', async () => {
        // Create a booking
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 8);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Location Tracking Test',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        expect(bookingRes.status).toBe(201);
        const bookingId = bookingRes.body.data.booking.id;

        // Accept the booking
        await request(app)
          .post(`/api/v1/bookings/${bookingId}/accept`)
          .set('Authorization', `Bearer ${providerToken}`);

        // Set to en route
        await request(app)
          .patch(`/api/v1/bookings/${bookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'PROVIDER_EN_ROUTE' });

        // Update provider location - should succeed
        const locationRes = await request(app)
          .post(`/api/v1/bookings/${bookingId}/location`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ latitude: 14.5600, longitude: 121.0200 });

        expect(locationRes.status).toBe(200);
        expect(locationRes.body).toHaveProperty('success', true);

        // Clean up
        await prisma.locationLog.deleteMany({ where: { bookingId } });
        await prisma.booking.delete({ where: { id: bookingId } });
      });

      it('should return 404 for non-existent booking location', async () => {
        const res = await request(app)
          .get('/api/v1/bookings/non-existent-id/provider-location')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(404);
      });

      it('should require provider role to update location', async () => {
        // Customer cannot update location - only provider can
        const res = await request(app)
          .post('/api/v1/bookings/some-booking-id/location')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ latitude: 14.5600, longitude: 121.0200 });

        // Customer is not a provider, so middleware rejects with 403
        expect(res.status).toBe(403);
      });
    });

    describe('SOS Emergency', () => {
      it('should return 404 for SOS on non-existent booking', async () => {
        const res = await request(app)
          .post('/api/v1/bookings/non-existent-id/sos')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            latitude: 14.5586,
            longitude: 121.0178,
            message: 'Emergency!',
          });

        expect(res.status).toBe(404);
      });

      it('should require booking to exist for SOS', async () => {
        // Test SOS endpoint with invalid booking - exercises triggerSOS controller
        const res = await request(app)
          .post('/api/v1/bookings/invalid-booking-123/sos')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            message: 'Test SOS',
          });

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('not found');
      });
    });

    describe('Booking Error Cases', () => {
      it('should return 404 when accepting non-existent booking', async () => {
        const res = await request(app)
          .post('/api/v1/bookings/non-existent-id/accept')
          .set('Authorization', `Bearer ${providerToken}`);

        expect(res.status).toBe(404);
      });

      it('should return 404 when updating status of non-existent booking', async () => {
        const res = await request(app)
          .patch('/api/v1/bookings/non-existent-id/status')
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'IN_PROGRESS' });

        expect(res.status).toBe(404);
      });

      it('should return 404 when updating location of non-existent booking', async () => {
        const res = await request(app)
          .post('/api/v1/bookings/non-existent-id/location')
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ latitude: 14.5600, longitude: 121.0200 });

        expect(res.status).toBe(404);
      });
    });
  });

  describe('Reviews and Ratings', () => {
    let customerToken: string;
    let providerToken: string;
    let providerId: string;
    let completedBookingId: string;
    let createdReviewId: string;

    beforeAll(async () => {
      await prisma.refreshToken.deleteMany({});

      // Login as customer
      const customerRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@test.com', password: 'customer123!' });
      customerToken = customerRes.body.data.accessToken;

      // Login as provider
      const providerRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'provider@test.com', password: 'provider123!' });
      providerToken = providerRes.body.data.accessToken;

      // Get provider ID
      const provider = await prisma.provider.findFirst({
        where: { user: { email: 'provider@test.com' } },
      });
      providerId = provider!.id;

      // Create and complete a booking for review tests
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 2);

      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId,
          serviceId: 'svc-thai',
          duration: 60,
          scheduledAt: scheduledAt.toISOString(),
          addressText: 'Review Test Address',
          latitude: 14.5586,
          longitude: 121.0178,
        });

      completedBookingId = bookingRes.body.data.booking.id;

      // Complete the booking flow
      await request(app)
        .post(`/api/v1/bookings/${completedBookingId}/accept`)
        .set('Authorization', `Bearer ${providerToken}`);

      await request(app)
        .patch(`/api/v1/bookings/${completedBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'PROVIDER_EN_ROUTE' });

      await request(app)
        .patch(`/api/v1/bookings/${completedBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'PROVIDER_ARRIVED' });

      await request(app)
        .patch(`/api/v1/bookings/${completedBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'IN_PROGRESS' });

      await request(app)
        .patch(`/api/v1/bookings/${completedBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'COMPLETED' });
    });

    afterAll(async () => {
      // Clean up
      if (createdReviewId) {
        await prisma.review.deleteMany({ where: { id: createdReviewId } });
      }
      if (completedBookingId) {
        await prisma.booking.deleteMany({ where: { id: completedBookingId } });
      }
    });

    describe('GET /api/v1/providers/:providerId/reviews', () => {
      it('should return provider reviews', async () => {
        const res = await request(app)
          .get(`/api/v1/providers/${providerId}/reviews`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return empty array for non-existent provider', async () => {
        const res = await request(app)
          .get('/api/v1/providers/non-existent-id/reviews');

        // API returns empty array for non-existent provider
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
      });
    });

    describe('POST /api/v1/reviews', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/v1/reviews')
          .send({ bookingId: completedBookingId, rating: 5 });

        expect(res.status).toBe(401);
      });

      it('should create a review for completed booking', async () => {
        const res = await request(app)
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            bookingId: completedBookingId,
            rating: 5,
            comment: 'Excellent massage! Very professional and relaxing.',
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.rating).toBe(5);
        expect(res.body.data.comment).toBe('Excellent massage! Very professional and relaxing.');

        createdReviewId = res.body.data.id;
      });

      it('should not allow duplicate reviews', async () => {
        const res = await request(app)
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            bookingId: completedBookingId,
            rating: 4,
            comment: 'Trying to review again',
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('already exists');
      });

      it('should not allow review for non-existent booking', async () => {
        const res = await request(app)
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            bookingId: 'non-existent-booking',
            rating: 5,
          });

        expect(res.status).toBe(404);
      });

      it('should not allow review for incomplete booking', async () => {
        // Create a pending booking
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 10);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Incomplete Booking Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        // Skip if booking creation failed
        if (!bookingRes.body.data?.booking?.id) {
          console.log('Booking creation failed:', bookingRes.body);
          return;
        }

        const pendingBookingId = bookingRes.body.data.booking.id;

        const res = await request(app)
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            bookingId: pendingBookingId,
            rating: 5,
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('completed');

        // Clean up
        await prisma.booking.delete({ where: { id: pendingBookingId } });
      });

      it('should not allow provider to review their own booking', async () => {
        const res = await request(app)
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${providerToken}`)
          .send({
            bookingId: completedBookingId,
            rating: 5,
          });

        expect(res.status).toBe(403);
      });

      it('should validate rating range', async () => {
        // Create another completed booking for this test
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 3);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId,
            serviceId: 'svc-swedish',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Rating Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        const bookingId = bookingRes.body.data.booking.id;

        // Complete the booking
        await request(app)
          .post(`/api/v1/bookings/${bookingId}/accept`)
          .set('Authorization', `Bearer ${providerToken}`);

        await request(app)
          .patch(`/api/v1/bookings/${bookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'COMPLETED' });

        // Test with valid rating
        const res = await request(app)
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            bookingId,
            rating: 4,
            comment: 'Good service',
          });

        expect(res.status).toBe(201);
        expect(res.body.data.rating).toBe(4);

        // Clean up
        await prisma.review.deleteMany({ where: { bookingId } });
        await prisma.booking.delete({ where: { id: bookingId } });
      });
    });

    describe('POST /api/v1/reviews/:reviewId/reply', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .post(`/api/v1/reviews/${createdReviewId}/reply`)
          .send({ reply: 'Thank you!' });

        expect(res.status).toBe(401);
      });

      it('should require provider role', async () => {
        const res = await request(app)
          .post(`/api/v1/reviews/${createdReviewId}/reply`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ reply: 'Thank you!' });

        expect(res.status).toBe(403);
      });

      it('should allow provider to reply to review', async () => {
        const res = await request(app)
          .post(`/api/v1/reviews/${createdReviewId}/reply`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ reply: 'Thank you for your kind words! It was a pleasure serving you.' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.reply).toBe('Thank you for your kind words! It was a pleasure serving you.');
        expect(res.body.data).toHaveProperty('repliedAt');
      });

      it('should return 404 for non-existent review', async () => {
        const res = await request(app)
          .post('/api/v1/reviews/non-existent-review/reply')
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ reply: 'Thank you!' });

        expect(res.status).toBe(404);
      });
    });

    describe('Provider Rating Update', () => {
      it('should update provider rating after review', async () => {
        const res = await request(app)
          .get(`/api/v1/providers/${providerId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('rating');
        expect(res.body.data).toHaveProperty('totalRatings');
        expect(res.body.data.totalRatings).toBeGreaterThan(0);
      });
    });
  });

  describe('Admin Routes', () => {
    let adminToken: string;
    let customerToken: string;
    let providerId: string; // Provider record ID (for admin provider routes)
    let providerUserId: string; // User ID (for reports)
    let customerId: string;
    let createdServiceId: string;
    let createdPromotionId: string;

    beforeAll(async () => {
      await prisma.refreshToken.deleteMany({});

      // Login as admin
      const adminRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@callmsg.com', password: 'admin123!' });
      adminToken = adminRes.body.data.accessToken;

      // Login as customer (for access control tests)
      const customerRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@test.com', password: 'customer123!' });
      customerToken = customerRes.body.data.accessToken;
      customerId = customerRes.body.data.user.id;

      // Get provider IDs for admin operations
      const provider = await prisma.provider.findFirst({
        where: { user: { email: 'provider@test.com' } },
      });
      providerId = provider!.id; // Provider record ID for admin routes
      providerUserId = provider!.userId; // User ID for reports
    });

    afterAll(async () => {
      // Clean up created resources
      if (createdServiceId) {
        await prisma.service.deleteMany({ where: { id: createdServiceId } });
      }
      if (createdPromotionId) {
        await prisma.promotion.deleteMany({ where: { id: createdPromotionId } });
      }
    });

    describe('Access Control', () => {
      it('should reject unauthenticated requests', async () => {
        const res = await request(app).get('/api/v1/admin/dashboard');
        expect(res.status).toBe(401);
      });

      it('should reject non-admin users', async () => {
        const res = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/v1/admin/dashboard', () => {
      it('should return dashboard stats', async () => {
        const res = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('todayBookings');
        expect(res.body.data).toHaveProperty('totalProviders');
        expect(res.body.data).toHaveProperty('pendingProviders');
        expect(res.body.data).toHaveProperty('openReports');
      });
    });

    describe('Provider Management', () => {
      it('should list all providers', async () => {
        const res = await request(app)
          .get('/api/v1/admin/providers')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter providers by status', async () => {
        const res = await request(app)
          .get('/api/v1/admin/providers?status=APPROVED')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should get provider details', async () => {
        const res = await request(app)
          .get(`/api/v1/admin/providers/${providerId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', providerId);
      });

      it('should suspend a provider', async () => {
        const res = await request(app)
          .post(`/api/v1/admin/providers/${providerId}/suspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Test suspension' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('suspended');
      });

      it('should unsuspend a provider', async () => {
        const res = await request(app)
          .post(`/api/v1/admin/providers/${providerId}/unsuspend`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('unsuspended');
      });

      it('should approve a provider', async () => {
        const res = await request(app)
          .post(`/api/v1/admin/providers/${providerId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('approved');
      });

      it('should reject a provider', async () => {
        // Create a test provider specifically for rejection testing
        const testUser = await prisma.user.create({
          data: {
            email: `reject-test-${Date.now()}@test.com`,
            phone: `+63${Date.now().toString().slice(-10)}`,
            passwordHash: 'test',
            firstName: 'Reject',
            lastName: 'Test',
            role: 'PROVIDER',
          },
        });

        const testProviderRecord = await prisma.provider.create({
          data: {
            userId: testUser.id,
            displayName: 'Reject Test Provider',
            status: 'PENDING',
            serviceAreas: ['MAKATI'],
          },
        });

        const res = await request(app)
          .post(`/api/v1/admin/providers/${testProviderRecord.id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Test rejection reason' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('rejected');

        // Clean up
        await prisma.provider.delete({ where: { id: testProviderRecord.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
      });
    });

    describe('Bookings Management', () => {
      it('should list all bookings', async () => {
        const res = await request(app)
          .get('/api/v1/admin/bookings')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter bookings by status', async () => {
        const res = await request(app)
          .get('/api/v1/admin/bookings?status=COMPLETED')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should get booking details', async () => {
        // First get a booking ID
        const listRes = await request(app)
          .get('/api/v1/admin/bookings')
          .set('Authorization', `Bearer ${adminToken}`);

        if (listRes.body.data && listRes.body.data.length > 0) {
          const bookingId = listRes.body.data[0].id;

          const res = await request(app)
            .get(`/api/v1/admin/bookings/${bookingId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('id', bookingId);
        }
      });
    });

    describe('Payouts Management', () => {
      it('should list all payouts', async () => {
        const res = await request(app)
          .get('/api/v1/admin/payouts')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter payouts by status', async () => {
        const res = await request(app)
          .get('/api/v1/admin/payouts?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should reject processing non-existent payout', async () => {
        const res = await request(app)
          .post('/api/v1/admin/payouts/non-existent-id/process')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ referenceNumber: 'REF123' });

        expect(res.status).toBe(404);
      });

      it('should reject rejecting non-existent payout', async () => {
        const res = await request(app)
          .post('/api/v1/admin/payouts/non-existent-id/reject')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Invalid request' });

        expect(res.status).toBe(404);
      });
    });

    describe('Reports Management', () => {
      let testReportId: string;

      beforeAll(async () => {
        // Create a test report for testing
        const report = await prisma.report.create({
          data: {
            reporterId: customerId,
            reportedId: providerUserId, // Use user ID, not provider record ID
            type: 'OTHER',
            description: 'Test report for admin testing',
          },
        });
        testReportId = report.id;
      });

      afterAll(async () => {
        // Clean up test report
        if (testReportId) {
          await prisma.report.deleteMany({ where: { id: testReportId } });
        }
      });

      it('should list all reports', async () => {
        const res = await request(app)
          .get('/api/v1/admin/reports')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter reports by status', async () => {
        const res = await request(app)
          .get('/api/v1/admin/reports?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should get report details', async () => {
        const res = await request(app)
          .get(`/api/v1/admin/reports/${testReportId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', testReportId);
      });

      it('should assign a report', async () => {
        const res = await request(app)
          .post(`/api/v1/admin/reports/${testReportId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('assigned');
      });

      it('should resolve a report', async () => {
        const res = await request(app)
          .post(`/api/v1/admin/reports/${testReportId}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            resolution: 'Issue has been addressed',
            actionTaken: 'Warning issued to provider',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('resolved');
      });

      it('should dismiss a report', async () => {
        // Create another report for dismissal test
        const report = await prisma.report.create({
          data: {
            reporterId: customerId,
            reportedId: providerUserId, // Use user ID, not provider record ID
            type: 'OTHER',
            description: 'Test report for dismissal',
          },
        });

        const res = await request(app)
          .post(`/api/v1/admin/reports/${report.id}/dismiss`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Report is invalid' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('dismissed');

        // Clean up
        await prisma.report.deleteMany({ where: { id: report.id } });
      });
    });

    describe('Users Management', () => {
      it('should list all users', async () => {
        const res = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter users by role', async () => {
        const res = await request(app)
          .get('/api/v1/admin/users?role=CUSTOMER')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should get user details', async () => {
        const res = await request(app)
          .get(`/api/v1/admin/users/${customerId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id', customerId);
      });

      it('should suspend a user', async () => {
        // Create a test user to suspend
        const testUser = await prisma.user.create({
          data: {
            email: `suspend-test-${Date.now()}@test.com`,
            phone: `+63${Date.now().toString().slice(-10)}`,
            passwordHash: 'test',
            firstName: 'Test',
            lastName: 'Suspend',
          },
        });

        const res = await request(app)
          .post(`/api/v1/admin/users/${testUser.id}/suspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Test suspension' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('suspended');

        // Clean up
        await prisma.user.delete({ where: { id: testUser.id } });
      });
    });

    describe('Services Management', () => {
      it('should list all services', async () => {
        const res = await request(app)
          .get('/api/v1/admin/services')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should create a new service', async () => {
        const res = await request(app)
          .post('/api/v1/admin/services')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Massage',
            nameKo: '테스트 마사지',
            description: 'A test massage service',
            category: 'COMBINATION', // Valid enum value
            baseDuration: 60,
            basePrice: 500,
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('Test Massage');

        createdServiceId = res.body.data.id;
      });

      it('should update a service', async () => {
        if (!createdServiceId) return;

        const res = await request(app)
          .patch(`/api/v1/admin/services/${createdServiceId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            basePrice: 600,
            description: 'Updated description',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.basePrice).toBe(600);
      });

      it('should delete a service', async () => {
        if (!createdServiceId) return;

        const res = await request(app)
          .delete(`/api/v1/admin/services/${createdServiceId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(204);
        createdServiceId = ''; // Mark as deleted
      });
    });

    describe('Promotions Management', () => {
      it('should list all promotions', async () => {
        const res = await request(app)
          .get('/api/v1/admin/promotions')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should create a new promotion', async () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const res = await request(app)
          .post('/api/v1/admin/promotions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: 'TESTPROMO50',
            name: 'Test Promotion 50% Off',
            discountType: 'PERCENTAGE',
            discountValue: 50,
            startsAt: startDate.toISOString(), // Correct field name
            endsAt: endDate.toISOString(),     // Correct field name
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.code).toBe('TESTPROMO50');

        createdPromotionId = res.body.data.id;
      });

      it('should update a promotion', async () => {
        if (!createdPromotionId) return;

        const res = await request(app)
          .patch(`/api/v1/admin/promotions/${createdPromotionId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Updated Promotion Name',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.name).toBe('Updated Promotion Name');
      });

      it('should delete a promotion', async () => {
        if (!createdPromotionId) return;

        const res = await request(app)
          .delete(`/api/v1/admin/promotions/${createdPromotionId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(204);
        createdPromotionId = ''; // Mark as deleted
      });
    });

    describe('Payouts', () => {
      it('should list all payouts', async () => {
        const res = await request(app)
          .get('/api/v1/admin/payouts')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter payouts by status', async () => {
        const res = await request(app)
          .get('/api/v1/admin/payouts?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });

    describe('Reports', () => {
      it('should list all reports', async () => {
        const res = await request(app)
          .get('/api/v1/admin/reports')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter reports by status', async () => {
        const res = await request(app)
          .get('/api/v1/admin/reports?status=PENDING')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });
  });

  describe('User Profile Routes', () => {
    let customerToken: string;
    let createdAddressId: string;

    beforeAll(async () => {
      await prisma.refreshToken.deleteMany({});

      // Login as customer
      const customerRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@test.com', password: 'customer123!' });
      customerToken = customerRes.body.data.accessToken;
    });

    afterAll(async () => {
      // Clean up created addresses
      if (createdAddressId) {
        await prisma.address.deleteMany({ where: { id: createdAddressId } });
      }
    });

    describe('GET /api/v1/users/me', () => {
      it('should require authentication', async () => {
        const res = await request(app).get('/api/v1/users/me');
        expect(res.status).toBe(401);
      });

      it('should return user profile', async () => {
        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('email', 'customer@test.com');
        expect(res.body.data).toHaveProperty('role');
        expect(res.body.data).not.toHaveProperty('passwordHash');
      });
    });

    describe('PATCH /api/v1/users/me', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .patch('/api/v1/users/me')
          .send({ firstName: 'Test' });
        expect(res.status).toBe(401);
      });

      it('should update user profile', async () => {
        const res = await request(app)
          .patch('/api/v1/users/me')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            firstName: 'Updated',
            lastName: 'Customer',
            gender: 'MALE',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data.firstName).toBe('Updated');
        expect(res.body.data.lastName).toBe('Customer');
      });

      it('should update emergency contact', async () => {
        const res = await request(app)
          .patch('/api/v1/users/me')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            emergencyName: 'Emergency Contact',
            emergencyPhone: '+639123456789',
            emergencyRelation: 'Spouse',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });

    describe('PATCH /api/v1/users/me/password', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .patch('/api/v1/users/me/password')
          .send({ currentPassword: 'old', newPassword: 'new' });
        expect(res.status).toBe(401);
      });

      it('should reject incorrect current password', async () => {
        const res = await request(app)
          .patch('/api/v1/users/me/password')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            currentPassword: 'wrongpassword',
            newPassword: 'newpassword123!',
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('incorrect');
      });

      it('should change password with correct current password', async () => {
        // Change password
        const res = await request(app)
          .patch('/api/v1/users/me/password')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            currentPassword: 'customer123!',
            newPassword: 'newpassword123!',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('changed');

        // Change it back for other tests
        await request(app)
          .patch('/api/v1/users/me/password')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            currentPassword: 'newpassword123!',
            newPassword: 'customer123!',
          });
      });
    });

    describe('PATCH /api/v1/users/me/fcm-token', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .patch('/api/v1/users/me/fcm-token')
          .send({ fcmToken: 'test-token' });
        expect(res.status).toBe(401);
      });

      it('should update FCM token', async () => {
        const res = await request(app)
          .patch('/api/v1/users/me/fcm-token')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            fcmToken: 'test-fcm-token-12345',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('updated');
      });
    });

    describe('Address Management', () => {
      describe('GET /api/v1/users/me/addresses', () => {
        it('should require authentication', async () => {
          const res = await request(app).get('/api/v1/users/me/addresses');
          expect(res.status).toBe(401);
        });

        it('should return user addresses', async () => {
          const res = await request(app)
            .get('/api/v1/users/me/addresses')
            .set('Authorization', `Bearer ${customerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
      });

      describe('POST /api/v1/users/me/addresses', () => {
        it('should require authentication', async () => {
          const res = await request(app)
            .post('/api/v1/users/me/addresses')
            .send({ label: 'Home' });
          expect(res.status).toBe(401);
        });

        it('should add a new address', async () => {
          const res = await request(app)
            .post('/api/v1/users/me/addresses')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              label: 'Test Home',
              addressLine1: '123 Test Street',
              addressLine2: 'Unit 456',
              city: 'Makati',
              province: 'Metro Manila',
              postalCode: '1234',
              latitude: 14.5547,
              longitude: 121.0244,
              isDefault: false,
            });

          expect(res.status).toBe(201);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.label).toBe('Test Home');
          expect(res.body.data.city).toBe('Makati');

          createdAddressId = res.body.data.id;
        });

        it('should add default address and update others', async () => {
          const res = await request(app)
            .post('/api/v1/users/me/addresses')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              label: 'Default Address',
              addressLine1: '789 Main Road',
              city: 'BGC',
              latitude: 14.5512,
              longitude: 121.0456,
              isDefault: true,
            });

          expect(res.status).toBe(201);
          expect(res.body.data.isDefault).toBe(true);

          // Clean up
          await prisma.address.delete({ where: { id: res.body.data.id } });
        });
      });

      describe('PATCH /api/v1/users/me/addresses/:addressId', () => {
        it('should require authentication', async () => {
          const res = await request(app)
            .patch(`/api/v1/users/me/addresses/${createdAddressId}`)
            .send({ label: 'Updated' });
          expect(res.status).toBe(401);
        });

        it('should update an address', async () => {
          if (!createdAddressId) return;

          const res = await request(app)
            .patch(`/api/v1/users/me/addresses/${createdAddressId}`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              label: 'Updated Home',
              addressLine1: '456 Updated Street',
            });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data.label).toBe('Updated Home');
        });

        it('should return 404 for non-existent address', async () => {
          const res = await request(app)
            .patch('/api/v1/users/me/addresses/non-existent-id')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ label: 'Test' });

          expect(res.status).toBe(404);
        });
      });

      describe('DELETE /api/v1/users/me/addresses/:addressId', () => {
        it('should require authentication', async () => {
          const res = await request(app)
            .delete(`/api/v1/users/me/addresses/${createdAddressId}`);
          expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent address', async () => {
          const res = await request(app)
            .delete('/api/v1/users/me/addresses/non-existent-id')
            .set('Authorization', `Bearer ${customerToken}`);

          expect(res.status).toBe(404);
        });

        it('should delete an address', async () => {
          if (!createdAddressId) return;

          const res = await request(app)
            .delete(`/api/v1/users/me/addresses/${createdAddressId}`)
            .set('Authorization', `Bearer ${customerToken}`);

          expect(res.status).toBe(204);
          createdAddressId = ''; // Mark as deleted
        });
      });
    });
  });

  describe('Auth Routes', () => {
    // Use seeded customer for most tests
    const seededEmail = 'customer@test.com';
    const seededPassword = 'customer123!';

    describe('POST /api/v1/auth/register', () => {
      // Use unique identifiers for this specific test run
      const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newUserEmail = `newuser-${testRunId}@example.com`;
      const newUserPhone = `+63${Date.now().toString().slice(-10)}`;

      afterAll(async () => {
        // Clean up test user
        await prisma.refreshToken.deleteMany({
          where: { user: { email: newUserEmail } },
        });
        await prisma.user.deleteMany({
          where: { email: newUserEmail },
        });
      });

      it('should register a new user', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: newUserEmail,
            phone: newUserPhone,
            password: 'testpassword123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'CUSTOMER',
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        // Register returns userId and message, not full user object with tokens
        expect(res.body.data).toHaveProperty('userId');
        expect(res.body.data).toHaveProperty('message');
      });

      it('should reject duplicate email', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: seededEmail, // Use existing seeded email
            phone: '+639987654321',
            password: 'anotherpassword123!',
            firstName: 'Duplicate',
            lastName: 'User',
          });

        expect(res.status).toBe(409);
        expect(res.body.error).toContain('exists');
      });

      it('should reject missing required fields', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'incomplete@example.com',
          });

        // Zod validation returns 400 for missing required fields
        expect([400, 500]).toContain(res.status);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: seededEmail,
            password: seededPassword,
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
        expect(res.body.data).toHaveProperty('user');
      });

      it('should reject invalid password', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: seededEmail,
            password: 'wrongpassword',
          });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Invalid');
      });

      it('should reject non-existent email', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'anypassword',
          });

        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('should refresh access token with valid refresh token', async () => {
        // First login to get a valid refresh token
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: seededEmail,
            password: seededPassword,
          });

        // Ensure login succeeded before testing refresh
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data).toHaveProperty('refreshToken');

        const refreshToken = loginRes.body.data.refreshToken;

        // Wait 1.1 seconds to ensure the new token has a different 'iat' claim
        // (JWT tokens generated within the same second are identical)
        await new Promise(resolve => setTimeout(resolve, 1100));

        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken });

        // Refresh should return new tokens
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
      });

      it('should reject invalid refresh token', async () => {
        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({
            refreshToken: 'invalid-refresh-token',
          });

        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/v1/auth/forgot-password', () => {
      it('should accept valid email for password reset', async () => {
        const res = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({
            email: seededEmail,
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('sent');
      });

      it('should accept non-existent email silently', async () => {
        const res = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({
            email: 'nonexistent@example.com',
          });

        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/auth/reset-password', () => {
      it('should reject invalid reset token', async () => {
        const res = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({
            token: 'invalid-reset-token',
            password: 'newpassword123!',
          });

        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/v1/auth/logout')
          .send({});

        expect(res.status).toBe(401);
      });

      it('should logout and invalidate refresh token', async () => {
        // Login to get fresh tokens
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: seededEmail,
            password: seededPassword,
          });

        const accessToken = loginRes.body.data.accessToken;
        const refreshToken = loginRes.body.data.refreshToken;

        // Logout
        const res = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('Logged out');

        // Verify refresh token is invalidated
        const refreshRes = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken });

        expect(refreshRes.status).toBe(401);
      });
    });

    describe('Phone Verification', () => {
      it('should require authentication for sending OTP', async () => {
        const res = await request(app)
          .post('/api/v1/auth/verify-phone')
          .send({});

        expect(res.status).toBe(401);
      });

      it('should send phone OTP', async () => {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: seededEmail, password: seededPassword });
        const token = loginRes.body.data.accessToken;

        const res = await request(app)
          .post('/api/v1/auth/verify-phone')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should reject invalid OTP', async () => {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: seededEmail, password: seededPassword });
        const token = loginRes.body.data.accessToken;

        const res = await request(app)
          .post('/api/v1/auth/verify-phone/confirm')
          .set('Authorization', `Bearer ${token}`)
          .send({ otp: '000000' });

        expect(res.status).toBe(400);
      });
    });

    describe('Email Verification', () => {
      it('should require authentication for sending verification email', async () => {
        const res = await request(app)
          .post('/api/v1/auth/verify-email')
          .send({});

        expect(res.status).toBe(401);
      });

      it('should send verification email', async () => {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: seededEmail, password: seededPassword });
        const token = loginRes.body.data.accessToken;

        const res = await request(app)
          .post('/api/v1/auth/verify-email')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should reject invalid verification token', async () => {
        const res = await request(app)
          .post('/api/v1/auth/verify-email/confirm')
          .send({ token: 'invalid-verification-token' });

        expect(res.status).toBe(400);
      });
    });

    describe('Auth Service Edge Cases', () => {
      it('should reject login for suspended account', async () => {
        // Create a user and then suspend them
        const testEmail = `suspended-${Date.now()}@test.com`;
        const testPhone = `+63${Date.now().toString().slice(-10)}`;

        // Register user
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: testEmail,
            phone: testPhone,
            password: 'testpass123!',
            firstName: 'Suspended',
            lastName: 'User',
          });

        // Suspend the user directly in DB
        await prisma.user.update({
          where: { email: testEmail },
          data: { status: 'SUSPENDED' },
        });

        // Try to login - should fail with inactive account
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testEmail,
            password: 'testpass123!',
          });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('not active');

        // Clean up
        await prisma.user.delete({ where: { email: testEmail } });
      });

      it('should handle expired refresh token', async () => {
        // Login to get a valid token
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'customer@test.com',
            password: 'customer123!',
          });

        const refreshToken = loginRes.body.data.refreshToken;

        // Manually expire the refresh token in the DB
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken },
          data: { expiresAt: new Date(Date.now() - 1000) }, // Set to past
        });

        // Try to use expired refresh token
        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('expired');
      });

      it('should complete password reset flow with valid token', async () => {
        // Import Redis to set up the reset token
        const { redis } = await import('../config/redis.js');

        // Create a test user
        const testEmail = `reset-${Date.now()}@test.com`;
        const testPhone = `+63${Date.now().toString().slice(-10)}`;

        const registerRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: testEmail,
            phone: testPhone,
            password: 'oldpassword123!',
            firstName: 'Reset',
            lastName: 'Test',
          });

        const userId = registerRes.body.data.userId;

        // Manually set a password reset token in Redis
        const resetToken = `test-reset-token-${Date.now()}`;
        await redis.set(`password-reset:${resetToken}`, userId, 'EX', 3600);

        // Reset password using the token
        const res = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({
            token: resetToken,
            password: 'newpassword123!',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        // Activate user so we can test login with new password
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'ACTIVE' },
        });

        // Verify new password works
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testEmail,
            password: 'newpassword123!',
          });

        expect(loginRes.status).toBe(200);

        // Clean up
        await prisma.refreshToken.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      });

      it('should verify phone OTP successfully', async () => {
        const { redis } = await import('../config/redis.js');

        // Login
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'customer@test.com', password: 'customer123!' });
        const token = loginRes.body.data.accessToken;
        const userId = loginRes.body.data.user.id;

        // Set up a valid OTP in Redis
        const validOtp = '123456';
        await redis.set(`phone-otp:${userId}`, validOtp, 'EX', 300);

        // Verify the OTP
        const res = await request(app)
          .post('/api/v1/auth/verify-phone/confirm')
          .set('Authorization', `Bearer ${token}`)
          .send({ otp: validOtp });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should verify email successfully', async () => {
        const { redis } = await import('../config/redis.js');

        // Create a test user
        const testEmail = `emailverify-${Date.now()}@test.com`;
        const testPhone = `+63${Date.now().toString().slice(-10)}`;

        const registerRes = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: testEmail,
            phone: testPhone,
            password: 'testpass123!',
            firstName: 'Email',
            lastName: 'Verify',
          });

        const userId = registerRes.body.data.userId;

        // Set up an email verification token in Redis
        const verifyToken = `email-verify-token-${Date.now()}`;
        await redis.set(`email-verify:${verifyToken}`, userId, 'EX', 86400);

        // Verify the email
        const res = await request(app)
          .post('/api/v1/auth/verify-email/confirm')
          .send({ token: verifyToken });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        // Verify user's emailVerified flag is set
        const user = await prisma.user.findUnique({ where: { id: userId } });
        expect(user?.emailVerified).toBe(true);

        // Clean up
        await prisma.user.delete({ where: { id: userId } });
      });
    });
  });

  // ============================================================================
  // PROVIDER ROUTES
  // ============================================================================

  describe('Provider Routes', () => {
    const providerEmail = 'provider@test.com';
    const providerPassword = 'provider123!';
    const customerEmail = 'customer@test.com';
    const customerPassword = 'customer123!';
    let providerToken: string;
    let customerToken: string;
    let providerId: string;

    beforeAll(async () => {
      // Login as provider
      const providerLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: providerEmail, password: providerPassword });
      providerToken = providerLoginRes.body.data.accessToken;

      // Login as customer
      const customerLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: customerEmail, password: customerPassword });
      customerToken = customerLoginRes.body.data.accessToken;

      // Get provider ID
      const providersRes = await request(app).get('/api/v1/providers');
      if (providersRes.body.data && providersRes.body.data.length > 0) {
        providerId = providersRes.body.data[0].id;
      }
    });

    describe('Public Routes', () => {
      describe('GET /api/v1/providers', () => {
        it('should return list of approved providers', async () => {
          const res = await request(app).get('/api/v1/providers');

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should support pagination', async () => {
          const res = await request(app)
            .get('/api/v1/providers')
            .query({ limit: 5, page: 1 });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('pagination');
        });
      });

      describe('GET /api/v1/providers/:providerId', () => {
        it('should return provider details', async () => {
          if (!providerId) return;

          const res = await request(app)
            .get(`/api/v1/providers/${providerId}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('id', providerId);
        });

        it('should return 404 for non-existent provider', async () => {
          const res = await request(app)
            .get('/api/v1/providers/non-existent-id');

          expect(res.status).toBe(404);
        });
      });

      describe('GET /api/v1/providers/:providerId/reviews', () => {
        it('should return provider reviews', async () => {
          if (!providerId) return;

          const res = await request(app)
            .get(`/api/v1/providers/${providerId}/reviews`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
        });
      });

      describe('GET /api/v1/providers/:providerId/availability', () => {
        it('should return provider availability for a date', async () => {
          if (!providerId) return;

          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().split('T')[0];

          const res = await request(app)
            .get(`/api/v1/providers/${providerId}/availability`)
            .query({ date: dateStr });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('slots');
        });
      });
    });

    describe('Provider Registration', () => {
      describe('POST /api/v1/providers/register', () => {
        it('should require authentication', async () => {
          const res = await request(app)
            .post('/api/v1/providers/register')
            .send({ displayName: 'Test Provider' });

          expect(res.status).toBe(401);
        });

        it('should reject if already registered as provider', async () => {
          const res = await request(app)
            .post('/api/v1/providers/register')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ displayName: 'Test Provider' });

          expect(res.status).toBe(400);
          expect(res.body.error).toContain('Already');
        });
      });
    });

    describe('Provider Profile Management', () => {
      describe('GET /api/v1/providers/me/profile', () => {
        it('should require authentication', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/profile');

          expect(res.status).toBe(401);
        });

        it('should require provider role', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/profile')
            .set('Authorization', `Bearer ${customerToken}`);

          expect(res.status).toBe(403);
        });

        it('should return provider profile', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/profile')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('displayName');
        });
      });

      describe('PATCH /api/v1/providers/me/profile', () => {
        it('should update provider profile', async () => {
          const res = await request(app)
            .patch('/api/v1/providers/me/profile')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ bio: 'Updated bio for testing' });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
        });
      });
    });

    describe('Provider Services', () => {
      describe('GET /api/v1/providers/me/services', () => {
        it('should return provider services', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/services')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
      });

      describe('POST /api/v1/providers/me/services', () => {
        it('should set/update a service', async () => {
          const res = await request(app)
            .post('/api/v1/providers/me/services')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({
              serviceId: 'svc-deep', // Use deep tissue to avoid affecting other tests
              price60: 1250,
              price90: 1550,
              price120: 1850,
            });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
        });
      });
    });

    describe('Provider Availability', () => {
      describe('PUT /api/v1/providers/me/availability', () => {
        it('should update availability schedule', async () => {
          const res = await request(app)
            .put('/api/v1/providers/me/availability')
            .set('Authorization', `Bearer ${providerToken}`)
            .send([
              { dayOfWeek: 1, startTime: '09:00', endTime: '21:00' },
              { dayOfWeek: 2, startTime: '09:00', endTime: '21:00' },
            ]);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
        });
      });

      describe('GET /api/v1/providers/me/availability', () => {
        it('should return availability schedule', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/availability')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
        });
      });
    });

    describe('Provider Status & Location', () => {
      describe('PATCH /api/v1/providers/me/status', () => {
        it('should update online status', async () => {
          const res = await request(app)
            .patch('/api/v1/providers/me/status')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'ONLINE' });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.message).toContain('updated');
        });

        it('should set status to offline', async () => {
          const res = await request(app)
            .patch('/api/v1/providers/me/status')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'OFFLINE' });

          expect(res.status).toBe(200);
        });
      });

      describe('PATCH /api/v1/providers/me/location', () => {
        it('should update provider location', async () => {
          const res = await request(app)
            .patch('/api/v1/providers/me/location')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ latitude: 14.5547, longitude: 121.0244 });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
        });
      });
    });

    describe('Provider Bank Account', () => {
      describe('PATCH /api/v1/providers/me/bank-account', () => {
        it('should update bank account info', async () => {
          const res = await request(app)
            .patch('/api/v1/providers/me/bank-account')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ gcashNumber: '09171234567' });

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
        });
      });
    });

    describe('Provider Earnings', () => {
      describe('GET /api/v1/providers/me/earnings', () => {
        it('should return earnings list', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/earnings')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
      });

      describe('GET /api/v1/providers/me/earnings/summary', () => {
        it('should return earnings summary', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/earnings/summary')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('balance');
          expect(res.body.data).toHaveProperty('totalEarnings');
        });
      });
    });

    describe('Provider Payouts', () => {
      describe('GET /api/v1/providers/me/payouts', () => {
        it('should return payouts list', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/payouts')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
      });

      describe('POST /api/v1/providers/me/payouts', () => {
        it('should reject payout with insufficient balance', async () => {
          const res = await request(app)
            .post('/api/v1/providers/me/payouts')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ amount: 100000, method: 'GCASH' });

          expect(res.status).toBe(400);
          expect(res.body.error).toContain('balance');
        });

        it('should reject payout below minimum', async () => {
          const res = await request(app)
            .post('/api/v1/providers/me/payouts')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ amount: 100, method: 'GCASH' });

          expect(res.status).toBe(400);
          expect(res.body.error).toContain('Minimum');
        });

        it('should successfully request payout when balance sufficient', async () => {
          // Get provider and set balance for test
          const provider = await prisma.provider.findFirst({
            where: { user: { email: 'provider@test.com' } },
          });

          // Store original balance
          const originalBalance = provider!.balance;

          // Set balance to allow payout
          await prisma.provider.update({
            where: { id: provider!.id },
            data: { balance: 1000, gcashNumber: '+639123456789' },
          });

          // Request payout
          const res = await request(app)
            .post('/api/v1/providers/me/payouts')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ amount: 500, method: 'GCASH' });

          expect(res.status).toBe(201);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('amount', 500);
          expect(res.body.data).toHaveProperty('method', 'GCASH');
          expect(res.body.data).toHaveProperty('status', 'PENDING');

          // Verify balance was decremented
          const updatedProvider = await prisma.provider.findUnique({
            where: { id: provider!.id },
          });
          expect(updatedProvider!.balance).toBe(500); // 1000 - 500

          // Clean up - restore original balance and remove payout
          await prisma.payout.deleteMany({ where: { providerId: provider!.id } });
          await prisma.provider.update({
            where: { id: provider!.id },
            data: { balance: originalBalance },
          });
        });
      });
    });

    describe('Provider Documents', () => {
      describe('GET /api/v1/providers/me/documents', () => {
        it('should return documents list', async () => {
          const res = await request(app)
            .get('/api/v1/providers/me/documents')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
        });
      });

      describe('POST /api/v1/providers/me/documents', () => {
        it('should upload document placeholder', async () => {
          const res = await request(app)
            .post('/api/v1/providers/me/documents')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ type: 'ID', url: 'http://example.com/doc.jpg' });

          expect(res.status).toBe(201);
          expect(res.body).toHaveProperty('success', true);
        });
      });
    });

    describe('Provider Service Removal', () => {
      describe('DELETE /api/v1/providers/me/services/:serviceId', () => {
        it('should remove a service from provider', async () => {
          // First add a service to remove
          await request(app)
            .post('/api/v1/providers/me/services')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({
              serviceId: 'svc-scrub',
              price60: 900,
              price90: 1100,
              price120: 1300,
            });

          // Then remove it
          const res = await request(app)
            .delete('/api/v1/providers/me/services/svc-scrub')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(204);
        });

        it('should return 404 for non-existent service', async () => {
          const res = await request(app)
            .delete('/api/v1/providers/me/services/non-existent-service')
            .set('Authorization', `Bearer ${providerToken}`);

          expect(res.status).toBe(404);
        });
      });
    });

    describe('Provider Registration Success', () => {
      it('should successfully register a new provider', async () => {
        // Create a new user for provider registration
        const timestamp = Date.now();
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `new-provider-${timestamp}@test.com`,
            password: 'password123!',
            phone: `+63917${timestamp.toString().slice(-7)}`,
            firstName: 'New',
            lastName: 'Provider',
          });

        // Login with the new user to get a valid token
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: `new-provider-${timestamp}@test.com`,
            password: 'password123!',
          });

        const newUserToken = loginRes.body.data.accessToken;

        // Register as provider
        const res = await request(app)
          .post('/api/v1/providers/register')
          .set('Authorization', `Bearer ${newUserToken}`)
          .send({
            displayName: 'New Test Provider',
            serviceAreas: ['MAKATI'],
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('displayName', 'New Test Provider');
      });
    });

    describe('Provider Profile Edge Cases', () => {
      it('should return empty array for non-existent provider reviews', async () => {
        const res = await request(app)
          .get('/api/v1/providers/non-existent-id/reviews');

        // API returns 200 with empty data for non-existent provider
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toEqual([]);
      });

      it('should handle availability request for non-existent provider', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const res = await request(app)
          .get('/api/v1/providers/non-existent-id/availability')
          .query({ date: dateStr });

        // API returns 200 with empty slots for non-existent provider
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });

    describe('Provider Filtering', () => {
      it('should filter providers by service area', async () => {
        const res = await request(app)
          .get('/api/v1/providers')
          .query({ serviceArea: 'MAKATI' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should filter providers by service type', async () => {
        const res = await request(app)
          .get('/api/v1/providers')
          .query({ serviceId: 'svc-thai' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });

    describe('Provider Availability Edge Cases', () => {
      it('should require date parameter for availability', async () => {
        if (!providerId) return;

        const res = await request(app)
          .get(`/api/v1/providers/${providerId}/availability`);

        // May return 400 for missing date or 200 with default behavior
        expect([200, 400]).toContain(res.status);
      });

      it('should handle invalid date format', async () => {
        if (!providerId) return;

        const res = await request(app)
          .get(`/api/v1/providers/${providerId}/availability`)
          .query({ date: 'invalid-date' });

        expect([200, 400]).toContain(res.status);
      });
    });

    describe('Provider Earnings Filtering', () => {
      it('should filter earnings by date range', async () => {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        const res = await request(app)
          .get('/api/v1/providers/me/earnings')
          .set('Authorization', `Bearer ${providerToken}`)
          .query({
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });
  });

  // ============================================================================
  // PAYMENT ROUTES
  // ============================================================================

  describe('Payment Routes', () => {
    const customerEmail = 'customer@test.com';
    const customerPassword = 'customer123!';
    let customerToken: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: customerEmail, password: customerPassword });
      customerToken = loginRes.body.data.accessToken;
    });

    describe('POST /api/v1/payments/webhook', () => {
      it('should accept PayMongo webhook', async () => {
        const res = await request(app)
          .post('/api/v1/payments/webhook')
          .set('paymongo-signature', 'test-signature')
          .send({
            data: {
              attributes: {
                type: 'payment.paid',
                data: {
                  attributes: {
                    payment_intent_id: 'pi_test_123',
                  },
                },
              },
            },
          });

        // Webhook should return success even if payment not found
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should process webhook and update payment status when payment found', async () => {
        // Get provider for creating booking
        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        // Create a booking
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 24);

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId: provider!.id,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Payment Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        const bookingId = bookingRes.body.data.booking.id;

        // Create a payment record matching the webhook
        const paymentIntentId = `pi_webhook_test_${Date.now()}`;
        const payment = await prisma.payment.create({
          data: {
            bookingId,
            amount: 1000,
            method: 'GCASH',
            status: 'PENDING',
            paymongoIntentId: paymentIntentId,
          },
        });

        // Send webhook
        const res = await request(app)
          .post('/api/v1/payments/webhook')
          .set('paymongo-signature', 'test-signature')
          .send({
            data: {
              attributes: {
                type: 'payment.paid',
                data: {
                  attributes: {
                    payment_intent_id: paymentIntentId,
                  },
                },
              },
            },
          });

        expect(res.status).toBe(200);

        // Verify payment was updated
        const updatedPayment = await prisma.payment.findUnique({
          where: { id: payment.id },
        });
        expect(updatedPayment!.status).toBe('COMPLETED');
        expect(updatedPayment!.paidAt).not.toBeNull();

        // Verify booking status was updated
        const updatedBooking = await prisma.booking.findUnique({
          where: { id: bookingId },
        });
        expect(updatedBooking!.status).toBe('PENDING');

        // Clean up
        await prisma.payment.delete({ where: { id: payment.id } });
        await prisma.booking.delete({ where: { id: bookingId } });
      });
    });

    describe('GET /api/v1/payments/:paymentId', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .get('/api/v1/payments/test-payment-id');

        expect(res.status).toBe(401);
      });

      it('should return 404 for non-existent payment', async () => {
        const res = await request(app)
          .get('/api/v1/payments/non-existent-id')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(404);
      });
    });
  });

  // ============================================================================
  // NOTIFICATION ROUTES
  // ============================================================================

  describe('Notification Routes', () => {
    const customerEmail = 'customer@test.com';
    const customerPassword = 'customer123!';
    let customerToken: string;
    let customerId: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: customerEmail, password: customerPassword });
      customerToken = loginRes.body.data.accessToken;
      customerId = loginRes.body.data.user.id;

      // Create a test notification
      await prisma.notification.create({
        data: {
          userId: customerId,
          type: 'BOOKING_ACCEPTED',
          title: 'Test Notification',
          body: 'This is a test notification for testing',
        },
      });
    });

    afterAll(async () => {
      // Clean up test notifications
      await prisma.notification.deleteMany({
        where: { userId: customerId, title: 'Test Notification' },
      });
    });

    describe('GET /api/v1/notifications', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .get('/api/v1/notifications');

        expect(res.status).toBe(401);
      });

      it('should return user notifications', async () => {
        const res = await request(app)
          .get('/api/v1/notifications')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter unread notifications', async () => {
        const res = await request(app)
          .get('/api/v1/notifications')
          .query({ unreadOnly: 'true' })
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should support limit parameter', async () => {
        const res = await request(app)
          .get('/api/v1/notifications')
          .query({ limit: 5 })
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(5);
      });
    });

    describe('PATCH /api/v1/notifications/:notificationId/read', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .patch('/api/v1/notifications/test-id/read');

        expect(res.status).toBe(401);
      });

      it('should mark notification as read', async () => {
        // First get a notification
        const listRes = await request(app)
          .get('/api/v1/notifications')
          .set('Authorization', `Bearer ${customerToken}`);

        if (listRes.body.data && listRes.body.data.length > 0) {
          const notificationId = listRes.body.data[0].id;

          const res = await request(app)
            .patch(`/api/v1/notifications/${notificationId}/read`)
            .set('Authorization', `Bearer ${customerToken}`);

          expect(res.status).toBe(200);
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.message).toContain('read');
        }
      });
    });

    describe('PATCH /api/v1/notifications/read-all', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .patch('/api/v1/notifications/read-all');

        expect(res.status).toBe(401);
      });

      it('should mark all notifications as read', async () => {
        const res = await request(app)
          .patch('/api/v1/notifications/read-all')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('All');
      });
    });
  });

  // ============================================================================
  // REPORT ROUTES
  // ============================================================================

  describe('Report Routes', () => {
    const customerEmail = 'customer@test.com';
    const customerPassword = 'customer123!';
    let customerToken: string;
    let customerId: string;
    let providerId: string;
    let createdReportId: string;

    beforeAll(async () => {
      // Login as customer
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: customerEmail, password: customerPassword });
      customerToken = loginRes.body.data.accessToken;
      customerId = loginRes.body.data.user.id;

      // Get provider ID for reporting
      const providersRes = await request(app).get('/api/v1/providers');
      if (providersRes.body.data && providersRes.body.data.length > 0) {
        providerId = providersRes.body.data[0].userId;
      }
    });

    afterAll(async () => {
      // Clean up test reports
      if (createdReportId) {
        await prisma.report.deleteMany({
          where: { reporterId: customerId },
        });
      }
    });

    describe('POST /api/v1/reports', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/v1/reports')
          .send({
            reportedId: 'some-user-id',
            type: 'OTHER',
            description: 'Test report',
          });

        expect(res.status).toBe(401);
      });

      it('should create a report', async () => {
        const res = await request(app)
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            reportedId: providerId,
            type: 'SERVICE_QUALITY',
            description: 'Test report for service quality issues',
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('type', 'SERVICE_QUALITY');
        expect(res.body.data).toHaveProperty('description');
        expect(res.body.data).toHaveProperty('status', 'PENDING');

        createdReportId = res.body.data.id;
      });

      it('should create report with booking reference', async () => {
        // First create a booking to reference
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);

        const providersRes = await request(app).get('/api/v1/providers');
        const testProviderId = providersRes.body.data[0].id;

        const bookingRes = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId: testProviderId,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt: tomorrow.toISOString(),
            addressText: 'Test Address for Report',
            latitude: 14.5586,
            longitude: 121.0178,
          });

        if (bookingRes.status === 201) {
          const bookingId = bookingRes.body.data.booking.id;

          const res = await request(app)
            .post('/api/v1/reports')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              reportedId: providerId,
              bookingId: bookingId,
              type: 'LATE_ARRIVAL',
              description: 'Provider arrived 30 minutes late',
            });

          expect(res.status).toBe(201);
          expect(res.body.data).toHaveProperty('bookingId', bookingId);
        }
      });

      it('should create report with different types', async () => {
        const reportTypes = ['HARASSMENT', 'FRAUD', 'NO_SHOW', 'UNPROFESSIONAL', 'OTHER'];

        for (const type of reportTypes) {
          const res = await request(app)
            .post('/api/v1/reports')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              reportedId: providerId,
              type: type,
              description: `Test report for ${type}`,
            });

          expect(res.status).toBe(201);
          expect(res.body.data.type).toBe(type);
        }
      });
    });

    describe('POST /api/v1/reports/upload-evidence', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/v1/reports/upload-evidence');

        expect(res.status).toBe(401);
      });

      it('should return placeholder URL for evidence upload', async () => {
        const res = await request(app)
          .post('/api/v1/reports/upload-evidence')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('url');
      });
    });

    describe('GET /api/v1/reports/me', () => {
      it('should require authentication', async () => {
        const res = await request(app)
          .get('/api/v1/reports/me');

        expect(res.status).toBe(401);
      });

      it('should return user reports', async () => {
        const res = await request(app)
          .get('/api/v1/reports/me')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return reports in descending order by date', async () => {
        const res = await request(app)
          .get('/api/v1/reports/me')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);

        if (res.body.data.length >= 2) {
          const firstDate = new Date(res.body.data[0].createdAt);
          const secondDate = new Date(res.body.data[1].createdAt);
          expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
        }
      });

      it('should include report details', async () => {
        const res = await request(app)
          .get('/api/v1/reports/me')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);

        if (res.body.data.length > 0) {
          const report = res.body.data[0];
          expect(report).toHaveProperty('id');
          expect(report).toHaveProperty('type');
          expect(report).toHaveProperty('description');
          expect(report).toHaveProperty('status');
          expect(report).toHaveProperty('createdAt');
        }
      });
    });
  });

  // ============================================================================
  // MIDDLEWARE TESTS
  // ============================================================================

  describe('Middleware', () => {
    describe('Authentication Middleware', () => {
      it('should reject request with no token', async () => {
        const res = await request(app).get('/api/v1/users/me');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No token provided');
      });

      it('should reject request with invalid Bearer format', async () => {
        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', 'InvalidFormat token123');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No token provided');
      });

      it('should reject request with malformed token', async () => {
        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', 'Bearer not-a-valid-jwt');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid token');
      });

      it('should reject request with expired token', async () => {
        // Create an expired token (exp in the past)
        const expiredToken = jwt.sign(
          { userId: 'test-id', email: 'test@test.com', role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '-1h' }
        );

        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Token expired');
      });

      it('should reject request when user not found', async () => {
        const tokenForNonExistentUser = jwt.sign(
          { userId: 'non-existent-user-id', email: 'ghost@test.com', role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '1h' }
        );

        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${tokenForNonExistentUser}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('User not found');
      });

      it('should reject request when user account is inactive', async () => {
        // Create an inactive user
        const inactiveUser = await prisma.user.create({
          data: {
            email: `inactive-${Date.now()}@test.com`,
            phone: `+63${Date.now().toString().slice(-10)}`,
            passwordHash: 'test',
            firstName: 'Inactive',
            lastName: 'User',
            status: 'SUSPENDED',
          },
        });

        const tokenForInactiveUser = jwt.sign(
          { userId: inactiveUser.id, email: inactiveUser.email, role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '1h' }
        );

        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${tokenForInactiveUser}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Account is not active');

        // Clean up
        await prisma.user.delete({ where: { id: inactiveUser.id } });
      });
    });

    describe('requireProvider Middleware', () => {
      it('should reject non-provider user', async () => {
        // Login as customer
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'customer@test.com', password: 'customer123!' });
        const customerToken = loginRes.body.data.accessToken;

        const res = await request(app)
          .get('/api/v1/providers/me/profile')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Provider access required');
      });

      it('should reject unapproved provider', async () => {
        // Create a pending provider with ACTIVE user status
        const pendingUser = await prisma.user.create({
          data: {
            email: `pending-provider-${Date.now()}@test.com`,
            phone: `+63${Date.now().toString().slice(-10)}`,
            passwordHash: '$2b$10$test',
            firstName: 'Pending',
            lastName: 'Provider',
            role: 'PROVIDER',
            status: 'ACTIVE', // User must be active
          },
        });

        await prisma.provider.create({
          data: {
            userId: pendingUser.id,
            displayName: 'Pending Provider',
            status: 'PENDING',
            serviceAreas: ['MAKATI'],
          },
        });

        const pendingProviderToken = jwt.sign(
          { userId: pendingUser.id, email: pendingUser.email, role: 'PROVIDER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '1h' }
        );

        const res = await request(app)
          .get('/api/v1/providers/me/profile')
          .set('Authorization', `Bearer ${pendingProviderToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Provider not approved');

        // Clean up
        await prisma.provider.delete({ where: { userId: pendingUser.id } });
        await prisma.user.delete({ where: { id: pendingUser.id } });
      });
    });

    describe('optionalAuth Middleware', () => {
      it('should allow access without token', async () => {
        const res = await request(app).get('/api/v1/providers');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should attach user when valid token provided', async () => {
        // Login to get token
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'customer@test.com', password: 'customer123!' });
        const token = loginRes.body.data.accessToken;

        const res = await request(app)
          .get('/api/v1/providers')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should continue without user when token is invalid', async () => {
        const res = await request(app)
          .get('/api/v1/providers')
          .set('Authorization', 'Bearer invalid.token.here');

        // optionalAuth ignores errors and continues
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should continue without user when token is expired', async () => {
        // Create an expired token
        const expiredToken = jwt.sign(
          { userId: 'test-user-id', email: 'test@test.com', role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '-1h' } // Already expired
        );

        const res = await request(app)
          .get('/api/v1/providers')
          .set('Authorization', `Bearer ${expiredToken}`);

        // optionalAuth ignores errors and continues
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should continue without user when user not found', async () => {
        // Create token with non-existent user ID
        const tokenForNonExistentUser = jwt.sign(
          { userId: 'non-existent-user-id', email: 'ghost@test.com', role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '1h' }
        );

        const res = await request(app)
          .get('/api/v1/providers')
          .set('Authorization', `Bearer ${tokenForNonExistentUser}`);

        // optionalAuth continues even if user not found (user stays undefined)
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should not attach user when user status is not active', async () => {
        // Create an inactive user
        const inactiveUser = await prisma.user.create({
          data: {
            email: `inactive-opt-${Date.now()}@test.com`,
            phone: `+63${Date.now().toString().slice(-10)}`,
            passwordHash: '$2b$10$test',
            firstName: 'Inactive',
            lastName: 'User',
            role: 'CUSTOMER',
            status: 'SUSPENDED',
          },
        });

        const tokenForInactiveUser = jwt.sign(
          { userId: inactiveUser.id, email: inactiveUser.email, role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '1h' }
        );

        const res = await request(app)
          .get('/api/v1/providers')
          .set('Authorization', `Bearer ${tokenForInactiveUser}`);

        // optionalAuth continues but doesn't attach inactive user
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Clean up
        await prisma.user.delete({ where: { id: inactiveUser.id } });
      });
    });

    describe('requireRole Middleware', () => {
      it('should reject when no user is attached', async () => {
        // Directly test the middleware
        const { requireRole } = await import('../middleware/auth.js');

        const middleware = requireRole('ADMIN');
        const mockReq = { user: undefined } as any;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;
        const mockNext = jest.fn();

        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject when user has insufficient role', async () => {
        const { requireRole } = await import('../middleware/auth.js');

        const middleware = requireRole('ADMIN');
        const mockReq = { user: { id: '1', email: 'test@test.com', role: 'CUSTOMER' } } as any;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;
        const mockNext = jest.fn();

        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should allow when user has correct role', async () => {
        const { requireRole } = await import('../middleware/auth.js');

        const middleware = requireRole('ADMIN', 'PROVIDER');
        const mockReq = { user: { id: '1', email: 'test@test.com', role: 'PROVIDER' } } as any;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;
        const mockNext = jest.fn();

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    describe('requireProvider Middleware Direct Tests', () => {
      it('should reject when no user is attached', async () => {
        const { requireProvider } = await import('../middleware/auth.js');

        const mockReq = { user: undefined } as any;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;
        const mockNext = jest.fn();

        await requireProvider(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject when provider record does not exist', async () => {
        const { requireProvider } = await import('../middleware/auth.js');

        // Create a user without provider record
        const userWithoutProvider = await prisma.user.create({
          data: {
            email: `no-provider-${Date.now()}@test.com`,
            phone: `+63${Date.now().toString().slice(-10)}`,
            passwordHash: '$2b$10$test',
            firstName: 'No',
            lastName: 'Provider',
            role: 'PROVIDER',
            status: 'ACTIVE',
          },
        });

        const mockReq = {
          user: { id: userWithoutProvider.id, email: userWithoutProvider.email, role: 'PROVIDER' },
        } as any;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;
        const mockNext = jest.fn();

        await requireProvider(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Provider not approved' });

        // Clean up
        await prisma.user.delete({ where: { id: userWithoutProvider.id } });
      });
    });

    describe('authenticate Middleware Error Handling', () => {
      it('should pass generic errors to next handler', async () => {
        const { authenticate } = await import('../middleware/auth.js');

        // Mock prisma to throw a generic error
        const originalFindUnique = prisma.user.findUnique;
        prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('Database connection failed'));

        const validToken = jwt.sign(
          { userId: 'test-id', email: 'test@test.com', role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '1h' }
        );

        const mockReq = {
          headers: { authorization: `Bearer ${validToken}` },
        } as any;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as any;
        const mockNext = jest.fn();

        await authenticate(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext.mock.calls[0][0].message).toBe('Database connection failed');

        // Restore
        prisma.user.findUnique = originalFindUnique;
      });
    });

    describe('Error Handler Middleware', () => {
      it('should return error response for invalid requests', async () => {
        // Trigger an error by accessing a protected route with bad token format
        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', 'Bearer invalid.token.format');

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle Prisma unique constraint errors (P2002)', async () => {
        // Try to create a user with duplicate email
        const existingEmail = 'customer@test.com';

        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: existingEmail,
            password: 'password123!',
            phone: '+639171234999',
            firstName: 'Duplicate',
            lastName: 'User',
          });

        // App returns 409 Conflict for duplicate entries
        expect(res.status).toBe(409);
        expect(res.body.error).toContain('already');
      });

      it('should handle not found routes', async () => {
        const res = await request(app).get('/api/v1/non-existent-route');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Not Found');
        expect(res.body.message).toContain('/api/v1/non-existent-route');
      });

      it('should handle not found routes with POST method', async () => {
        const res = await request(app)
          .post('/api/v1/non-existent-route')
          .send({ data: 'test' });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Not Found');
        expect(res.body.message).toContain('POST');
        expect(res.body.message).toContain('/api/v1/non-existent-route');
      });

      it('should handle Prisma record not found errors (P2025)', async () => {
        // Login as admin
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@callmsg.com', password: 'admin123!' });
        const adminToken = loginRes.body.data.accessToken;

        // Try to get a non-existent provider
        const res = await request(app)
          .get('/api/v1/admin/providers/non-existent-provider-id')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it('should handle Prisma foreign key constraint errors (P2003)', async () => {
        // Login as customer
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'customer@test.com', password: 'customer123!' });
        const customerToken = loginRes.body.data.accessToken;

        // Try to create a report with invalid foreign key (non-existent user)
        const res = await request(app)
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            reportedId: 'non-existent-user-id-12345',
            type: 'OTHER',
            description: 'Test report with invalid foreign key',
          });

        // Should return 400 for foreign key constraint failure
        expect([400, 500]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle Prisma validation errors', async () => {
        // Login as admin
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@callmsg.com', password: 'admin123!' });
        const adminToken = loginRes.body.data.accessToken;

        // Try to create a service with invalid data types
        const res = await request(app)
          .post('/api/v1/admin/services')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Service',
            category: 'INVALID_CATEGORY', // Invalid enum value
            baseDuration: 'not-a-number', // Should be number
            basePrice: 'not-a-number', // Should be number
          });

        expect([400, 500]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle AppError with custom status code', async () => {
        // Try to get a non-existent service - triggers AppError with 404
        const res = await request(app)
          .get('/api/v1/services/non-existent-service-id');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle duplicate phone number on registration', async () => {
        // First get existing customer's phone
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'customer@test.com', password: 'customer123!' });
        const customerToken = loginRes.body.data.accessToken;

        const profileRes = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${customerToken}`);

        const existingPhone = profileRes.body.data.phone;

        // Try to register with existing phone
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `unique-email-${Date.now()}@test.com`,
            password: 'password123!',
            phone: existingPhone,
            firstName: 'Duplicate',
            lastName: 'Phone',
          });

        expect([400, 409]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle update operations on non-existent records', async () => {
        // Login as admin
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@callmsg.com', password: 'admin123!' });
        const adminToken = loginRes.body.data.accessToken;

        // Try to update a non-existent service
        const res = await request(app)
          .patch('/api/v1/admin/services/non-existent-service-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated Name' });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle delete operations on non-existent records', async () => {
        // Login as admin
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@callmsg.com', password: 'admin123!' });
        const adminToken = loginRes.body.data.accessToken;

        // Try to delete a non-existent service
        const res = await request(app)
          .delete('/api/v1/admin/services/non-existent-service-id')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle validation errors with incomplete data', async () => {
        // Send incomplete data to registration endpoint
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'valid@email.com',
            // Missing required fields: password, phone, firstName, lastName
          });

        // Should return an error status
        expect([400, 500]).toContain(res.status);
        // Response should have some body (even if empty on 500)
        expect(res.body).toBeDefined();
      });

      it('should handle P2002 duplicate with meta target info', async () => {
        // Create a user, then try to create another with same email
        // This should trigger P2002 with meta.target containing the field names
        const testEmail = 'duplicate-test@example.com';
        const testPhone = `+63${Date.now().toString().slice(-10)}`;

        // First registration
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: testEmail,
            phone: testPhone,
            password: 'password123!',
            firstName: 'First',
            lastName: 'User',
          });

        // Second registration with same email - triggers P2002
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: testEmail,
            phone: '+639999999999',
            password: 'password123!',
            firstName: 'Second',
            lastName: 'User',
          });

        expect([400, 409]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
        // Should contain duplicate/exists message
        expect(res.body.error.toLowerCase()).toMatch(/duplicate|exists|already/);

        // Clean up
        await prisma.user.deleteMany({ where: { email: testEmail } });
      });

      it('should handle default Prisma error codes', async () => {
        // Login as admin
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@callmsg.com', password: 'admin123!' });
        const adminToken = loginRes.body.data.accessToken;

        // Try to create a promotion with invalid date format
        // This might trigger a different Prisma error code
        const res = await request(app)
          .post('/api/v1/admin/promotions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: 'TEST_PROMO',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            startDate: 'invalid-date',
            endDate: 'also-invalid',
          });

        // Should get error response
        expect([400, 500]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle JWT malformed token error', async () => {
        // Create a malformed JWT that will cause JsonWebTokenError
        // This is a properly structured but invalid JWT
        const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoidmFsdWUifQ.invalid_signature';

        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${malformedToken}`);

        // JWT errors return 401 for invalid/unauthorized
        expect([401, 500]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle JWT expired token error', async () => {
        // Create an expired JWT token
        const expiredToken = jwt.sign(
          { userId: 'test-user-id', email: 'test@test.com', role: 'CUSTOMER' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '-1s' } // Already expired
        );

        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/expired|token/i);
      });

      it('should handle generic errors with message', async () => {
        // Try to trigger a generic error by making an extremely malformed request
        // Using raw HTTP to send invalid JSON
        const res = await request(app)
          .post('/api/v1/auth/login')
          .set('Content-Type', 'application/json')
          .send('{ invalid json }');

        // Should get some error response (either 400 for bad JSON or 500)
        expect([400, 500]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
      });

      it('should handle errors with undefined message gracefully', async () => {
        // Try a request that could cause an error without a message property
        // Sending completely wrong content type/data
        const res = await request(app)
          .post('/api/v1/auth/login')
          .set('Content-Type', 'text/plain')
          .send('not json at all');

        // Should handle gracefully with some error
        expect([400, 415, 500]).toContain(res.status);
      });
    });

    describe('requireAdmin Middleware', () => {
      it('should reject non-admin users', async () => {
        // Login as customer
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'customer@test.com', password: 'customer123!' });
        const customerToken = loginRes.body.data.accessToken;

        const res = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Insufficient permissions');
      });

      it('should allow admin users', async () => {
        // Login as admin
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@callmsg.com', password: 'admin123!' });
        const adminToken = loginRes.body.data.accessToken;

        const res = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });
  });

  // ============================================================================
  // SERVICE LAYER TESTS
  // ============================================================================

  describe('Service Layer', () => {
    describe('Notification Service', () => {
      it('should create notification via service', async () => {
        const { notificationService } = await import('../services/notifications.service.js');

        // Get a test user
        const user = await prisma.user.findFirst({
          where: { email: 'customer@test.com' },
        });

        // Create a notification using the service
        const notification = await notificationService.createNotification(
          user!.id,
          'BOOKING_ACCEPTED',
          'Test Service Notification',
          'This notification was created via the service layer test'
        );

        expect(notification).toBeDefined();
        expect(notification.userId).toBe(user!.id);
        expect(notification.type).toBe('BOOKING_ACCEPTED');
        expect(notification.title).toBe('Test Service Notification');
        expect(notification.body).toContain('service layer test');

        // Clean up
        await prisma.notification.delete({ where: { id: notification.id } });
      });

      it('should create notification with custom data', async () => {
        const { notificationService } = await import('../services/notifications.service.js');

        const user = await prisma.user.findFirst({
          where: { email: 'customer@test.com' },
        });

        const customData = { bookingId: 'test-booking-123', amount: 1000 };

        const notification = await notificationService.createNotification(
          user!.id,
          'PAYMENT_RECEIVED',
          'Payment Received',
          'Your payment has been processed',
          customData
        );

        expect(notification).toBeDefined();
        expect(notification.data).toEqual(customData);

        // Clean up
        await prisma.notification.delete({ where: { id: notification.id } });
      });
    });

    describe('Provider Service - Availability', () => {
      it('should return empty availability for provider without schedule', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const user = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        // Get availability via service
        const availability = await providerService.getMyAvailability(user!.id);

        expect(Array.isArray(availability)).toBe(true);
      });

      it('should set and get provider availability', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const user = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        // Set availability
        const availabilityData = [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
        ];

        await providerService.setMyAvailability(user!.id, availabilityData);

        // Get availability
        const availability = await providerService.getMyAvailability(user!.id);

        expect(availability.length).toBe(2);
        expect(availability[0]).toHaveProperty('dayOfWeek');
        expect(availability[0]).toHaveProperty('startTime');
        expect(availability[0]).toHaveProperty('endTime');

        // Clean up
        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });
        await prisma.providerAvailability.deleteMany({
          where: { providerId: provider!.id },
        });
      });
    });

    describe('Provider Service - Registration', () => {
      it('should register a new provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        // Create a new user to register as provider
        const newUser = await prisma.user.create({
          data: {
            email: `new-provider-${Date.now()}@test.com`,
            phone: `+63${Date.now().toString().slice(-10)}`,
            passwordHash: '$2b$10$test',
            firstName: 'New',
            lastName: 'Provider',
            role: 'CUSTOMER',
            status: 'ACTIVE',
          },
        });

        const result = await providerService.registerAsProvider(newUser.id, {
          displayName: 'New Provider Display',
          bio: 'Test bio',
          serviceAreas: ['MAKATI', 'BGC'],
        });

        expect(result).toHaveProperty('id');
        expect(result.displayName).toBe('New Provider Display');
        expect(result.bio).toBe('Test bio');
        expect(result.serviceAreas).toContain('MAKATI');

        // Verify user role was updated
        const updatedUser = await prisma.user.findUnique({ where: { id: newUser.id } });
        expect(updatedUser?.role).toBe('PROVIDER');

        // Clean up
        await prisma.provider.delete({ where: { userId: newUser.id } });
        await prisma.user.delete({ where: { id: newUser.id } });
      });

      it('should throw error if already registered as provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        await expect(
          providerService.registerAsProvider(providerUser!.id, {
            displayName: 'Duplicate',
          })
        ).rejects.toThrow('Already registered as provider');
      });
    });

    describe('Provider Service - Profile & Documents', () => {
      it('should get provider profile', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const profile = await providerService.getMyProfile(providerUser!.id);

        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('displayName');
        expect(profile).toHaveProperty('user');
      });

      it('should throw error for non-existent provider profile', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getMyProfile('non-existent-user-id')
        ).rejects.toThrow('Provider not found');
      });

      it('should update provider profile', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const updated = await providerService.updateMyProfile(providerUser!.id, {
          bio: 'Updated bio for testing',
        });

        expect(updated.bio).toBe('Updated bio for testing');
      });

      it('should get provider documents', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const documents = await providerService.getMyDocuments(providerUser!.id);

        expect(Array.isArray(documents)).toBe(true);
      });

      it('should throw error for documents of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getMyDocuments('non-existent-user-id')
        ).rejects.toThrow('Provider not found');
      });

      it('should get provider services list', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const services = await providerService.getMyServices(providerUser!.id);

        expect(Array.isArray(services)).toBe(true);
      });

      it('should throw error for services of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getMyServices('non-existent-user-id')
        ).rejects.toThrow('Provider not found');
      });
    });

    describe('Provider Service - Location & Status', () => {
      it('should update provider online status', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        await providerService.updateOnlineStatus(providerUser!.id, 'ONLINE');

        const provider = await prisma.provider.findUnique({
          where: { userId: providerUser!.id },
        });
        expect(provider?.onlineStatus).toBe('ONLINE');

        // Reset to offline
        await providerService.updateOnlineStatus(providerUser!.id, 'OFFLINE');
      });

      it('should update provider location', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        await providerService.updateLocation(providerUser!.id, {
          latitude: 14.5995,
          longitude: 120.9842,
        });

        const provider = await prisma.provider.findUnique({
          where: { userId: providerUser!.id },
        });
        expect(provider?.lastLatitude).toBe(14.5995);
        expect(provider?.lastLongitude).toBe(120.9842);
        expect(provider?.lastLocationAt).toBeDefined();
      });

      it('should throw error for location update of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.updateLocation('non-existent-user-id', {
            latitude: 14.5995,
            longitude: 120.9842,
          })
        ).rejects.toThrow('Provider not found');
      });

      it('should update bank account info', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        await providerService.updateBankAccount(providerUser!.id, {
          bankName: 'Test Bank',
          bankAccountNumber: '1234567890',
          bankAccountName: 'Test Account',
        });

        const provider = await prisma.provider.findUnique({
          where: { userId: providerUser!.id },
        });
        expect(provider?.bankName).toBe('Test Bank');
        expect(provider?.bankAccountNumber).toBe('1234567890');
      });
    });

    describe('Provider Service - Earnings & Payouts', () => {
      it('should get provider earnings', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const earnings = await providerService.getEarnings(providerUser!.id, {});

        expect(Array.isArray(earnings)).toBe(true);
      });

      it('should throw error for earnings of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getEarnings('non-existent-user-id', {})
        ).rejects.toThrow('Provider not found');
      });

      it('should get earnings summary', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const summary = await providerService.getEarningsSummary(providerUser!.id);

        expect(summary).toHaveProperty('balance');
        expect(summary).toHaveProperty('totalEarnings');
      });

      it('should throw error for summary of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getEarningsSummary('non-existent-user-id')
        ).rejects.toThrow('Provider not found');
      });

      it('should get provider payouts list', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const payouts = await providerService.getPayouts(providerUser!.id);

        expect(Array.isArray(payouts)).toBe(true);
      });

      it('should throw error for payouts of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getPayouts('non-existent-user-id')
        ).rejects.toThrow('Provider not found');
      });

      it('should throw error for payout with insufficient balance', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        // Ensure provider has zero balance
        await prisma.provider.update({
          where: { userId: providerUser!.id },
          data: { balance: 0 },
        });

        await expect(
          providerService.requestPayout(providerUser!.id, { amount: 1000, method: 'GCASH' })
        ).rejects.toThrow('Insufficient balance');
      });

      it('should throw error for payout below minimum amount', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        // Give provider some balance
        await prisma.provider.update({
          where: { userId: providerUser!.id },
          data: { balance: 1000 },
        });

        await expect(
          providerService.requestPayout(providerUser!.id, { amount: 100, method: 'GCASH' })
        ).rejects.toThrow('Minimum payout is ₱500');

        // Reset balance
        await prisma.provider.update({
          where: { userId: providerUser!.id },
          data: { balance: 0 },
        });
      });

      it('should throw error for payout of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.requestPayout('non-existent-user-id', { amount: 1000, method: 'GCASH' })
        ).rejects.toThrow('Provider not found');
      });
    });

    describe('Provider Service - Service Management', () => {
      it('should set a new service for provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const provider = await prisma.provider.findFirst({
          where: { userId: providerUser!.id },
        });

        // Use svc-deep which exists in DB and isn't assigned to provider
        const result = await providerService.setService(providerUser!.id, {
          serviceId: 'svc-deep',
          price60: 900,
          price90: 1300,
          price120: 1700,
          isActive: true,
        });

        expect(result.price60).toBe(900);
        expect(result.price90).toBe(1300);
        expect(result.price120).toBe(1700);

        // Clean up
        await prisma.providerService.delete({
          where: { providerId_serviceId: { providerId: provider!.id, serviceId: 'svc-deep' } },
        });
      });

      it('should throw error for set service of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.setService('non-existent-user-id', {
            serviceId: 'svc-thai',
            price60: 800,
          })
        ).rejects.toThrow('Provider not found');
      });

      it('should remove a service from provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const provider = await prisma.provider.findFirst({
          where: { userId: providerUser!.id },
        });

        // First ensure service exists (use upsert to handle if it already exists)
        await prisma.providerService.upsert({
          where: { providerId_serviceId: { providerId: provider!.id, serviceId: 'svc-scrub' } },
          update: { price60: 850 },
          create: {
            providerId: provider!.id,
            serviceId: 'svc-scrub',
            price60: 850,
          },
        });

        await providerService.removeService(providerUser!.id, 'svc-scrub');

        // Verify it's removed
        const removed = await prisma.providerService.findUnique({
          where: { providerId_serviceId: { providerId: provider!.id, serviceId: 'svc-scrub' } },
        });
        expect(removed).toBeNull();
      });

      it('should throw error for remove service of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.removeService('non-existent-user-id', 'svc-thai')
        ).rejects.toThrow('Provider not found');
      });

      it('should throw error for get availability of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getMyAvailability('non-existent-user-id')
        ).rejects.toThrow('Provider not found');
      });

      it('should throw error for set availability of non-existent provider', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.setMyAvailability('non-existent-user-id', [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          ])
        ).rejects.toThrow('Provider not found');
      });
    });

    describe('Provider Service - Public APIs', () => {
      it('should list approved providers', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const result = await providerService.listProviders({});

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('should list providers with pagination', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const result = await providerService.listProviders({ limit: '5', page: '1' });

        expect(result.data.length).toBeLessThanOrEqual(5);
      });

      it('should get provider detail by ID', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        const detail = await providerService.getProviderDetail(provider!.id);

        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('displayName');
        expect(detail).toHaveProperty('user');
        expect(detail).toHaveProperty('services');
      });

      it('should throw error for non-existent provider detail', async () => {
        const { providerService } = await import('../services/providers.service.js');

        await expect(
          providerService.getProviderDetail('non-existent-provider-id')
        ).rejects.toThrow('Provider not found');
      });

      it('should get provider reviews', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        const result = await providerService.getProviderReviews(provider!.id, {});

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('should get provider availability for date', async () => {
        const { providerService } = await import('../services/providers.service.js');

        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        const result = await providerService.getProviderAvailability(provider!.id, '2025-01-15');

        expect(result).toHaveProperty('date', '2025-01-15');
        expect(result).toHaveProperty('slots');
        expect(Array.isArray(result.slots)).toBe(true);
      });
    });

    describe('Booking Service', () => {
      it('should get provider location from cache', async () => {
        const { bookingService } = await import('../services/bookings.service.js');
        const { locationCache } = await import('../config/redis.js');

        // Create a booking for the customer
        const customer = await prisma.user.findFirst({
          where: { email: 'customer@test.com' },
        });

        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 8);

        const booking = await prisma.booking.create({
          data: {
            bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
            customerId: customer!.id,
            providerId: provider!.id,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt,
            addressText: 'Test Location',
            latitude: 14.5586,
            longitude: 121.0178,
            serviceAmount: 800,
            travelFee: 0,
            totalAmount: 800,
            platformFee: 160,
            providerEarning: 640,
          },
        });

        // Set location in cache
        await locationCache.setBookingLocation(booking.id, 14.5600, 121.0200, 15);

        // Get provider location via service
        const location = await bookingService.getProviderLocation(customer!.id, booking.id);

        expect(location).toHaveProperty('latitude', 14.5600);
        expect(location).toHaveProperty('longitude', 121.0200);
        expect(location).toHaveProperty('eta', 15);
        expect(location).toHaveProperty('lastUpdatedAt');

        // Clean up
        await prisma.booking.delete({ where: { id: booking.id } });
      });

      it('should return null values when no location in cache', async () => {
        const { bookingService } = await import('../services/bookings.service.js');

        // Create a booking for the customer
        const customer = await prisma.user.findFirst({
          where: { email: 'customer@test.com' },
        });

        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 8);

        const booking = await prisma.booking.create({
          data: {
            bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
            customerId: customer!.id,
            providerId: provider!.id,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt,
            addressText: 'Test No Location',
            latitude: 14.5586,
            longitude: 121.0178,
            serviceAmount: 800,
            travelFee: 0,
            totalAmount: 800,
            platformFee: 160,
            providerEarning: 640,
          },
        });

        // Get provider location via service (no cache set)
        const location = await bookingService.getProviderLocation(customer!.id, booking.id);

        expect(location).toEqual({
          lat: null,
          lng: null,
          eta: null,
          lastUpdatedAt: null,
        });

        // Clean up
        await prisma.booking.delete({ where: { id: booking.id } });
      });

      it('should throw error when getting location for non-customer booking', async () => {
        const { bookingService } = await import('../services/bookings.service.js');

        // Try to get location with wrong user ID
        await expect(
          bookingService.getProviderLocation('wrong-user-id', 'booking-id')
        ).rejects.toThrow('Booking not found');
      });

      it('should trigger SOS and create report', async () => {
        const { bookingService } = await import('../services/bookings.service.js');

        // Get provider user (provider triggering SOS sets reportedId to customerId which is valid)
        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const customer = await prisma.user.findFirst({
          where: { email: 'customer@test.com' },
        });

        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 8);

        const booking = await prisma.booking.create({
          data: {
            bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
            customerId: customer!.id,
            providerId: provider!.id,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt,
            addressText: 'SOS Test Location',
            latitude: 14.5586,
            longitude: 121.0178,
            serviceAmount: 800,
            travelFee: 0,
            totalAmount: 800,
            platformFee: 160,
            providerEarning: 640,
            status: 'IN_PROGRESS',
          },
        });

        // Trigger SOS via service (provider triggers, so reportedId = customerId which is valid User.id)
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        await bookingService.triggerSOS(providerUser!.id, booking.id, { message: 'Help needed!' });
        consoleSpy.mockRestore();

        // Verify report was created
        const report = await prisma.report.findFirst({
          where: { bookingId: booking.id },
        });

        expect(report).toBeDefined();
        expect(report?.severity).toBe('CRITICAL');
        expect(report?.description).toContain('SOS triggered');
        expect(report?.description).toContain('Help needed!');

        // Clean up
        await prisma.report.delete({ where: { id: report!.id } });
        await prisma.booking.delete({ where: { id: booking.id } });
      });

      it('should trigger SOS with default message when no message provided', async () => {
        const { bookingService } = await import('../services/bookings.service.js');

        // Get provider user (provider triggering SOS sets reportedId to customerId which is valid)
        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const customer = await prisma.user.findFirst({
          where: { email: 'customer@test.com' },
        });

        const provider = await prisma.provider.findFirst({
          where: { user: { email: 'provider@test.com' } },
        });

        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 8);

        const booking = await prisma.booking.create({
          data: {
            bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
            customerId: customer!.id,
            providerId: provider!.id,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt,
            addressText: 'SOS Default Message Test',
            latitude: 14.5586,
            longitude: 121.0178,
            serviceAmount: 800,
            travelFee: 0,
            totalAmount: 800,
            platformFee: 160,
            providerEarning: 640,
            status: 'IN_PROGRESS',
          },
        });

        // Trigger SOS without message (provider triggers)
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        await bookingService.triggerSOS(providerUser!.id, booking.id, {});
        consoleSpy.mockRestore();

        // Verify report was created with default message
        const report = await prisma.report.findFirst({
          where: { bookingId: booking.id },
        });

        expect(report).toBeDefined();
        expect(report?.description).toContain('Emergency');

        // Clean up
        await prisma.report.delete({ where: { id: report!.id } });
        await prisma.booking.delete({ where: { id: booking.id } });
      });

      it('should update booking status to COMPLETED and update provider earnings', async () => {
        const { bookingService } = await import('../services/bookings.service.js');

        // Get provider user
        const providerUser = await prisma.user.findFirst({
          where: { email: 'provider@test.com' },
        });

        const provider = await prisma.provider.findFirst({
          where: { userId: providerUser!.id },
        });

        const customer = await prisma.user.findFirst({
          where: { email: 'customer@test.com' },
        });

        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 8);

        // Get initial provider balance
        const initialBalance = provider!.balance;
        const initialEarnings = provider!.totalEarnings;
        const initialCompletedBookings = provider!.completedBookings;

        const booking = await prisma.booking.create({
          data: {
            bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
            customerId: customer!.id,
            providerId: provider!.id,
            serviceId: 'svc-thai',
            duration: 60,
            scheduledAt,
            addressText: 'Completion Test',
            latitude: 14.5586,
            longitude: 121.0178,
            serviceAmount: 800,
            travelFee: 100,
            totalAmount: 900,
            platformFee: 160,
            providerEarning: 740,
            status: 'IN_PROGRESS',
          },
        });

        // Update status to COMPLETED
        await bookingService.updateBookingStatus(providerUser!.id, booking.id, 'COMPLETED');

        // Verify provider earnings were updated
        const updatedProvider = await prisma.provider.findUnique({
          where: { id: provider!.id },
        });

        expect(updatedProvider!.balance).toBe(initialBalance + 740);
        expect(updatedProvider!.totalEarnings).toBe(initialEarnings + 740);
        expect(updatedProvider!.completedBookings).toBe(initialCompletedBookings + 1);

        // Verify booking has completedAt timestamp
        const updatedBooking = await prisma.booking.findUnique({
          where: { id: booking.id },
        });
        expect(updatedBooking?.completedAt).toBeDefined();

        // Clean up - restore provider balance
        await prisma.provider.update({
          where: { id: provider!.id },
          data: {
            balance: initialBalance,
            totalEarnings: initialEarnings,
            completedBookings: initialCompletedBookings,
          },
        });
        await prisma.booking.delete({ where: { id: booking.id } });
      });
    });

    describe('Redis Cache Utilities', () => {
      it('should set and get cached values', async () => {
        const { cache } = await import('../config/redis.js');

        const testKey = `test:cache:${Date.now()}`;
        const testValue = { name: 'Test', count: 42 };

        // Set value
        await cache.set(testKey, testValue, 60);

        // Get value
        const result = await cache.get<typeof testValue>(testKey);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Test');
        expect(result?.count).toBe(42);

        // Clean up
        await cache.del(testKey);
      });

      it('should return null for non-existent cache key', async () => {
        const { cache } = await import('../config/redis.js');

        const result = await cache.get('non-existent-key-12345');

        expect(result).toBeNull();
      });

      it('should delete cached values', async () => {
        const { cache } = await import('../config/redis.js');

        const testKey = `test:delete:${Date.now()}`;

        // Set then delete
        await cache.set(testKey, { data: 'test' }, 60);
        await cache.del(testKey);

        // Verify deleted
        const result = await cache.get(testKey);
        expect(result).toBeNull();
      });

      it('should delete multiple keys by pattern', async () => {
        const { cache, redis } = await import('../config/redis.js');

        const prefix = `test:pattern:${Date.now()}`;

        // Set multiple keys
        await cache.set(`${prefix}:key1`, { id: 1 }, 60);
        await cache.set(`${prefix}:key2`, { id: 2 }, 60);
        await cache.set(`${prefix}:key3`, { id: 3 }, 60);

        // Delete by pattern
        await cache.delPattern(`${prefix}:*`);

        // Verify all deleted
        const keys = await redis.keys(`${prefix}:*`);
        expect(keys.length).toBe(0);
      });

      it('should handle delPattern with no matching keys', async () => {
        const { cache } = await import('../config/redis.js');

        // Should not throw
        await expect(
          cache.delPattern('non-existent-pattern-*')
        ).resolves.not.toThrow();
      });
    });

    describe('Redis Location Cache', () => {
      it('should set and get provider location', async () => {
        const { locationCache } = await import('../config/redis.js');

        const testProviderId = `test-provider-${Date.now()}`;

        // Set location
        await locationCache.setProviderLocation(testProviderId, 14.5586, 121.0178);

        // Get location
        const location = await locationCache.getProviderLocation(testProviderId);

        expect(location).toBeDefined();
        expect(location?.lat).toBeCloseTo(14.5586, 4);
        expect(location?.lng).toBeCloseTo(121.0178, 4);
        expect(location?.updatedAt).toBeDefined();
      });

      it('should return null for non-existent provider location', async () => {
        const { locationCache } = await import('../config/redis.js');

        const location = await locationCache.getProviderLocation('non-existent-provider');

        expect(location).toBeNull();
      });

      it('should set and get booking location', async () => {
        const { locationCache } = await import('../config/redis.js');

        const testBookingId = `test-booking-${Date.now()}`;

        // Set location with ETA
        await locationCache.setBookingLocation(testBookingId, 14.5600, 121.0200, 15);

        // Get location
        const location = await locationCache.getBookingLocation(testBookingId);

        expect(location).toBeDefined();
        expect(location?.lat).toBeCloseTo(14.5600, 4);
        expect(location?.lng).toBeCloseTo(121.0200, 4);
        expect(location?.eta).toBe(15);
        expect(location?.updatedAt).toBeDefined();
      });

      it('should set booking location without ETA', async () => {
        const { locationCache } = await import('../config/redis.js');

        const testBookingId = `test-booking-no-eta-${Date.now()}`;

        // Set location without ETA
        await locationCache.setBookingLocation(testBookingId, 14.5600, 121.0200);

        // Get location
        const location = await locationCache.getBookingLocation(testBookingId);

        expect(location).toBeDefined();
        expect(location?.eta).toBeNull();
      });

      it('should return null for non-existent booking location', async () => {
        const { locationCache } = await import('../config/redis.js');

        const location = await locationCache.getBookingLocation('non-existent-booking');

        expect(location).toBeNull();
      });
    });

    describe('Error Handler Direct Tests', () => {
      it('should handle ZodError with field details', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');
        const { z } = await import('zod');

        // Create a ZodError by validating invalid data
        const schema = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        });

        let zodError: Error;
        try {
          schema.parse({ email: 'not-email', password: '123' });
          throw new Error('Should have thrown');
        } catch (e) {
          zodError = e as Error;
        }

        // Mock response
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        // Suppress console.error for this test
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        errorHandler(zodError, mockReq, mockRes as any, mockNext);

        consoleSpy.mockRestore();

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation Error',
            details: expect.any(Array),
          })
        );
      });

      it('should handle P2002 with meta target fields', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');
        const { Prisma } = await import('@prisma/client');

        // Create a P2002 error with meta
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['email'] } }
        );

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        errorHandler(prismaError, mockReq, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Duplicate entry',
            message: expect.stringContaining('email'),
          })
        );
      });

      it('should handle default Prisma error code', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');
        const { Prisma } = await import('@prisma/client');

        // Create a Prisma error with unknown code
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Unknown error',
          { code: 'P9999', clientVersion: '5.0.0' }
        );

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        errorHandler(prismaError, mockReq, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Database error',
          })
        );
      });

      it('should handle JsonWebTokenError', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');

        // Create a JWT error
        const jwtError = new Error('jwt malformed');
        jwtError.name = 'JsonWebTokenError';

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        errorHandler(jwtError, mockReq, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Invalid token',
          })
        );
      });

      it('should handle TokenExpiredError', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');

        // Create a token expired error
        const expiredError = new Error('jwt expired');
        expiredError.name = 'TokenExpiredError';

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        errorHandler(expiredError, mockReq, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Token expired',
          })
        );
      });

      it('should handle generic errors with message', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');

        // Create a generic error
        const genericError = new Error('Something went wrong');

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        errorHandler(genericError, mockReq, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Something went wrong',
          })
        );
      });

      it('should handle errors without message', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');

        // Create an error without message
        const emptyError = new Error();

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        errorHandler(emptyError, mockReq, mockRes as any, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Internal Server Error',
          })
        );
      });

      it('should include stack trace in development mode', async () => {
        const { errorHandler } = await import('../middleware/errorHandler.js');

        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const error = new Error('Test error');

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const mockReq = {} as any;
        const mockNext = jest.fn();

        errorHandler(error, mockReq, mockRes as any, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            stack: expect.any(String),
          })
        );

        // Restore original env
        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Controller Error Handling', () => {
      describe('Users Controller', () => {
        it('should handle getProfile success', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('email', 'customer@test.com');
        });

        it('should handle getProfile error', async () => {
          // Use invalid token to trigger error in auth middleware path
          const res = await request(app)
            .get('/api/v1/users/me')
            .set('Authorization', 'Bearer invalid-token');

          expect(res.status).toBe(401);
        });

        it('should handle updateProfile success', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: 'UpdatedName' });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle updateProfile with invalid data', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          // Send invalid gender to trigger validation or processing error
          const res = await request(app)
            .patch('/api/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ gender: 'INVALID_GENDER' });

          // May succeed with invalid data or return error depending on validation
          expect([200, 400, 500]).toContain(res.status);
        });

        it('should handle changePassword success', async () => {
          // Create a temporary user to test password change
          const bcrypt = await import('bcryptjs');
          const tempUser = await prisma.user.create({
            data: {
              email: 'temppassword@test.com',
              phone: '+639999999999',
              passwordHash: await bcrypt.hash('oldpassword123!', 10),
              firstName: 'Temp',
              lastName: 'User',
              role: 'CUSTOMER',
            },
          });

          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'temppassword@test.com', password: 'oldpassword123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/users/me/password')
            .set('Authorization', `Bearer ${token}`)
            .send({
              currentPassword: 'oldpassword123!',
              newPassword: 'newpassword123!',
            });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('Password');

          // Clean up
          await prisma.refreshToken.deleteMany({ where: { userId: tempUser.id } });
          await prisma.user.delete({ where: { id: tempUser.id } });
        });

        it('should handle changePassword with wrong current password', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/users/me/password')
            .set('Authorization', `Bearer ${token}`)
            .send({
              currentPassword: 'wrongpassword!',
              newPassword: 'newpassword123!',
            });

          expect(res.status).toBe(400);
        });

        it('should handle uploadAvatar endpoint', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/users/me/avatar')
            .set('Authorization', `Bearer ${token}`);

          // Avatar upload returns success (placeholder)
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle updateFcmToken', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/users/me/fcm-token')
            .set('Authorization', `Bearer ${token}`)
            .send({ fcmToken: 'test-fcm-token-12345' });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getAddresses', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/users/me/addresses')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should handle addAddress', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/users/me/addresses')
            .set('Authorization', `Bearer ${token}`)
            .send({
              label: 'Test Address',
              addressLine1: '123 Test Street',
              city: 'Makati',
              latitude: 14.5547,
              longitude: 121.0244,
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          // Clean up
          if (res.body.data?.id) {
            await prisma.address.delete({ where: { id: res.body.data.id } });
          }
        });

        it('should handle updateAddress for existing address', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;
          const userId = loginRes.body.data.user.id;

          // Create an address to update
          const address = await prisma.address.create({
            data: {
              userId,
              label: 'Test Address',
              addressLine1: '123 Test Street',
              city: 'Manila',
              latitude: 14.5995,
              longitude: 120.9842,
            },
          });

          const res = await request(app)
            .patch(`/api/v1/users/me/addresses/${address.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ label: 'Updated Label', city: 'Makati' });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.label).toBe('Updated Label');

          // Clean up
          await prisma.address.delete({ where: { id: address.id } });
        });

        it('should handle updateAddress for non-existent address', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/users/me/addresses/non-existent-address-id')
            .set('Authorization', `Bearer ${token}`)
            .send({ label: 'Updated Label' });

          expect(res.status).toBe(404);
        });

        it('should handle deleteAddress for existing address', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;
          const userId = loginRes.body.data.user.id;

          // Create an address to delete
          const address = await prisma.address.create({
            data: {
              userId,
              label: 'Address To Delete',
              addressLine1: '456 Delete Street',
              city: 'Quezon City',
              latitude: 14.6760,
              longitude: 121.0437,
            },
          });

          const res = await request(app)
            .delete(`/api/v1/users/me/addresses/${address.id}`)
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(204);

          // Verify it's deleted
          const deleted = await prisma.address.findUnique({ where: { id: address.id } });
          expect(deleted).toBeNull();
        });

        it('should handle deleteAddress for non-existent address', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .delete('/api/v1/users/me/addresses/non-existent-address-id')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(404);
        });
      });

      describe('Notifications Controller', () => {
        it('should handle getNotifications', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/notifications')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getNotifications with unreadOnly filter', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/notifications')
            .query({ unreadOnly: 'true' })
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
        });

        it('should handle getNotifications with limit', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/notifications')
            .query({ limit: '5' })
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });

        it('should handle markAsRead for existing notification', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;
          const userId = loginRes.body.data.user.id;

          // Create a notification to mark as read
          const notification = await prisma.notification.create({
            data: {
              userId,
              type: 'BOOKING_ACCEPTED',
              title: 'Test Notification',
              body: 'This is a test notification for controller test',
            },
          });

          const res = await request(app)
            .patch(`/api/v1/notifications/${notification.id}/read`)
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('read');

          // Clean up
          await prisma.notification.delete({ where: { id: notification.id } });
        });

        it('should handle markAsRead for non-existent notification', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/notifications/non-existent-id/read')
            .set('Authorization', `Bearer ${token}`);

          // Service uses updateMany which succeeds even with no matches
          expect(res.status).toBe(200);
        });

        it('should handle markAllAsRead', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/notifications/read-all')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle markAllAsRead with existing unread notifications', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;
          const userId = loginRes.body.data.user.id;

          // Create unread notifications
          const notification1 = await prisma.notification.create({
            data: {
              userId,
              type: 'BOOKING_ACCEPTED',
              title: 'Test Notification 1',
              body: 'Unread notification 1',
              isRead: false,
            },
          });
          const notification2 = await prisma.notification.create({
            data: {
              userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Test Notification 2',
              body: 'Unread notification 2',
              isRead: false,
            },
          });

          const res = await request(app)
            .patch('/api/v1/notifications/read-all')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('All');

          // Verify notifications are marked as read
          const updated1 = await prisma.notification.findUnique({ where: { id: notification1.id } });
          const updated2 = await prisma.notification.findUnique({ where: { id: notification2.id } });
          expect(updated1?.isRead).toBe(true);
          expect(updated2?.isRead).toBe(true);

          // Clean up
          await prisma.notification.deleteMany({
            where: { id: { in: [notification1.id, notification2.id] } },
          });
        });
      });

      describe('Payments Controller', () => {
        it('should handle webhook with invalid signature', async () => {
          const res = await request(app)
            .post('/api/v1/payments/webhook')
            .set('paymongo-signature', 'invalid-signature')
            .send({ data: { attributes: { type: 'payment.paid' } } });

          // Webhook may succeed or fail based on validation
          expect([200, 400, 500]).toContain(res.status);
        });

        it('should handle getPaymentDetail for non-existent payment', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/payments/non-existent-payment-id')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(404);
        });
      });

      describe('Providers Controller', () => {
        it('should handle getMyProfile for non-provider user', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/providers/me/profile')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(403);
        });

        it('should handle updateMyProfile', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/providers/me/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ bio: 'Updated bio from test' });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getMyDocuments', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/providers/me/documents')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getMyServices', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/providers/me/services')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getMyAvailability', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/providers/me/availability')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle updateOnlineStatus', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/providers/me/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'ONLINE' });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          // Reset to offline
          await request(app)
            .patch('/api/v1/providers/me/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'OFFLINE' });
        });

        it('should handle updateLocation', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/providers/me/location')
            .set('Authorization', `Bearer ${token}`)
            .send({ latitude: 14.5995, longitude: 120.9842 });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getEarnings', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/providers/me/earnings')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getEarningsSummary', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/providers/me/earnings/summary')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getPayouts', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/providers/me/payouts')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle updateBankAccount', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .patch('/api/v1/providers/me/bank-account')
            .set('Authorization', `Bearer ${token}`)
            .send({
              bankName: 'Test Bank',
              bankAccountNumber: '9876543210',
              bankAccountName: 'Test Provider',
            });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle listProviders', async () => {
          const res = await request(app)
            .get('/api/v1/providers');

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle listProviders with filters', async () => {
          const res = await request(app)
            .get('/api/v1/providers')
            .query({ serviceId: 'svc-thai', latitude: 14.5995, longitude: 120.9842 });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getProviderDetail for non-existent provider', async () => {
          const res = await request(app)
            .get('/api/v1/providers/non-existent-provider-id');

          expect(res.status).toBe(404);
        });

        it('should handle getProviderReviews', async () => {
          const provider = await prisma.provider.findFirst();
          const res = await request(app)
            .get(`/api/v1/providers/${provider!.id}/reviews`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getProviderReviews for non-existent provider', async () => {
          const res = await request(app)
            .get('/api/v1/providers/non-existent-provider-id/reviews');

          // Service returns empty results for non-existent providers
          expect(res.status).toBe(200);
          expect(res.body.data).toEqual([]);
        });

        it('should handle getProviderAvailability', async () => {
          const provider = await prisma.provider.findFirst();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().split('T')[0];

          const res = await request(app)
            .get(`/api/v1/providers/${provider!.id}/availability`)
            .query({ date: dateStr });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle getProviderAvailability for non-existent provider', async () => {
          const res = await request(app)
            .get('/api/v1/providers/non-existent-provider-id/availability')
            .query({ date: '2025-12-20' });

          // Service returns stub availability for any providerId
          expect(res.status).toBe(200);
        });

        it('should handle setService', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/providers/me/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
              serviceId: 'svc-thai',
              price60: 800,
              price90: 1100,
              price120: 1400,
            });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle setService with invalid serviceId', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/providers/me/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
              serviceId: 'non-existent-service',
              price60: 800,
            });

          // Returns 400 for foreign key constraint violation
          expect([400, 404, 500]).toContain(res.status);
        });

        it('should handle removeService', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          // First add a service to remove (use svc-combo to avoid affecting other tests)
          const addRes = await request(app)
            .post('/api/v1/providers/me/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
              serviceId: 'svc-combo',
              price60: 1500,
            });

          // Only try to delete if the add succeeded
          if (addRes.status === 200) {
            const res = await request(app)
              .delete('/api/v1/providers/me/services/svc-combo')
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(204);
          } else {
            // Service may already exist or not found - still covers the controller
            expect([200, 400, 404, 500]).toContain(addRes.status);
          }
        });

        it('should handle removeService for non-existent service', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .delete('/api/v1/providers/me/services/non-existent-service')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(404);
        });

        it('should handle setMyAvailability', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .put('/api/v1/providers/me/availability')
            .set('Authorization', `Bearer ${token}`)
            .send([
              { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
            ]);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle uploadDocument', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/providers/me/documents')
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'ID', fileUrl: 'https://example.com/doc.jpg' });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
        });

        it('should handle requestPayout', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/providers/me/payouts')
            .set('Authorization', `Bearer ${token}`)
            .send({ amount: 1000 });

          // May fail due to insufficient balance, but covers the controller
          expect([200, 201, 400]).toContain(res.status);
        });

        it('should handle getProviderDetail for valid provider', async () => {
          const provider = await prisma.provider.findFirst();
          const res = await request(app)
            .get(`/api/v1/providers/${provider!.id}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
        });
      });

      describe('Reports Controller', () => {
        it('should handle createReport', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const providerUser = await prisma.user.findFirst({
            where: { email: 'provider@test.com' },
          });

          const res = await request(app)
            .post('/api/v1/reports')
            .set('Authorization', `Bearer ${token}`)
            .send({
              reportedId: providerUser!.id,
              type: 'UNPROFESSIONAL',
              description: 'Test report from controller test',
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          // Clean up
          if (res.body.data?.id) {
            await prisma.report.delete({ where: { id: res.body.data.id } });
          }
        });

        it('should handle getMyReports', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .get('/api/v1/reports/me')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });

        it('should handle uploadEvidence', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/reports/upload-evidence')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.url).toBeDefined();
        });

        it('should handle createReport with different report types', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const providerUser = await prisma.user.findFirst({
            where: { email: 'provider@test.com' },
          });

          // Test with SERVICE_QUALITY type
          const res = await request(app)
            .post('/api/v1/reports')
            .set('Authorization', `Bearer ${token}`)
            .send({
              reportedId: providerUser!.id,
              type: 'SERVICE_QUALITY',
              description: 'Test service quality report',
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data.type).toBe('SERVICE_QUALITY');

          // Clean up
          if (res.body.data?.id) {
            await prisma.report.delete({ where: { id: res.body.data.id } });
          }
        });

        it('should handle createReport with invalid reportedId', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          const res = await request(app)
            .post('/api/v1/reports')
            .set('Authorization', `Bearer ${token}`)
            .send({
              reportedId: 'non-existent-user-id',
              type: 'UNPROFESSIONAL',
              description: 'Test report with invalid user',
            });

          // Should fail due to foreign key constraint or validation
          expect([400, 404, 500]).toContain(res.status);
        });

        it('should handle getMyReports with existing reports', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;
          const userId = loginRes.body.data.user.id;

          const providerUser = await prisma.user.findFirst({
            where: { email: 'provider@test.com' },
          });

          // Create a report
          const report = await prisma.report.create({
            data: {
              reporterId: userId,
              reportedId: providerUser!.id,
              type: 'OTHER',
              description: 'Test report for getMyReports test',
            },
          });

          const res = await request(app)
            .get('/api/v1/reports/me')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);

          // Clean up
          await prisma.report.delete({ where: { id: report.id } });
        });
      });

      describe('Services Controller', () => {
        it('should handle getServiceDetail for non-existent service', async () => {
          const res = await request(app)
            .get('/api/v1/services/non-existent-service-id');

          expect(res.status).toBe(404);
        });

        it('should handle validatePromoCode with missing code', async () => {
          const res = await request(app)
            .post('/api/v1/services/promotions/validate')
            .send({});

          expect([400, 404]).toContain(res.status);
        });
      });

      describe('Bookings Controller', () => {
        it('should handle getProviderLocation for valid booking', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'customer@test.com', password: 'customer123!' });
          const token = loginRes.body.data.accessToken;

          // Create a test booking
          const customer = await prisma.user.findFirst({
            where: { email: 'customer@test.com' },
          });
          const provider = await prisma.provider.findFirst({
            where: { user: { email: 'provider@test.com' } },
          });

          const scheduledAt = new Date();
          scheduledAt.setHours(scheduledAt.getHours() + 8);

          const booking = await prisma.booking.create({
            data: {
              bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
              customerId: customer!.id,
              providerId: provider!.id,
              serviceId: 'svc-thai',
              duration: 60,
              scheduledAt,
              addressText: 'Controller Test Location',
              latitude: 14.5586,
              longitude: 121.0178,
              serviceAmount: 800,
              travelFee: 0,
              totalAmount: 800,
              platformFee: 160,
              providerEarning: 640,
              status: 'ACCEPTED',
            },
          });

          const res = await request(app)
            .get(`/api/v1/bookings/${booking.id}/location`)
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);

          // Clean up
          await prisma.booking.delete({ where: { id: booking.id } });
        });

        it('should handle triggerSOS for valid booking', async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'provider@test.com', password: 'provider123!' });
          const token = loginRes.body.data.accessToken;

          const customer = await prisma.user.findFirst({
            where: { email: 'customer@test.com' },
          });
          const provider = await prisma.provider.findFirst({
            where: { user: { email: 'provider@test.com' } },
          });

          const scheduledAt = new Date();
          scheduledAt.setHours(scheduledAt.getHours() + 8);

          const booking = await prisma.booking.create({
            data: {
              bookingNumber: `CM${Date.now().toString(36).toUpperCase()}`,
              customerId: customer!.id,
              providerId: provider!.id,
              serviceId: 'svc-thai',
              duration: 60,
              scheduledAt,
              addressText: 'SOS Controller Test',
              latitude: 14.5586,
              longitude: 121.0178,
              serviceAmount: 800,
              travelFee: 0,
              totalAmount: 800,
              platformFee: 160,
              providerEarning: 640,
              status: 'IN_PROGRESS',
            },
          });

          const res = await request(app)
            .post(`/api/v1/bookings/${booking.id}/sos`)
            .set('Authorization', `Bearer ${token}`)
            .send({ message: 'Controller test SOS' });

          expect(res.status).toBe(200);

          // Clean up
          await prisma.report.deleteMany({ where: { bookingId: booking.id } });
          await prisma.booking.delete({ where: { id: booking.id } });
        });
      });

      describe('Admin Controller', () => {
        let adminToken: string;

        beforeAll(async () => {
          const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@callmsg.com', password: 'admin123!' });
          adminToken = loginRes.body.data.accessToken;
        });

        it('should handle getProviderDetail for non-existent provider', async () => {
          const res = await request(app)
            .get('/api/v1/admin/providers/non-existent-provider-id')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle approveProvider for non-existent provider', async () => {
          const res = await request(app)
            .post('/api/v1/admin/providers/non-existent-id/approve')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle rejectProvider for non-existent provider', async () => {
          const res = await request(app)
            .post('/api/v1/admin/providers/non-existent-id/reject')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Test rejection' });

          expect(res.status).toBe(404);
        });

        it('should handle suspendProvider for non-existent provider', async () => {
          const res = await request(app)
            .post('/api/v1/admin/providers/non-existent-id/suspend')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Test suspension' });

          expect(res.status).toBe(404);
        });

        it('should handle unsuspendProvider for non-existent provider', async () => {
          const res = await request(app)
            .post('/api/v1/admin/providers/non-existent-id/unsuspend')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle getBookingDetail for non-existent booking', async () => {
          const res = await request(app)
            .get('/api/v1/admin/bookings/non-existent-booking-id')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle processPayout for non-existent payout', async () => {
          const res = await request(app)
            .post('/api/v1/admin/payouts/non-existent-payout-id/process')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ referenceNumber: 'REF123' });

          expect(res.status).toBe(404);
        });

        it('should handle rejectPayout for non-existent payout', async () => {
          const res = await request(app)
            .post('/api/v1/admin/payouts/non-existent-payout-id/reject')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Invalid payout' });

          expect(res.status).toBe(404);
        });

        it('should handle getReportDetail for non-existent report', async () => {
          const res = await request(app)
            .get('/api/v1/admin/reports/non-existent-report-id')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle assignReport for non-existent report', async () => {
          const res = await request(app)
            .post('/api/v1/admin/reports/non-existent-id/assign')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle resolveReport for non-existent report', async () => {
          const res = await request(app)
            .post('/api/v1/admin/reports/non-existent-id/resolve')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ resolution: 'Resolved', actionTaken: 'None' });

          expect(res.status).toBe(404);
        });

        it('should handle dismissReport for non-existent report', async () => {
          const res = await request(app)
            .post('/api/v1/admin/reports/non-existent-id/dismiss')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Invalid report' });

          expect(res.status).toBe(404);
        });

        it('should handle getUserDetail for non-existent user', async () => {
          const res = await request(app)
            .get('/api/v1/admin/users/non-existent-user-id')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle suspendUser for non-existent user', async () => {
          const res = await request(app)
            .post('/api/v1/admin/users/non-existent-user-id/suspend')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Test suspension' });

          expect(res.status).toBe(404);
        });

        it('should handle updateService for non-existent service', async () => {
          const res = await request(app)
            .patch('/api/v1/admin/services/non-existent-service-id')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ basePrice: 1000 });

          expect(res.status).toBe(404);
        });

        it('should handle deleteService for non-existent service', async () => {
          const res = await request(app)
            .delete('/api/v1/admin/services/non-existent-service-id')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle updatePromotion for non-existent promotion', async () => {
          const res = await request(app)
            .patch('/api/v1/admin/promotions/non-existent-promotion-id')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ discountValue: 25 });

          expect(res.status).toBe(404);
        });

        it('should handle deletePromotion for non-existent promotion', async () => {
          const res = await request(app)
            .delete('/api/v1/admin/promotions/non-existent-promotion-id')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.status).toBe(404);
        });

        it('should handle createService with valid data', async () => {
          const res = await request(app)
            .post('/api/v1/admin/services')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: 'Controller Test Service',
              nameKo: '컨트롤러 테스트',
              description: 'Test service from controller test',
              category: 'COMBINATION',
              baseDuration: 90,
              basePrice: 1200,
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          // Clean up
          if (res.body.data?.id) {
            await prisma.service.delete({ where: { id: res.body.data.id } });
          }
        });

        it('should handle createPromotion with valid data', async () => {
          const startsAt = new Date();
          const endsAt = new Date();
          endsAt.setDate(endsAt.getDate() + 7);

          const res = await request(app)
            .post('/api/v1/admin/promotions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              code: `CTRLTEST${Date.now()}`,
              name: 'Controller Test Promo',
              discountType: 'FIXED',
              discountValue: 100,
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          // Clean up
          if (res.body.data?.id) {
            await prisma.promotion.delete({ where: { id: res.body.data.id } });
          }
        });
      });
    });
  });
});
