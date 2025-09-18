import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { ApiResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { 
  createPaymentSchema, 
  updatePaymentSchema, 
  paymentIdSchema, 
  queryParamsSchema 
} from '../utils/validation';
import { logger } from '../utils/logger';

export const createPaymentRoutes = (paymentService: PaymentService): Router => {
  const router = Router();

  /**
   * @swagger
   * /payments:
   *   post:
   *     summary: Create a new payment
   *     tags: [Payments]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *               - currency
   *               - paymentMethod
   *               - customerId
   *               - merchantId
   *             properties:
   *               amount:
   *                 type: number
   *                 minimum: 0.01
   *                 example: 99.99
   *               currency:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 3
   *                 example: "USD"
   *               paymentMethod:
   *                 type: string
   *                 enum: [credit_card, debit_card, bank_transfer, digital_wallet, cryptocurrency]
   *                 example: "credit_card"
   *               description:
   *                 type: string
   *                 maxLength: 500
   *                 example: "Payment for services"
   *               customerId:
   *                 type: string
   *                 format: uuid
   *                 example: "123e4567-e89b-12d3-a456-426614174000"
   *               merchantId:
   *                 type: string
   *                 format: uuid
   *                 example: "987fcdeb-51a2-43d1-b789-123456789abc"
   *               metadata:
   *                 type: object
   *                 example: {"orderId": "ORD-123"}
   *     responses:
   *       201:
   *         description: Payment created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Payment'
   *       400:
   *         description: Validation error
   *       422:
   *         description: Payment processing error
   */
  router.post('/', 
    validateBody(createPaymentSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      logger.info('Creating new payment', { 
        customerId: req.body.customerId,
        merchantId: req.body.merchantId,
        amount: req.body.amount,
        currency: req.body.currency
      });

      const payment = await paymentService.createPayment(req.body);
      
      const response: ApiResponse = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    })
  );

  /**
   * @swagger
   * /payments/stats:
   *   get:
   *     summary: Get payment statistics
   *     tags: [Payments]
   *     responses:
   *       200:
   *         description: Payment statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalPayments:
   *                       type: integer
   *                     totalAmount:
   *                       type: number
   *                     averageAmount:
   *                       type: number
   *                     statusCounts:
   *                       type: object
   *                     currencyCounts:
   *                       type: object
   *                     methodCounts:
   *                       type: object
   */
  router.get('/stats',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const stats = await paymentService.getPaymentStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    })
  );

  /**
   * @swagger
   * /payments/{id}:
   *   get:
   *     summary: Get payment by ID
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Payment ID
   *     responses:
   *       200:
   *         description: Payment found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Payment'
   *       404:
   *         description: Payment not found
   */
  router.get('/:id',
    validateParams(paymentIdSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const payment = await paymentService.getPayment(req.params.id!);
      
      const response: ApiResponse = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    })
  );

  /**
   * @swagger
   * /payments:
   *   get:
   *     summary: Get list of payments with optional filters
   *     tags: [Payments]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of payments per page
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, processing, completed, failed, cancelled, refunded]
   *         description: Filter by payment status
   *       - in: query
   *         name: currency
   *         schema:
   *           type: string
   *           minLength: 3
   *           maxLength: 3
   *         description: Filter by currency
   *       - in: query
   *         name: customerId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by customer ID
   *       - in: query
   *         name: merchantId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by merchant ID
   *     responses:
   *       200:
   *         description: List of payments
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     payments:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Payment'
   *                     total:
   *                       type: integer
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     hasMore:
   *                       type: boolean
   */
  router.get('/',
    validateQuery(queryParamsSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const payments = await paymentService.getPayments(req.query);
      
      const response: ApiResponse = {
        success: true,
        data: payments,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    })
  );

  /**
   * @swagger
   * /payments/{id}:
   *   put:
   *     summary: Update payment status or details
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Payment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [pending, processing, completed, failed, cancelled, refunded]
   *               failureReason:
   *                 type: string
   *                 maxLength: 500
   *               transactionId:
   *                 type: string
   *                 maxLength: 100
   *               metadata:
   *                 type: object
   *     responses:
   *       200:
   *         description: Payment updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Payment'
   *       400:
   *         description: Validation error or invalid status transition
   *       404:
   *         description: Payment not found
   */
  router.put('/:id',
    validateParams(paymentIdSchema),
    validateBody(updatePaymentSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      logger.info('Updating payment', { 
        paymentId: req.params.id,
        updates: req.body
      });

      const payment = await paymentService.updatePayment(req.params.id!, req.body);
      
      const response: ApiResponse = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    })
  );

  /**
   * @swagger
   * /payments/{id}:
   *   patch:
   *     summary: Partially update payment
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Payment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [pending, processing, completed, failed, cancelled, refunded]
   *               failureReason:
   *                 type: string
   *                 maxLength: 500
   *               transactionId:
   *                 type: string
   *                 maxLength: 100
   *               metadata:
   *                 type: object
   *     responses:
   *       200:
   *         description: Payment updated successfully
   *       400:
   *         description: Validation error or invalid status transition
   *       404:
   *         description: Payment not found
   */
  router.patch('/:id',
    validateParams(paymentIdSchema),
    validateBody(updatePaymentSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const payment = await paymentService.updatePayment(req.params.id!, req.body);
      
      const response: ApiResponse = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    })
  );

  /**
   * @swagger
   * /payments/{id}:
   *   delete:
   *     summary: Delete a payment
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Payment ID
   *     responses:
   *       200:
   *         description: Payment deleted successfully
   *       400:
   *         description: Payment cannot be deleted due to status
   *       404:
   *         description: Payment not found
   */
  router.delete('/:id',
    validateParams(paymentIdSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const deleted = await paymentService.deletePayment(req.params.id!);
      
      const response: ApiResponse = {
        success: true,
        data: { deleted },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    })
  );

  return router;
};
