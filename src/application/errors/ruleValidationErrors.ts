import { RuleType } from '../../domain/models/RuleType';

/**
 * The single definition of how a rejected value of each rule type is reported.
 *
 * Both boundaries reuse it so the two validation tiers cannot drift apart: the
 * HTTP adapter raises these when a value has the wrong JavaScript type, and
 * FirewallService raises the same ones when a correctly typed value turns out
 * to be semantically invalid. A client sees one code per rule type either way.
 */
export const RULE_VALIDATION_ERRORS: Record<
  RuleType,
  { code: string; message: string }
> = {
  [RuleType.IP]: {
    code: 'INVALID_IP',
    message: 'IPs must be valid IPv4 addresses.',
  },
  [RuleType.DOMAIN]: {
    code: 'INVALID_DOMAIN',
    message: 'Domains must be valid domain names.',
  },
  [RuleType.PORT]: {
    code: 'INVALID_PORT',
    message: 'Ports must be integers between 1 and 65535.',
  },
};
