import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsNotFutureDate(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isNotFutureDate',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            value instanceof Date &&
            !Number.isNaN(value.getTime()) &&
            value.getTime() <= Date.now()
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} não pode estar no futuro`;
        },
      },
    });
  };
}
