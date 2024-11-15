import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment } from '../entities/payment.entity';
import { PaymentProcessorService } from './payment-processor.service';
import { MealSubscriptionService } from '../../meal-subscription/meal-subscription.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly paymentProcessor: PaymentProcessorService,
    private readonly subscriptionService: MealSubscriptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPayment(
    userId: string,
    createDto: CreatePaymentDto,
  ): Promise<Payment> {
    const subscription = await this.subscriptionService.findOne(
      userId,
      createDto.subscriptionId,
    );

    const payment = this.paymentRepository.create({
      userId,
      subscriptionId: subscription.id,
      amount: subscription.price,
      paymentMethod: createDto.paymentMethod,
      paymentDetails: createDto.paymentDetails,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    try {
      const result = await this.paymentProcessor.processPayment(
        payment.amount,
        payment.paymentMethod,
        payment.paymentDetails,
      );

      if (result.success) {
        savedPayment.status = PaymentStatus.COMPLETED;
        savedPayment.paidAt = new Date();
        await this.paymentRepository.save(savedPayment);

        await this.eventEmitter.emit('payment.completed', {
          paymentId: savedPayment.id,
          userId,
          subscriptionId: subscription.id,
        });
      }
    } catch (error) {
      savedPayment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(savedPayment);
      throw new BadRequestException('Payment processing failed');
    }

    return savedPayment;
  }

  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: { userId },
      relations: ['subscription'],
      order: { createdAt: 'DESC' },
    });
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment cannot be refunded');
    }

    const result = await this.paymentProcessor.refundPayment(
      payment.paymentDetails.transactionId,
      payment.amount,
    );

    if (result.success) {
      payment.status = PaymentStatus.REFUNDED;
      await this.paymentRepository.save(payment);
    }

    return payment;
  }
}
