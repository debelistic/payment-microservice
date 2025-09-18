export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency'
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
  customerId: string;
  merchantId: string;
  metadata?: Record<string, unknown>;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  description?: string;
  customerId: string;
  merchantId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failureReason?: string;
  transactionId?: string;
}

export interface PaymentUpdateRequest {
  status?: PaymentStatus;
  failureReason?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  averageAmount: number;
  statusCounts: Record<PaymentStatus, number>;
  currencyCounts: Record<string, number>;
  methodCounts: Record<PaymentMethod, number>;
}
