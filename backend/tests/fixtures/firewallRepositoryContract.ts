import { IFirewallRepository } from '../../src/application/ports/IFirewallRepository';
import { AnyFirewallRule, Mode } from '../../src/domain/models/FirewallRule';
import { DomainRule } from '../../src/domain/models/DomainRule';
import { IpRule } from '../../src/domain/models/IpRule';
import { PortRule } from '../../src/domain/models/PortRule';
import { RuleType } from '../../src/domain/models/RuleType';

/**
 * The behaviour every IFirewallRepository implementation owes the application,
 * expressed once and run against each adapter. FirewallService is written
 * against this contract alone, so an adapter that satisfies it can be swapped
 * in at the composition root without touching the application layer.
 *
 * Assertions are containment-based and never assume an empty store, because the
 * PostgreSQL run shares a real database with whatever else lives in it.
 */
export interface RepositoryContractHooks {
  /** Returns a repository over the storage under test. */
  createRepository: () => IFirewallRepository;
  setUp?: () => Promise<void>;
  tearDown?: () => Promise<void>;
}

export function describeFirewallRepositoryContract(
  name: string,
  hooks: RepositoryContractHooks,
): void {
  describe(`${name} satisfies the IFirewallRepository contract`, () => {
    let repository: IFirewallRepository;
    let createdIds: number[] = [];

    beforeAll(async () => {
      await hooks.setUp?.();
    });

    afterAll(async () => {
      await hooks.tearDown?.();
    });

    beforeEach(() => {
      repository = hooks.createRepository();
      createdIds = [];
    });

    afterEach(async () => {
      for (const id of createdIds) {
        await repository.remove(id);
      }
    });

    /** Creates a rule through the port and schedules it for cleanup. */
    async function create(
      type: RuleType,
      value: string | number,
      active = true,
      mode: Mode = 'blacklist',
    ): Promise<AnyFirewallRule> {
      const rule = await repository.create(type, value, active, mode);
      createdIds.push(rule.id);

      return rule;
    }

    describe('create()', () => {
      it('persists an ip rule and returns it as an IpRule', async () => {
        // Act
        const rule = await create(RuleType.IP, '10.20.30.40');

        // Assert
        expect(rule).toBeInstanceOf(IpRule);
        expect(rule.type).toBe(RuleType.IP);
        expect(rule.value).toBe('10.20.30.40');
      });

      it('persists a domain rule and returns it as a DomainRule', async () => {
        // Act
        const rule = await create(RuleType.DOMAIN, 'contract.example.com');

        // Assert
        expect(rule).toBeInstanceOf(DomainRule);
        expect(rule.type).toBe(RuleType.DOMAIN);
        expect(rule.value).toBe('contract.example.com');
      });

      it('persists a port rule and returns it as a PortRule', async () => {
        // Act
        const rule = await create(RuleType.PORT, 8443);

        // Assert
        expect(rule).toBeInstanceOf(PortRule);
        expect(rule.type).toBe(RuleType.PORT);
        expect(rule.value).toBe(8443);
      });

      it('assigns a numeric id', async () => {
        // Act
        const rule = await create(RuleType.IP, '10.20.30.41');

        // Assert
        expect(typeof rule.id).toBe('number');
        expect(Number.isInteger(rule.id)).toBe(true);
      });

      it('assigns a distinct id to every rule', async () => {
        // Act
        const first = await create(RuleType.IP, '10.20.30.42');
        const second = await create(RuleType.IP, '10.20.30.43');
        const third = await create(RuleType.PORT, 8444);

        // Assert
        expect(new Set([first.id, second.id, third.id]).size).toBe(3);
      });

      it('preserves the requested mode and active flag', async () => {
        // Act
        const rule = await create(RuleType.DOMAIN, 'modes.example.com', false, 'whitelist');

        // Assert
        expect(rule.mode).toBe('whitelist');
        expect(rule.active).toBe(false);
      });
    });

    describe('getById()', () => {
      it('returns an equivalent rule for a persisted id', async () => {
        // Arrange
        const created = await create(RuleType.PORT, 8445, true, 'whitelist');

        // Act
        const found = await repository.getById(created.id);

        // Assert
        expect(found).toBeDefined();
        expect(found!.toDetailedJSON()).toEqual(created.toDetailedJSON());
      });

      it('returns a port value as a number, not a string', async () => {
        // Arrange
        const created = await create(RuleType.PORT, 8446);

        // Act
        const found = await repository.getById(created.id);

        // Assert
        expect(typeof found!.value).toBe('number');
        expect(found!.value).toBe(8446);
      });

      it('returns an ip value as a string', async () => {
        // Arrange
        const created = await create(RuleType.IP, '10.20.30.44');

        // Act
        const found = await repository.getById(created.id);

        // Assert
        expect(typeof found!.value).toBe('string');
      });

      it('returns undefined for an id that was never persisted', async () => {
        // Act
        const found = await repository.getById(987654321);

        // Assert
        expect(found).toBeUndefined();
      });

      it('returns undefined for an id that was removed', async () => {
        // Arrange
        const created = await create(RuleType.IP, '10.20.30.45');
        await repository.remove(created.id);

        // Act
        const found = await repository.getById(created.id);

        // Assert
        expect(found).toBeUndefined();
      });
    });

    describe('getAll()', () => {
      it('includes every persisted rule', async () => {
        // Arrange
        const first = await create(RuleType.IP, '10.20.30.46');
        const second = await create(RuleType.DOMAIN, 'all.example.com');

        // Act
        const all = await repository.getAll();

        // Assert
        const ids = all.map((rule) => rule.id);
        expect(ids).toEqual(expect.arrayContaining([first.id, second.id]));
      });

      it('reconstructs each rule as its own domain subtype', async () => {
        // Arrange
        const ip = await create(RuleType.IP, '10.20.30.47');
        const port = await create(RuleType.PORT, 8447);

        // Act
        const all = await repository.getAll();

        // Assert
        expect(all.find((rule) => rule.id === ip.id)).toBeInstanceOf(IpRule);
        expect(all.find((rule) => rule.id === port.id)).toBeInstanceOf(PortRule);
      });
    });

    describe('update()', () => {
      it('returns the updated entity', async () => {
        // Arrange
        const created = await create(RuleType.IP, '10.20.30.48', true);
        created.setActive(false);

        // Act
        const updated = await repository.update(created.id, created);

        // Assert
        expect(updated).toBeDefined();
        expect(updated!.active).toBe(false);
        expect(updated!.id).toBe(created.id);
      });

      it('persists the status change for a later read', async () => {
        // Arrange
        const created = await create(RuleType.IP, '10.20.30.49', true);
        created.setActive(false);
        await repository.update(created.id, created);

        // Act
        const found = await repository.getById(created.id);

        // Assert
        expect(found!.active).toBe(false);
      });

      it('returns undefined for an id that was never persisted', async () => {
        // Arrange
        const detached = await create(RuleType.IP, '10.20.30.50');

        // Act
        const updated = await repository.update(987654321, detached);

        // Assert
        expect(updated).toBeUndefined();
      });
    });

    describe('remove()', () => {
      it('reports true when a rule was removed', async () => {
        // Arrange
        const created = await create(RuleType.IP, '10.20.30.51');

        // Act
        const removed = await repository.remove(created.id);

        // Assert
        expect(removed).toBe(true);
      });

      it('makes the rule disappear from getAll()', async () => {
        // Arrange
        const created = await create(RuleType.IP, '10.20.30.52');
        await repository.remove(created.id);

        // Act
        const all = await repository.getAll();

        // Assert
        expect(all.map((rule) => rule.id)).not.toContain(created.id);
      });

      it('reports false for an id that was never persisted', async () => {
        // Act
        const removed = await repository.remove(987654321);

        // Assert
        expect(removed).toBe(false);
      });

      it('reports false when the same rule is removed twice', async () => {
        // Arrange
        const created = await create(RuleType.IP, '10.20.30.53');
        await repository.remove(created.id);

        // Act
        const removedAgain = await repository.remove(created.id);

        // Assert
        expect(removedAgain).toBe(false);
      });
    });
  });
}
