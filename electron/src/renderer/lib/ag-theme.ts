import { themeQuartz } from 'ag-grid-community';
import type { AgChartThemeName } from 'ag-charts-types';

const DARK_PARAMS = {
  backgroundColor: '#1e293b',
  foregroundColor: '#f1f5f9',
  borderColor: '#334155',
  headerBackgroundColor: '#0f172a',
  headerTextColor: '#94a3b8',
  oddRowBackgroundColor: '#1e293b',
  rowHoverColor: '#334155',
} as const;

export function getAgGridTheme(isDark: boolean) {
  return isDark ? themeQuartz.withParams(DARK_PARAMS) : themeQuartz.withParams({});
}

export function getAgChartsTheme(isDark: boolean): AgChartThemeName {
  return isDark ? 'ag-default-dark' : 'ag-default';
}
