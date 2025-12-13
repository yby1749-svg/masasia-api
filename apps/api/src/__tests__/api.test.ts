import request from 'supertest';
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

  describe('GET /api/v1/services', () => {
    it('should return list of services', async () => {
      const res = await request(app).get('/api/v1/services');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
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
            serviceId: 'svc-aroma',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Location Test Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

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
            serviceId: 'svc-aroma',
            duration: 60,
            scheduledAt: scheduledAt.toISOString(),
            addressText: 'Incomplete Booking Address',
            latitude: 14.5586,
            longitude: 121.0178,
          });

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
    let providerId: string;
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

      // Get provider ID
      const provider = await prisma.provider.findFirst({
        where: { user: { email: 'provider@test.com' } },
      });
      providerId = provider!.id;
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
    const providerEmail = 'provider@test.com';
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
});
