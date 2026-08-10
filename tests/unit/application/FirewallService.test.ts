import { RuleNotFoundError } from '../../../src/application/errors/RuleNotFoundError';
import { RuleValidationError } from '../../../src/application/errors/RuleValidationError';
import { RuleType } from '../../../src/domain/models/RuleType';
import { createTestService, stubRule } from '../../fixtures/firewallMocks';

/** Runs an action expected to throw and hands back the thrown value for inspection. */
function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the action to throw, but it returned normally.');
}

describe('FirewallService', () => {
  describe('addRule()', () => {
    it('returns a single correctly shaped rule for a single valid value', () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const added = service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

      // Assert
      expect(added).toHaveLength(1);
      expect(added[0]!.toDetailedJSON()).toEqual({
        id: 1,
        type: RuleType.IP,
        mode: 'blacklist',
        value: '1.1.1.1',
        active: true,
      });
    });

    it('assigns sequential ids across a batch of values', () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const added = service.addRule(
        ['1.1.1.1', '2.2.2.2', '3.3.3.3'],
        RuleType.IP,
        true,
        'blacklist',
      );

      // Assert
      expect(added.map((rule) => rule.id)).toEqual([1, 2, 3]);
    });

    it('persists every rule of a valid batch to the repository', () => {
      // Arrange
      const { service, repository } = createTestService();

      // Act
      service.addRule(['1.1.1.1', '2.2.2.2'], RuleType.IP, true, 'blacklist');

      // Assert
      expect(repository.getAll().map((rule) => rule.value)).toEqual(['1.1.1.1', '2.2.2.2']);
    });

    it('honours the requested active flag', () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const added = service.addRule(['1.1.1.1'], RuleType.IP, false, 'whitelist');

      // Assert
      expect(added[0]!.active).toBe(false);
      expect(added[0]!.mode).toBe('whitelist');
    });

    it('continues numbering ids across separate calls', () => {
      // Arrange
      const { service } = createTestService();
      service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

      // Act
      const added = service.addRule(['example.com'], RuleType.DOMAIN, true, 'blacklist');

      // Assert
      expect(added[0]!.id).toBe(2);
    });

    describe('all-or-nothing validation', () => {
      it('throws a rule validation error when any value in the batch is invalid', () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        const error = captureError(() =>
          service.addRule(['1.1.1.1', '999.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect(error).toBeInstanceOf(RuleValidationError);
      });

      it('persists nothing at all when one value in the batch is invalid', () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        captureError(() =>
          service.addRule(['1.1.1.1', '999.1.1.1', '2.2.2.2'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect(repository.getAll()).toEqual([]);
      });

      it('never even reaches the repository when the batch is invalid', () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        captureError(() =>
          service.addRule(['1.1.1.1', '999.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect(repository.addCalls).toEqual([]);
      });

      it('rejects the batch even when the invalid value comes first', () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        captureError(() =>
          service.addRule(['999.1.1.1', '1.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect(repository.getAll()).toEqual([]);
      });

      it('leaves rules stored by earlier successful calls untouched', () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');
        factory.markInvalid('999.1.1.1');

        // Act
        captureError(() => service.addRule(['999.1.1.1'], RuleType.IP, true, 'blacklist'));

        // Assert
        expect(repository.getAll().map((rule) => rule.value)).toEqual(['1.1.1.1']);
      });

      it('reports the ip specific code when an ip batch fails', () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        const error = captureError(() =>
          service.addRule(['999.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect((error as RuleValidationError).code).toBe('INVALID_IP');
        expect((error as RuleValidationError).message).toBe(
          'IPs must be valid IPv4 addresses.',
        );
      });

      it('reports the domain specific code when a domain batch fails', () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid('-bad.com');

        // Act
        const error = captureError(() =>
          service.addRule(['-bad.com'], RuleType.DOMAIN, true, 'blacklist'),
        );

        // Assert
        expect((error as RuleValidationError).code).toBe('INVALID_DOMAIN');
      });

      it('reports the port specific code when a port batch fails', () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid(70000);

        // Act
        const error = captureError(() =>
          service.addRule([70000], RuleType.PORT, true, 'blacklist'),
        );

        // Assert
        expect((error as RuleValidationError).code).toBe('INVALID_PORT');
      });

      // Documents a real side effect of the current implementation: ids are drawn
      // from the repository before validation runs, so a rejected batch still burns
      // them. Delete this test if that behaviour is ever intentionally changed.
      it('still consumes ids from the repository when the batch is rejected', () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');
        captureError(() =>
          service.addRule(['999.1.1.1', '888.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Act
        const added = service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

        // Assert
        expect(added[0]!.id).toBe(3);
        expect(repository.getAll()).toHaveLength(1);
      });
    });
  });

  describe('removeRules()', () => {
    it('returns the removed rules in full detail', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP), stubRule(2, 8080, RuleType.PORT));

      // Act
      const removed = service.removeRules([1]);

      // Assert
      expect(removed).toHaveLength(1);
      expect(removed[0]!.toDetailedJSON()).toEqual({
        id: 1,
        type: RuleType.IP,
        mode: 'blacklist',
        value: '1.1.1.1',
        active: true,
      });
    });

    it('actually removes the rules from the repository', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, '2.2.2.2', RuleType.IP),
        stubRule(3, 8080, RuleType.PORT),
      );

      // Act
      service.removeRules([1, 3]);

      // Assert
      expect(repository.getAll().map((rule) => rule.id)).toEqual([2]);
    });

    it('removes rules of different types in one batch', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, 'example.com', RuleType.DOMAIN),
        stubRule(3, 8080, RuleType.PORT),
      );

      // Act
      const removed = service.removeRules([1, 2, 3]);

      // Assert
      expect(removed.map((rule) => rule.type)).toEqual([
        RuleType.IP,
        RuleType.DOMAIN,
        RuleType.PORT,
      ]);
      expect(repository.getAll()).toEqual([]);
    });

    it('throws a rule not found error when an id does not exist', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const error = captureError(() => service.removeRules([1, 9999]));

      // Assert
      expect(error).toBeInstanceOf(RuleNotFoundError);
    });

    it('names the missing id on the error', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const error = captureError(() => service.removeRules([1, 9999]));

      // Assert
      expect((error as RuleNotFoundError).ids).toEqual([9999]);
      expect((error as RuleNotFoundError).message).toBe('Rule ID(s) not found: 9999');
    });

    it('reports every missing id, not only the first', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const error = captureError(() => service.removeRules([9998, 1, 9999]));

      // Assert
      expect((error as RuleNotFoundError).ids).toEqual([9998, 9999]);
      expect((error as RuleNotFoundError).message).toBe('Rule ID(s) not found: 9998, 9999');
    });

    it('removes nothing when any id in the batch is missing', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP), stubRule(2, '2.2.2.2', RuleType.IP));

      // Act
      captureError(() => service.removeRules([1, 2, 9999]));

      // Assert
      expect(repository.getAll().map((rule) => rule.id)).toEqual([1, 2]);
    });

    it('never even reaches the repository remove when an id is missing', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      captureError(() => service.removeRules([1, 9999]));

      // Assert
      expect(repository.removeCalls).toEqual([]);
    });

    it('returns an empty array when given no ids', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const removed = service.removeRules([]);

      // Assert
      expect(removed).toEqual([]);
      expect(repository.getAll()).toHaveLength(1);
    });

    // Documents current behaviour: a repeated id resolves twice but only deletes
    // once, so the returned array is shorter than the id list that was passed in.
    it('returns a rule only once when the same id is listed twice', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const removed = service.removeRules([1, 1]);

      // Assert
      expect(removed).toHaveLength(1);
      expect(repository.getAll()).toEqual([]);
    });
  });

  describe('getAllRules()', () => {
    it('returns every rule when no type filter is given', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, 'example.com', RuleType.DOMAIN),
        stubRule(3, 8080, RuleType.PORT),
      );

      // Act
      const rules = service.getAllRules();

      // Assert
      expect(rules.map((rule) => rule.id)).toEqual([1, 2, 3]);
    });

    it('returns only the rules matching the requested type', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, 'example.com', RuleType.DOMAIN),
        stubRule(3, '2.2.2.2', RuleType.IP),
      );

      // Act
      const rules = service.getAllRules(RuleType.IP);

      // Assert
      expect(rules.map((rule) => rule.id)).toEqual([1, 3]);
    });

    it('returns an empty array when no rule matches the requested type', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const rules = service.getAllRules(RuleType.PORT);

      // Assert
      expect(rules).toEqual([]);
    });

    it('returns an empty array when the repository is empty', () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const rules = service.getAllRules();

      // Assert
      expect(rules).toEqual([]);
    });
  });

  describe('updateRulesStatus()', () => {
    it('returns the updated rules carrying the new active value', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, true));

      // Act
      const updated = service.updateRulesStatus([1], false);

      // Assert
      expect(updated).toHaveLength(1);
      expect(updated[0]!.active).toBe(false);
    });

    it('makes the change visible through the repository afterwards', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, true));

      // Act
      service.updateRulesStatus([1], false);

      // Assert
      expect(repository.getById(1)!.active).toBe(false);
    });

    it('reactivates a rule that was inactive', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, false));

      // Act
      service.updateRulesStatus([1], true);

      // Assert
      expect(repository.getById(1)!.active).toBe(true);
    });

    it('updates rules of different types in a single batch', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP, true),
        stubRule(2, 'example.com', RuleType.DOMAIN, true),
        stubRule(3, 8080, RuleType.PORT, true),
      );

      // Act
      const updated = service.updateRulesStatus([1, 2, 3], false);

      // Assert
      expect(updated.map((rule) => rule.type)).toEqual([
        RuleType.IP,
        RuleType.DOMAIN,
        RuleType.PORT,
      ]);
      expect(repository.getAll().every((rule) => rule.active === false)).toBe(true);
    });

    it('leaves rules outside the requested batch alone', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP, true),
        stubRule(2, '2.2.2.2', RuleType.IP, true),
      );

      // Act
      service.updateRulesStatus([1], false);

      // Assert
      expect(repository.getById(2)!.active).toBe(true);
    });

    it('throws a rule not found error when an id does not exist', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, true));

      // Act
      const error = captureError(() => service.updateRulesStatus([1, 9999], false));

      // Assert
      expect(error).toBeInstanceOf(RuleNotFoundError);
      expect((error as RuleNotFoundError).ids).toEqual([9999]);
    });

    it('mutates nothing when any id in the batch is missing', () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP, true),
        stubRule(2, '2.2.2.2', RuleType.IP, true),
      );

      // Act
      captureError(() => service.updateRulesStatus([1, 2, 9999], false));

      // Assert
      expect(repository.getAll().every((rule) => rule.active === true)).toBe(true);
    });
  });
});
