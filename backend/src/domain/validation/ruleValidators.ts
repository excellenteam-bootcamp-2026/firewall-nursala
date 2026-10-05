export function isValidIp(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const parts = value.split('.');

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (part === '' || !/^\d+$/.test(part)) {
      return false;
    }

    if (part.length > 1 && part.startsWith('0')) {
      return false;
    }

    const number = Number(part);
    return number >= 0 && number <= 255;
  });
}

export function isValidDomain(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const domainPattern =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

  return domainPattern.test(value);
}

export function isValidPort(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65535
  );
}
