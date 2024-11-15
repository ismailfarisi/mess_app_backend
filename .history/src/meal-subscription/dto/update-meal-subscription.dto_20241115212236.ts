import { IsEnum, IsOptional } from 'class-validator';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
