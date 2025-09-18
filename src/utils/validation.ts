import Joi from 'joi';
import { PaymentMethod, PaymentStatus } from '../types';

export const createPaymentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required()
    .messages({
      'number.positive': 'Amount must be a positive number',
      'number.precision': 'Amount must have at most 2 decimal places',
      'any.required': 'Amount is required'
    }),
  currency: Joi.string().length(3).uppercase().required()
    .messages({
      'string.length': 'Currency must be a 3-character ISO code',
      'string.uppercase': 'Currency must be uppercase',
      'any.required': 'Currency is required'
    }),
  paymentMethod: Joi.string().valid(...Object.values(PaymentMethod)).required()
    .messages({
      'any.only': 'Payment method must be one of: credit_card, debit_card, bank_transfer, digital_wallet, cryptocurrency',
      'any.required': 'Payment method is required'
    }),
  description: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  customerId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Customer ID must be a valid UUID',
      'any.required': 'Customer ID is required'
    }),
  merchantId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Merchant ID must be a valid UUID',
      'any.required': 'Merchant ID is required'
    }),
  metadata: Joi.object().optional()
    .messages({
      'object.base': 'Metadata must be an object'
    })
});

export const updatePaymentSchema = Joi.object({
  status: Joi.string().valid(...Object.values(PaymentStatus)).optional()
    .messages({
      'any.only': 'Status must be one of: pending, processing, completed, failed, cancelled, refunded'
    }),
  failureReason: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Failure reason must not exceed 500 characters'
    }),
  transactionId: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Transaction ID must not exceed 100 characters'
    }),
  metadata: Joi.object().optional()
    .messages({
      'object.base': 'Metadata must be an object'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const paymentIdSchema = Joi.string().uuid().required()
  .messages({
    'string.guid': 'Payment ID must be a valid UUID',
    'any.required': 'Payment ID is required'
  });

export const queryParamsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(PaymentStatus)).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  customerId: Joi.string().uuid().optional(),
  merchantId: Joi.string().uuid().optional()
});

export const validateRequest = <T>(schema: Joi.ObjectSchema, data: unknown): T => {
  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new Error(`Validation failed: ${JSON.stringify(errorDetails)}`);
  }

  return value as T;
};
