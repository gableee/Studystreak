export const extractApiErrorDetail = (payload: unknown): string | null => {
  if (payload === null || payload === undefined) {
    return null;
  }

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed !== '' ? trimmed : null;
  }

  if (typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const directKeys = ['message', 'detail', 'hint'];
  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        return trimmed;
      }
    }
  }

  const detailsValue = record['details'];
  if (typeof detailsValue === 'string') {
    const trimmed = detailsValue.trim();
    return trimmed !== '' ? trimmed : null;
  }

  if (detailsValue && typeof detailsValue === 'object') {
    const detailsRecord = detailsValue as Record<string, unknown>;
    const nestedKeys = ['message', 'error', 'detail', 'hint'];
    for (const key of nestedKeys) {
      const value = detailsRecord[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') {
          return trimmed;
        }
      }
    }

    const entries = Object.entries(detailsRecord)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`);

    if (entries.length > 0) {
      return entries.join(', ');
    }
  }

  return null;
};
