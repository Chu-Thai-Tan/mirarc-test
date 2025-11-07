import { z } from 'zod';
import { FinancialHighlightsSchema, type FinancialRecord } from './schemas';
import { FINANCIAL_SYSTEM_PROMPT, FINANCIAL_USER_PROMPT } from './prompts';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { extractYearsFromColumnLabel, parseNumeric, parsePercent, toSnakeCase, parseHeaderLine } from '../normalize/parsers';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractFinancialHighlights(input: {
  text: string;
}): Promise<FinancialRecord[]> {
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const { object } = await generateObject({
    model: openai(modelName),
    schema: FinancialHighlightsSchema as unknown as z.ZodTypeAny,
    system: FINANCIAL_SYSTEM_PROMPT,
    prompt: `${FINANCIAL_USER_PROMPT}\n\nTEXT:\n${input.text}`,
  });
  const parsed = object as unknown as { records?: FinancialRecord[] };
  const headerInfo = parseHeaderLine(input.text.split('\n')[0] || '');
  const records: FinancialRecord[] = (parsed.records || []).map((r: FinancialRecord) => {
    const normalized: FinancialRecord = { ...r } as FinancialRecord;
    normalized.metricName = r.metricName ? toSnakeCase(r.metricName) : toSnakeCase(r.sourceLabel);

    if (typeof r.value === 'number') {
    } else if (r.value == null) {
      const q = r.source?.quote || '';
      const asPct = parsePercent(q);
      const asNum = parseNumeric(q);
      if (asPct != null) {
        normalized.value = asPct;
        normalized.unit = 'pct';
        normalized.valueKind = r.valueKind ?? (r.columnLabel.toLowerCase().includes('variance') ? 'variance_pct' : 'actual');
      } else if (asNum != null) {
        normalized.value = asNum;
      } else {
        normalized.value = null;
      }
    }

    const { year, kind, periodLabel } = extractYearsFromColumnLabel(r.columnLabel);
    if (year && !r.fiscalYear) normalized.fiscalYear = year;
    if (kind && !r.periodKind) normalized.periodKind = kind;
    if (periodLabel && !r.periodLabel) normalized.periodLabel = periodLabel;

    if (!normalized.currency && headerInfo.currency) normalized.currency = headerInfo.currency;
    if (!normalized.unit && headerInfo.unit) normalized.unit = headerInfo.unit;

    if (r.columnLabel.toLowerCase().includes('variance')) {
      normalized.valueKind = 'variance_pct';
      if (!normalized.unit) normalized.unit = 'pct';
    }

    return normalized;
  });

  return records;
}


