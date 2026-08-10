import { RuleNotFoundError } from '../../../src/application/errors/RuleNotFoundError';
import { RuleValidationError } from '../../../src/application/errors/RuleValidationError';
import { RuleType } from '../../../src/domain/models/RuleType';
import { createTestService, stubRule } from '../../fixtures/firewallMocks';

/** Runs an asynchronous action expected to reject and hands back its reason for inspection. */
async function captureError(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the action to throw, but it returned normally.');
}

describe('FirewallService', () => {
  describe('async repository contract', () => {
    it('returns Promises from every repository-backed public method', async () => {
      const { service } = createTestService();

      const results = [
        service.addRule([], RuleType.IP, true, 'blacklist'),
        service.removeRules([]),
        service.getAllRules(),
        service.updateRulesStatus([], true),
      ];

      expect(results.every((result) => result instanceof Promise)).toBe(true);
      await Promise.all(results);
    });

    it('waits for a delayed repository result before filtering it', async () => {
      const { service, repository } = createTestService();
      let resolveRepository!: (rules: ReturnType<typeof stubRule>[]) => void;
      const delayedRules = new Promise<ReturnType<typeof stubRule>[]>((resolve) => {
        resolveRepository = resolve;
      });
      jest.spyOn(repository, 'getAll').mockReturnValue(delayedRules as never);

      const resultPromise = service.getAllRules(RuleType.IP) as unknown as Promise<
        ReturnType<typeof stubRule>[]
      >;
      let settled = false;
      void resultPromise.then(() => {
        settled = true;
      });
      await Promise.resolve();

      expect(settled).toBe(false);

      const ipRule = stubRule(1, '1.1.1.1', RuleType.IP);
      resolveRepository([ipRule, stubRule(2, 8080, RuleType.PORT)]);

      await expect(resultPromise).resolves.toEqual([ipRule]);
    });

    it('propagates a rejected repository creation Promise', async () => {
      const { service, repository } = createTestService();
      const repositoryError = new Error('repository failed');
      jest.spyOn(repository, 'create').mockRejectedValue(repositoryError);

      const result = service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

      await expect(result).rejects.toBe(repositoryError);
    });
  });

  describe('addRule()', () => {
    it('returns a single correctly shaped rule for a single valid value', async () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const added = await service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

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

    it('assigns sequential ids across a batch of values', async () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const added = await service.addRule(
        ['1.1.1.1', '2.2.2.2', '3.3.3.3'],
        RuleType.IP,
        true,
        'blacklist',
      );

      // Assert
      expect(added.map((rule) => rule.id)).toEqual([1, 2, 3]);
    });

    it('persists every rule of a valid batch to the repository', async () => {
      // Arrange
      const { service, repository } = createTestService();

      // Act
      await service.addRule(['1.1.1.1', '2.2.2.2'], RuleType.IP, true, 'blacklist');

      // Assert
      expect((await repository.getAll()).map((rule) => rule.value)).toEqual([
        '1.1.1.1',
        '2.2.2.2',
      ]);
    });

    it('honours the requested active flag', async () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const added = await service.addRule(['1.1.1.1'], RuleType.IP, false, 'whitelist');

      // Assert
      expect(added[0]!.active).toBe(false);
      expect(added[0]!.mode).toBe('whitelist');
    });

    it('continues numbering ids across separate calls', async () => {
      // Arrange
      const { service } = createTestService();
      await service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

      // Act
      const added = await service.addRule(
        ['example.com'],
        RuleType.DOMAIN,
        true,
        'blacklist',
      );

      // Assert
      expect(added[0]!.id).toBe(2);
    });

    describe('all-or-nothing validation', () => {
      it('throws a rule validation error when any value in the batch is invalid', async () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        const error = await captureError(() =>
          service.addRule(['1.1.1.1', '999.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect(error).toBeInstanceOf(RuleValidationError);
      });

      it('persists nothing at all when one value in the batch is invalid', async () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        await captureError(() =>
          service.addRule(['1.1.1.1', '999.1.1.1', '2.2.2.2'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect(await repository.getAll()).toEqual([]);
      });

      it('never even reaches the repository when the batch is invalid', async () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        await captureError(() =>
          service.addRule(
            ['1.1.1.1', '999.1.1.1', '2.2.2.2'],
            RuleType.IP,
            true,
            'blacklist',
          ),
        );

        // Assert
        expect(repository.createCalls).toEqual([]);
        expect(factory.validationCalls.map((call) => call.value)).toEqual([
          '1.1.1.1',
          '999.1.1.1',
          '2.2.2.2',
        ]);
      });

      it('rejects the batch even when the invalid value comes first', async () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        await captureError(() =>
          service.addRule(['999.1.1.1', '1.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect(await repository.getAll()).toEqual([]);
      });

      it('leaves rules stored by earlier successful calls untouched', async () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        await service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');
        factory.markInvalid('999.1.1.1');

        // Act
        await captureError(() =>
          service.addRule(['999.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect((await repository.getAll()).map((rule) => rule.value)).toEqual(['1.1.1.1']);
      });

      it('reports the ip specific code when an ip batch fails', async () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid('999.1.1.1');

        // Act
        const error = await captureError(() =>
          service.addRule(['999.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Assert
        expect((error as RuleValidationError).code).toBe('INVALID_IP');
        expect((error as RuleValidationError).message).toBe(
          'IPs must be valid IPv4 addresses.',
        );
      });

      it('reports the domain specific code when a domain batch fails', async () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid('-bad.com');

        // Act
        const error = await captureError(() =>
          service.addRule(['-bad.com'], RuleType.DOMAIN, true, 'blacklist'),
        );

        // Assert
        expect((error as RuleValidationError).code).toBe('INVALID_DOMAIN');
      });

      it('reports the port specific code when a port batch fails', async () => {
        // Arrange
        const { service, factory } = createTestService();
        factory.markInvalid(70000);

        // Act
        const error = await captureError(() =>
          service.addRule([70000], RuleType.PORT, true, 'blacklist'),
        );

        // Assert
        expect((error as RuleValidationError).code).toBe('INVALID_PORT');
      });

      it('does not consume ids when the batch is rejected', async () => {
        // Arrange
        const { service, repository, factory } = createTestService();
        factory.markInvalid('999.1.1.1');
        await captureError(() =>
          service.addRule(['999.1.1.1', '888.1.1.1'], RuleType.IP, true, 'blacklist'),
        );

        // Act
        const added = await service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

        // Assert
        expect(added[0]!.id).toBe(1);
        expect(await repository.getAll()).toHaveLength(1);
      });
    });
  });

  describe('removeRules()', () => {
    it('returns the removed rules in full detail', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP), stubRule(2, 8080, RuleType.PORT));

      // Act
      const removed = await service.removeRules([1]);

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

    it('actually removes the rules from the repository', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, '2.2.2.2', RuleType.IP),
        stubRule(3, 8080, RuleType.PORT),
      );

      // Act
      await service.removeRules([1, 3]);

      // Assert
      expect((await repository.getAll()).map((rule) => rule.id)).toEqual([2]);
    });

    it('removes rules of different types in one batch', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, 'example.com', RuleType.DOMAIN),
        stubRule(3, 8080, RuleType.PORT),
      );

      // Act
      const removed = await service.removeRules([1, 2, 3]);

      // Assert
      expect(removed.map((rule) => rule.type)).toEqual([
        RuleType.IP,
        RuleType.DOMAIN,
        RuleType.PORT,
      ]);
      expect(await repository.getAll()).toEqual([]);
    });

    it('throws a rule not found error when an id does not exist', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const error = await captureError(() => service.removeRules([1, 9999]));

      // Assert
      expect(error).toBeInstanceOf(RuleNotFoundError);
    });

    it('names the missing id on the error', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const error = await captureError(() => service.removeRules([1, 9999]));

      // Assert
      expect((error as RuleNotFoundError).ids).toEqual([9999]);
      expect((error as RuleNotFoundError).message).toBe('Rule ID(s) not found: 9999');
    });

    it('reports every missing id, not only the first', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const error = await captureError(() => service.removeRules([9998, 1, 9999]));

      // Assert
      expect((error as RuleNotFoundError).ids).toEqual([9998, 9999]);
      expect((error as RuleNotFoundError).message).toBe('Rule ID(s) not found: 9998, 9999');
    });

    it('removes nothing when any id in the batch is missing', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP), stubRule(2, '2.2.2.2', RuleType.IP));

      // Act
      await captureError(() => service.removeRules([1, 2, 9999]));

      // Assert
      expect((await repository.getAll()).map((rule) => rule.id)).toEqual([1, 2]);
    });

    it('never even reaches the repository remove when an id is missing', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      await captureError(() => service.removeRules([1, 9999]));

      // Assert
      expect(repository.removeCalls).toEqual([]);
    });

    it('returns an empty array when given no ids', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const removed = await service.removeRules([]);

      // Assert
      expect(removed).toEqual([]);
      expect(await repository.getAll()).toHaveLength(1);
    });

    // Documents current behaviour: a repeated id resolves twice but only deletes
    // once, so the returned array is shorter than the id list that was passed in.
    it('returns a rule only once when the same id is listed twice', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const removed = await service.removeRules([1, 1]);

      // Assert
      expect(removed).toHaveLength(1);
      expect(await repository.getAll()).toEqual([]);
    });
  });

  describe('getAllRules()', () => {
    it('returns every rule when no type filter is given', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, 'example.com', RuleType.DOMAIN),
        stubRule(3, 8080, RuleType.PORT),
      );

      // Act
      const rules = await service.getAllRules();

      // Assert
      expect(rules.map((rule) => rule.id)).toEqual([1, 2, 3]);
    });

    it('returns only the rules matching the requested type', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP),
        stubRule(2, 'example.com', RuleType.DOMAIN),
        stubRule(3, '2.2.2.2', RuleType.IP),
      );

      // Act
      const rules = await service.getAllRules(RuleType.IP);

      // Assert
      expect(rules.map((rule) => rule.id)).toEqual([1, 3]);
    });

    it('returns an empty array when no rule matches the requested type', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP));

      // Act
      const rules = await service.getAllRules(RuleType.PORT);

      // Assert
      expect(rules).toEqual([]);
    });

    it('returns an empty array when the repository is empty', async () => {
      // Arrange
      const { service } = createTestService();

      // Act
      const rules = await service.getAllRules();

      // Assert
      expect(rules).toEqual([]);
    });
  });

  describe('updateRulesStatus()', () => {
    it('returns the updated rules carrying the new active value', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, true));

      // Act
      const updated = await service.updateRulesStatus([1], false);

      // Assert
      expect(updated).toHaveLength(1);
      expect(updated[0]!.active).toBe(false);
    });

    it('makes the change visible through the repository afterwards', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, true));

      // Act
      await service.updateRulesStatus([1], false);

      // Assert
      expect((await repository.getById(1))!.active).toBe(false);
    });

    it('reactivates a rule that was inactive', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, false));

      // Act
      await service.updateRulesStatus([1], true);

      // Assert
      expect((await repository.getById(1))!.active).toBe(true);
    });

    it('updates rules of different types in a single batch', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP, true),
        stubRule(2, 'example.com', RuleType.DOMAIN, true),
        stubRule(3, 8080, RuleType.PORT, true),
      );

      // Act
      const updated = await service.updateRulesStatus([1, 2, 3], false);

      // Assert
      expect(updated.map((rule) => rule.type)).toEqual([
        RuleType.IP,
        RuleType.DOMAIN,
        RuleType.PORT,
      ]);
      expect((await repository.getAll()).every((rule) => rule.active === false)).toBe(true);
    });

    it('leaves rules outside the requested batch alone', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP, true),
        stubRule(2, '2.2.2.2', RuleType.IP, true),
      );

      // Act
      await service.updateRulesStatus([1], false);

      // Assert
      expect((await repository.getById(2))!.active).toBe(true);
    });

    it('throws a rule not found error when an id does not exist', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(stubRule(1, '1.1.1.1', RuleType.IP, true));

      // Act
      const error = await captureError(() => service.updateRulesStatus([1, 9999], false));

      // Assert
      expect(error).toBeInstanceOf(RuleNotFoundError);
      expect((error as RuleNotFoundError).ids).toEqual([9999]);
    });

    it('mutates nothing when any id in the batch is missing', async () => {
      // Arrange
      const { service, repository } = createTestService();
      repository.seed(
        stubRule(1, '1.1.1.1', RuleType.IP, true),
        stubRule(2, '2.2.2.2', RuleType.IP, true),
      );

      // Act
      await captureError(() => service.updateRulesStatus([1, 2, 9999], false));

      // Assert
      expect((await repository.getAll()).every((rule) => rule.active === true)).toBe(true);
    });
  });
});
