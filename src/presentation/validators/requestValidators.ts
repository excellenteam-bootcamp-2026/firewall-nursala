

export function validateValues(values: unknown): void {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Values must be a non-empty array.');
  }
}

export function validateIds(ids: unknown): void {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Ids must be a non-empty array of integers.');
  }
  if (!ids.every((id) => Number.isInteger(id))) {
    throw new Error('Ids must be a non-empty array of integers.');
  }
}

export function validateActive(active: unknown): void {
  if (typeof active !== 'boolean') {
    throw new Error('Active must be a boolean.');
  }
}

export function validateMode(mode: unknown): void {
  if (mode === undefined) {
    return;
  }
  if (mode !== 'blacklist' && mode !== 'whitelist') {
    throw new Error("Mode must be either 'blacklist' or 'whitelist'.");
  }
}
