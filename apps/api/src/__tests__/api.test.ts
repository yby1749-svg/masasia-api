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
        expect(res.body.data.booking.serviceAmount).toBe(800);

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
            serviceId: 'svc-deep', // Provider doesn't offer this
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
});
