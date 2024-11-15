import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create payment for subscription' })
  createPayment(@GetUser() user: User, @Body() createDto: CreatePaymentDto) {
    return this.paymentService.createPayment(user.id, createDto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history' })
  getPaymentHistory(@GetUser() user: User) {
    return this.paymentService.getPaymentHistory(user.id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund payment' })
  refundPayment(@Param('id') id: string) {
    return this.paymentService.refundPayment(id);
  }
}
