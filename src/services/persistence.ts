import { promises as fs } from 'fs';
import path from 'path';
import { Payment } from '../types';

export interface PersistenceConfig {
  dataFile: string;
  enableFilePersistence: boolean;
}

export class PaymentPersistenceService {
  private payments: Map<string, Payment> = new Map();
  private config: PersistenceConfig;

  constructor(config: PersistenceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.config.enableFilePersistence) {
      await this.loadFromFile();
    }
  }

  async create(payment: Payment): Promise<Payment> {
    this.payments.set(payment.id, { ...payment });
    
    if (this.config.enableFilePersistence) {
      await this.saveToFile();
    }
    
    return { ...payment };
  }

  async findById(id: string): Promise<Payment | null> {
    const payment = this.payments.get(id);
    return payment ? { ...payment } : null;
  }

  async findAll(filters?: {
    status?: string;
    currency?: string;
    customerId?: string;
    merchantId?: string;
    page?: number;
    limit?: number;
  }): Promise<Payment[]> {
    let filteredPayments = Array.from(this.payments.values());

    if (filters) {
      if (filters.status) {
        filteredPayments = filteredPayments.filter(p => p.status === filters.status);
      }
      if (filters.currency) {
        filteredPayments = filteredPayments.filter(p => p.currency === filters.currency);
      }
      if (filters.customerId) {
        filteredPayments = filteredPayments.filter(p => p.customerId === filters.customerId);
      }
      if (filters.merchantId) {
        filteredPayments = filteredPayments.filter(p => p.merchantId === filters.merchantId);
      }
    }

    // sort by creation date (newest first)
    filteredPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // apply pagination
    if (filters?.page && filters?.limit) {
      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      filteredPayments = filteredPayments.slice(startIndex, endIndex);
    }

    return filteredPayments.map(payment => ({ ...payment }));
  }

  async update(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) {
      return null;
    }

    const updatedPayment: Payment = {
      ...existingPayment,
      ...updates,
      updatedAt: new Date()
    };

    this.payments.set(id, updatedPayment);

    if (this.config.enableFilePersistence) {
      await this.saveToFile();
    }

    return { ...updatedPayment };
  }

  async delete(id: string): Promise<boolean> {
    const exists = this.payments.has(id);
    if (exists) {
      this.payments.delete(id);
      
      if (this.config.enableFilePersistence) {
        await this.saveToFile();
      }
    }
    return exists;
  }

  async count(): Promise<number> {
    return this.payments.size;
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.transactionId === transactionId) {
        return { ...payment };
      }
    }
    return null;
  }

  private async loadFromFile(): Promise<void> {
    try {
      const filePath = path.resolve(this.config.dataFile);
      const data = await fs.readFile(filePath, 'utf-8');
      const paymentsData = JSON.parse(data) as Payment[];

      this.payments.clear();
      paymentsData.forEach(paymentData => {
        // convert date strings back to Date objects
        const payment: Payment = {
          ...paymentData,
          createdAt: new Date(paymentData.createdAt),
          updatedAt: new Date(paymentData.updatedAt),
          processedAt: paymentData.processedAt ? new Date(paymentData.processedAt) : undefined
        };
        this.payments.set(payment.id, payment);
      });
    } catch (error) {
      // file doesn't exist or is invalid, start with empty data
      console.warn('Could not load payments from file, starting with empty data:', error);
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const filePath = path.resolve(this.config.dataFile);
      const directory = path.dirname(filePath);
      
      // ensure directory exists
      await fs.mkdir(directory, { recursive: true });
      
      const paymentsArray = Array.from(this.payments.values());
      await fs.writeFile(filePath, JSON.stringify(paymentsArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save payments to file:', error);
      throw new Error('Failed to persist payment data');
    }
  }

  // for testing purposes
  async clearAll(): Promise<void> {
    this.payments.clear();
    if (this.config.enableFilePersistence) {
      await this.saveToFile();
    }
  }
}
