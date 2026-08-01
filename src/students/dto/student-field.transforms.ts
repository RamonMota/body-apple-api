import { TransformFnParams } from 'class-transformer';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');

  let candidate: string;

  if (trimmed.startsWith('+')) {
    candidate = `+${digits}`;
  } else if (/^55\d{10,11}$/.test(digits)) {
    candidate = `+${digits}`;
  } else if (/^\d{10,11}$/.test(digits)) {
    candidate = `+55${digits}`;
  } else {
    return null;
  }

  return E164_PATTERN.test(candidate) ? candidate : null;
}

export function normalizePhoneField({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') {
    return value as unknown;
  }

  return normalizePhone(value) ?? value.trim();
}

export function parseDateOnly({ value }: TransformFnParams): unknown {
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
