import { IFirewallRepository, AnyFirewallRule } from '../../domain/ports/IFirewallRepository';

export class InMemoryFirewallRepository implements IFirewallRepository {
  private rules: AnyFirewallRule[] = [];
  private currentId: number = 1;


  getAll(): AnyFirewallRule[] {
    return [...this.rules];
  }

  getById(id: number): AnyFirewallRule | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  add(rule: AnyFirewallRule): AnyFirewallRule {
    this.rules.push(rule);
    return rule;
  }

  remove(id: number): boolean {
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) return false;
    this.rules.splice(index, 1);
    return true;
  }

  update(id: number, updatedRule: AnyFirewallRule): AnyFirewallRule | undefined {
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) return undefined;
    this.rules[index] = updatedRule;
    return updatedRule;
  }

    getNextId(): number {
        return this.currentId++;
    }
}