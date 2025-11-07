import { pgEnum, pgTable, text, uuid, integer, timestamp, numeric, index } from 'drizzle-orm/pg-core';

export const periodKind = pgEnum('period_kind', ['YTD', 'FY']);

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: text('filename').notNull(),
  sha256: text('sha256').notNull(),
  pageCount: integer('page_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companyProfiles = pgTable(
  'company_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    geography: text('geography'),
    fundRole: text('fund_role'),
    firstInvestmentDate: timestamp('first_investment_date', { mode: 'date' }),
    investmentType: text('investment_type'),
    sourcePage: integer('source_page'),
    sourceQuote: text('source_quote'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ nameIdx: index('company_profiles_name_idx').on(t.name) })
);

export const financialMetrics = pgTable('financial_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyProfileId: uuid('company_profile_id')
    .references(() => companyProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  currency: text('currency'),
  unit: text('unit'),
  sourceLabel: text('source_label').notNull(),
  metricName: text('metric_name').notNull(),
  columnLabel: text('column_label').notNull(),
  fiscalYear: integer('fiscal_year'),
  periodKind: periodKind('period_kind'),
  periodLabel: text('period_label'),
  value: numeric('value'),
  valueKind: text('value_kind').default('actual'),
  sourcePage: integer('source_page'),
  sourceQuote: text('source_quote'),
});


