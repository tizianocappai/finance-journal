import { describe, expect, it } from 'vitest';
import { getAgChartsTheme } from './ag-theme';

describe('getAgChartsTheme', () => {
  it('restituisce ag-default-dark in dark mode', () => {
    expect(getAgChartsTheme(true)).toBe('ag-default-dark');
  });

  it('restituisce ag-default in light mode', () => {
    expect(getAgChartsTheme(false)).toBe('ag-default');
  });
});
