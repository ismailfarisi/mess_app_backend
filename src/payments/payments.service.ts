import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  create(createPaymentDto: CreatePaymentDto) {
    return 'This action adds a new payment';
  }

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }

  /**
   * Process payment for monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param paymentMethodId - Payment method ID
   * @param amount - Payment amount
   * @param queryRunner - Optional query runner for transactions
   * @returns Created payment record
   */
  async processMonthlySubscriptionPayment(
    monthlySubscriptionId: string,
    paymentMethodId: string,
    amount: number,
    queryRunner?: QueryRunner,
  ): Promise<Payment> {
    this.logger.log(
      `Processing payment for monthly subscription ${monthlySubscriptionId}, amount: ${amount}`,
    );

    const repository = queryRunner
      ? queryRunner.manager.getRepository(Payment)
      : this.paymentRepository;

    try {
      // Create payment record
      const payment = repository.create({
        subscriptionId: monthlySubscriptionId,
        userId: 'temp-user-id', // TODO: Get actual user ID from subscription
        paymentMethod: paymentMethodId as any, // TODO: Convert to proper enum
        amount,
        status: PaymentStatus.PENDING,
        paymentDetails: { currency: 'AED' }, // Store currency in paymentDetails
      });

      const savedPayment = await repository.save(payment);

      // TODO: Integrate with actual payment processor
      // For now, simulate payment processing
      await this.simulatePaymentProcessing(savedPayment.id, queryRunner);

      this.logger.log(`Payment ${savedPayment.id} processed successfully`);
      return savedPayment;
    } catch (error: any) {
      this.logger.error(
        `Failed to process payment for monthly subscription ${monthlySubscriptionId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Payment processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Update payment status for monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param status - New payment status
   * @param queryRunner - Optional query runner for transactions
   */
  async updateMonthlyPaymentStatus(
    monthlySubscriptionId: string,
    status: PaymentStatus,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.log(
      `Updating payment status to ${status} for monthly subscription ${monthlySubscriptionId}`,
    );

    const repository = queryRunner
      ? queryRunner.manager.getRepository(Payment)
      : this.paymentRepository;

    const result = await repository.update(
      { subscriptionId: monthlySubscriptionId },
      { status },
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `No payment found for monthly subscription ${monthlySubscriptionId}`,
      );
    }

    this.logger.log(`Payment status updated successfully`);
  }

  /**
   * Get payment history for monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @returns Array of payment records
   */
  async getMonthlySubscriptionPayments(
    monthlySubscriptionId: string,
  ): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: { subscriptionId: monthlySubscriptionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Process refund for cancelled monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @param refundAmount - Amount to refund
   * @param reason - Refund reason
   * @param queryRunner - Optional query runner for transactions
   * @returns Created refund payment record
   */
  async processMonthlySubscriptionRefund(
    monthlySubscriptionId: string,
    refundAmount: number,
    reason: string,
    queryRunner?: QueryRunner,
  ): Promise<Payment> {
    this.logger.log(
      `Processing refund for monthly subscription ${monthlySubscriptionId}, amount: ${refundAmount}`,
    );

    const repository = queryRunner
      ? queryRunner.manager.getRepository(Payment)
      : this.paymentRepository;

    try {
      // Find original payment
      const originalPayment = await repository.findOne({
        where: {
          subscriptionId: monthlySubscriptionId,
          status: PaymentStatus.COMPLETED,
        },
        order: { createdAt: 'DESC' },
      });

      if (!originalPayment) {
        throw new NotFoundException(
          `No completed payment found for monthly subscription ${monthlySubscriptionId}`,
        );
      }

      // Create refund payment record
      const refundPayment = repository.create({
        subscriptionId: monthlySubscriptionId,
        userId: originalPayment.userId,
        paymentMethod: originalPayment.paymentMethod,
        amount: -refundAmount, // Negative amount for refund
        status: PaymentStatus.PENDING,
        paymentDetails: {
          type: 'refund',
          originalPaymentId: originalPayment.id,
          reason,
          currency: originalPayment.paymentDetails?.currency || 'AED',
        },
      });

      const savedRefund = await repository.save(refundPayment);

      // TODO: Process actual refund through payment processor
      // For now, mark as completed
      savedRefund.status = PaymentStatus.COMPLETED;
      await repository.save(savedRefund);

      this.logger.log(`Refund ${savedRefund.id} processed successfully`);
      return savedRefund;
    } catch (error: any) {
      this.logger.error(
        `Failed to process refund for monthly subscription ${monthlySubscriptionId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * Calculate payment summary for monthly subscription
   * @param monthlySubscriptionId - Monthly subscription ID
   * @returns Payment summary
   */
  async getMonthlySubscriptionPaymentSummary(monthlySubscriptionId: string): Promise<{
    totalPaid: number;
    totalRefunded: number;
    netAmount: number;
    paymentCount: number;
    lastPaymentDate: Date | null;
    paymentStatus: PaymentStatus;
  }> {
    const payments = await this.getMonthlySubscriptionPayments(monthlySubscriptionId);

    const totalPaid = payments
      .filter(p => p.amount > 0 && p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalRefunded = Math.abs(
      payments
        .filter(p => p.amount < 0 && p.status === PaymentStatus.COMPLETED)
        .reduce((sum, p) => sum + Number(p.amount), 0)
    );

    const netAmount = totalPaid - totalRefunded;
    const paymentCount = payments.filter(p => p.amount > 0).length;
    const lastPaymentDate = payments.length > 0 ? payments[0].createdAt : null;
    
    // Determine overall payment status
    let paymentStatus = PaymentStatus.PENDING;
    if (payments.some(p => p.status === PaymentStatus.COMPLETED && p.amount > 0)) {
      paymentStatus = PaymentStatus.COMPLETED;
    } else if (payments.some(p => p.status === PaymentStatus.FAILED)) {
      paymentStatus = PaymentStatus.FAILED;
    }

    return {
      totalPaid,
      totalRefunded,
      netAmount,
      paymentCount,
      lastPaymentDate,
      paymentStatus,
    };
  }

  /**
   * Simulate payment processing (placeholder for actual payment integration)
   * @param paymentId - Payment ID
   * @param queryRunner - Optional query runner for transactions
   */
  private async simulatePaymentProcessing(
    paymentId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const repository = queryRunner
      ? queryRunner.manager.getRepository(Payment)
      : this.paymentRepository;

    // For simulation, assume payment succeeds
    const payment = await repository.findOne({ where: { id: paymentId } });
    if (payment) {
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      payment.paymentDetails = {
        ...payment.paymentDetails,
        processedAt: new Date().toISOString()
      };
      await repository.save(payment);
    }
  }
}
