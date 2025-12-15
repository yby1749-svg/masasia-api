import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MASASIA API',
      version: '1.0.0',
      description: 'On-demand massage booking platform API',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['CUSTOMER', 'PROVIDER', 'ADMIN'] },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'phone'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            phone: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            nameKo: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            baseDuration: { type: 'number' },
            basePrice: { type: 'number' },
            imageUrl: { type: 'string', nullable: true },
          },
        },
        Provider: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            displayName: { type: 'string' },
            bio: { type: 'string', nullable: true },
            rating: { type: 'number' },
            totalRatings: { type: 'number' },
            completedBookings: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] },
            onlineStatus: { type: 'string', enum: ['ONLINE', 'OFFLINE', 'BUSY'] },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            customerId: { type: 'string' },
            providerId: { type: 'string' },
            serviceId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'ACCEPTED', 'PROVIDER_EN_ROUTE', 'PROVIDER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
            },
            scheduledAt: { type: 'string', format: 'date-time' },
            duration: { type: 'number' },
            totalAmount: { type: 'number' },
            addressText: { type: 'string' },
          },
        },
        CreateBookingRequest: {
          type: 'object',
          required: ['providerId', 'serviceId', 'duration', 'scheduledAt', 'addressText', 'latitude', 'longitude'],
          properties: {
            providerId: { type: 'string' },
            serviceId: { type: 'string' },
            duration: { type: 'number' },
            scheduledAt: { type: 'string', format: 'date-time' },
            addressText: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            notes: { type: 'string' },
            promoCode: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
