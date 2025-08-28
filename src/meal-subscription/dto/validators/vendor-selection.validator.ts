import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsUniqueVendorArrayConstraint
  implements ValidatorConstraintInterface
{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(vendorIds: string[], _args: ValidationArguments): boolean {
    if (!Array.isArray(vendorIds)) {
      return false;
    }

    // Check for unique values
    const uniqueVendorIds = new Set(vendorIds);
    if (uniqueVendorIds.size !== vendorIds.length) {
      return false;
    }

    // Check max count (4 vendors)
    if (vendorIds.length > 4) {
      return false;
    }

    // Check min count (1 vendor)
    if (vendorIds.length < 1) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const vendorIds = args.value as string[];

    if (!Array.isArray(vendorIds)) {
      return 'Vendor IDs must be an array';
    }

    if (vendorIds.length < 1) {
      return 'At least one vendor must be selected';
    }

    if (vendorIds.length > 4) {
      return 'Maximum 4 vendors can be selected for monthly subscription';
    }

    const uniqueVendorIds = new Set(vendorIds);
    if (uniqueVendorIds.size !== vendorIds.length) {
      return 'All vendor IDs must be unique';
    }

    return 'Invalid vendor selection';
  }
}

export function IsValidVendorSelection(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUniqueVendorArrayConstraint,
    });
  };
}
