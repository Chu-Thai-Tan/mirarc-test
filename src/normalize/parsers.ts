export function toSnakeCase(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

export function parsePercent(value: string): number | null {
  const match = value.match(/-?\(?\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\)?/);
  if (!match) return null;
  const num = Number(match[1]);
  if (/\(/.test(value)) return -num;
  return num;
}

export function parseNumeric(value: string): number | null {
  const match = value.match(/-?\(?\s*([0-9]+(?:\.[0-9]+)?)\s*\)?/);
  if (!match) return null;
  const num = Number(match[1]);
  if (/\(/.test(value)) return -num;
  return num;
}

export type HeaderInfo = {
  currency?: string; 
  unit?: string; 
};

export function parseHeaderLine(line: string): HeaderInfo {
  const info: HeaderInfo = {};
  const m = line.match(/in\s+([A-Z]{3})\s+(\w+)/i);
  if (m) {
    info.currency = m[1].toUpperCase();
    info.unit = m[2].toLowerCase();
  }
  return info;
}

export function extractYearsFromColumnLabel(label: string): { year?: number; kind?: 'YTD' | 'FY'; periodLabel?: string } {
  const ytd = label.match(/Dec-?([0-9]{2})\s*YTD/i);
  if (ytd) {
    const yy = Number(ytd[1]);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy; // naive century
    return { year, kind: 'YTD', periodLabel: `Dec-${yy}` };
  }
  const fy = label.match(/FY\s*([0-9]{4})/i) || label.match(/FY([0-9]{4})/i);
  if (fy) {
    const year = Number(fy[1]);
    return { year, kind: 'FY', periodLabel: `FY${year}` };
  }
  return {};
}


