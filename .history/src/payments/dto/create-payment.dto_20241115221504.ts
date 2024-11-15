import { IsUUID, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class PaymentDetailsDto {
  @IsString()
  transactionId: string;

  @IsString()
  paymentToken: string;
}

export class CreatePaymentDto {
  @IsUUID()
  subscriptionId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails: PaymentDetailsDto;
}