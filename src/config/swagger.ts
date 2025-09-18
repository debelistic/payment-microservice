import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Microservice API',
      version: '1.0.0',
      description: 'A comprehensive Node.js microservice for payment processing simulation with robust error handling, validation, and asynchronous processing.',
      contact: {
        name: 'Payment Microservice Developer',
        email: 'developer@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique payment identifier'
            },
            amount: {
              type: 'number',
              minimum: 0,
              description: 'Payment amount'
            },
            currency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              description: 'Currency code (ISO 4217)'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
              description: 'Payment status'
            },
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cryptocurrency'],
              description: 'Payment method'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Payment description'
            },
            customerId: {
              type: 'string',
              format: 'uuid',
              description: 'Customer identifier'
            },
            merchantId: {
              type: 'string',
              format: 'uuid',
              description: 'Merchant identifier'
            },
            metadata: {
              type: 'object',
              description: 'Additional payment metadata'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Payment creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Payment last update timestamp'
            },
            processedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Payment processing completion timestamp'
            },
            failureReason: {
              type: 'string',
              maxLength: 500,
              description: 'Reason for payment failure'
            },
            transactionId: {
              type: 'string',
              maxLength: 100,
              description: 'External transaction identifier'
            }
          },
          required: ['id', 'amount', 'currency', 'status', 'paymentMethod', 'customerId', 'merchantId', 'createdAt', 'updatedAt']
        },
        PaymentRequest: {
          type: 'object',
          required: ['amount', 'currency', 'paymentMethod', 'customerId', 'merchantId'],
          properties: {
            amount: {
              type: 'number',
              minimum: 0.01,
              description: 'Payment amount'
            },
            currency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              description: 'Currency code (ISO 4217)'
            },
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cryptocurrency'],
              description: 'Payment method'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Payment description'
            },
            customerId: {
              type: 'string',
              format: 'uuid',
              description: 'Customer identifier'
            },
            merchantId: {
              type: 'string',
              format: 'uuid',
              description: 'Merchant identifier'
            },
            metadata: {
              type: 'object',
              description: 'Additional payment metadata'
            }
          }
        },
        PaymentUpdateRequest: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
              description: 'New payment status'
            },
            failureReason: {
              type: 'string',
              maxLength: 500,
              description: 'Reason for payment failure'
            },
            transactionId: {
              type: 'string',
              maxLength: 100,
              description: 'External transaction identifier'
            },
            metadata: {
              type: 'object',
              description: 'Additional payment metadata'
            }
          }
        },
        PaymentListResponse: {
          type: 'object',
          properties: {
            payments: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Payment'
              }
            },
            total: {
              type: 'integer',
              description: 'Total number of payments'
            },
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Number of payments per page'
            },
            hasMore: {
              type: 'boolean',
              description: 'Whether there are more pages available'
            }
          }
        },
        PaymentStats: {
          type: 'object',
          properties: {
            totalPayments: {
              type: 'integer',
              description: 'Total number of payments'
            },
            totalAmount: {
              type: 'number',
              description: 'Total amount of all payments'
            },
            averageAmount: {
              type: 'number',
              description: 'Average payment amount'
            },
            statusCounts: {
              type: 'object',
              description: 'Count of payments by status'
            },
            currencyCounts: {
              type: 'object',
              description: 'Count of payments by currency'
            },
            methodCounts: {
              type: 'object',
              description: 'Count of payments by method'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            data: {
              description: 'Response data (varies by endpoint)'
            },
            error: {
              $ref: '#/components/schemas/Error'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Error code'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          },
          required: ['code', 'message']
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request - validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Payments',
        description: 'Payment operations including creation, retrieval, updates, and statistics'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
