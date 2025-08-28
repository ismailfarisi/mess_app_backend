import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(dateString: string, _args: ValidationArguments): boolean {
    if (!dateString) {
      return false;
    }

    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Date must be valid
    if (isNaN(inputDate.getTime())) {
      return false;
    }

    // Date must be today or in the future
    return inputDate >= today;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(_args: ValidationArguments): string {
    return 'Start date must be today or a future date';
  }
}

@ValidatorConstraint({ async: false })
export class IsValidMonthStartConstraint
  implements ValidatorConstraintInterface
{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(dateString: string, _args: ValidationArguments): boolean {
    if (!dateString) {
      return false;
    }

    const inputDate = new Date(dateString);

    // Date must be valid
    if (isNaN(inputDate.getTime())) {
      return false;
    }

    // For monthly subscriptions, prefer first day of the month
    // but allow any date (business logic can adjust)
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid start date for monthly subscription';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

export function IsValidMonthStart(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidMonthStartConstraint,
    });
  };
}
