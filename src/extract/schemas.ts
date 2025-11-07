import { z } from 'zod';

export const CompanyProfileSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  geography: z.string().optional(),
  fundRole: z.string().optional(),
  firstInvestmentDate: z.string().optional(), // ISO date string preferred
  investmentType: z.string().optional(),
  source: z
    .object({
      page: z.number().int().optional(),
      quote: z.string().optional(),
    })
    .optional(),
});

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const FinancialRecordSchema = z.object({
  sourceLabel: z.string(),
  metricName: z.string(),
  columnLabel: z.string(),
  value: z.number().nullable(),
  unit: z.string().optional(),
  currency: z.string().optional(),
  fiscalYear: z.number().optional(),
  periodKind: z.enum(['YTD', 'FY']).optional(),
  periodLabel: z.string().optional(),
  valueKind: z.enum(['actual', 'variance_pct']).optional(),
  source: z
    .object({
      page: z.number().int().optional(),
      quote: z.string().optional(),
    })
    .optional(),
});

export const FinancialHighlightsSchema = z.object({
  records: z.array(FinancialRecordSchema),
});

export type FinancialRecord = z.infer<typeof FinancialRecordSchema>;
export type FinancialHighlights = z.infer<typeof FinancialHighlightsSchema>;


