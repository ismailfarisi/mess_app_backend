import { IsUUID, IsEnum, ValidateNested, IsString } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';
import { Type } from 'class-transformer';

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
