import { TransformFnParams } from 'class-transformer';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function trimRoutineString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export function parseRoutineDateOnly({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return value as unknown;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return new Date(Number.NaN);
  }

  return date;
}
