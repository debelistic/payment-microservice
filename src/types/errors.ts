export class PaymentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends PaymentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(paymentId: string) {
    super(`Payment with ID ${paymentId} not found`, 'PAYMENT_NOT_FOUND', 404);
    this.name = 'PaymentNotFoundError';
  }
}

export class InvalidPaymentStatusError extends PaymentError {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Cannot change payment status from ${currentStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
    this.name = 'InvalidPaymentStatusError';
  }
}

export class PaymentProcessingError extends PaymentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PAYMENT_PROCESSING_ERROR', 422, details);
    this.name = 'PaymentProcessingError';
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor(amount: number, availableAmount: number) {
    super(
      `Insufficient funds. Requested: ${amount}, Available: ${availableAmount}`,
      'INSUFFICIENT_FUNDS',
      422,
      { requestedAmount: amount, availableAmount }
    );
    this.name = 'InsufficientFundsError';
  }
}

export class DuplicatePaymentError extends PaymentError {
  constructor(transactionId: string) {
    super(
      `Payment with transaction ID ${transactionId} already exists`,
      'DUPLICATE_PAYMENT',
      409
    );
    this.name = 'DuplicatePaymentError';
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}
