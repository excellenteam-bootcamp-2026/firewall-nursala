import { RuleValidationError } from '../../../../application/errors/RuleValidationError';

export function validateValues(values: unknown): void {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RuleValidationError(
      'INVALID_VALUES',
      'Values must be a non-empty array.'
    );
  }
}

export function validateIds(ids: unknown): void {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new RuleValidationError(
      'INVALID_IDS',
      'Ids must be a non-empty array of integers.'
    );
  }
  if (!ids.every((id) => Number.isInteger(id))) {
    throw new RuleValidationError(
      'INVALID_IDS',
      'Ids must be a non-empty array of integers.'
    );
  }
}

export function validateActive(active: unknown): void {
  if (typeof active !== 'boolean') {
    throw new RuleValidationError(
      'INVALID_ACTIVE',
      'Active must be a boolean.'
    );
  }
}

export function validateMode(mode: unknown): void {
  if (mode !== 'blacklist' && mode !== 'whitelist') {
    throw new RuleValidationError(
      'INVALID_MODE',
      "Mode must be either 'blacklist' or 'whitelist'."
    );
  }
}
