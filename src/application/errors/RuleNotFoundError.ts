export class RuleNotFoundError extends Error {
  constructor(public ids: number[]) {
    super(`Rule ID(s) not found: ${ids.join(', ')}`);
  }
}
