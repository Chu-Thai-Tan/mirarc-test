## Database schema design (Drizzle + PostgreSQL)

This module stores exactly two kinds of data extracted from text‑based PDFs (assume that given pdfs are text based):

- Company profile (one row per document)
- Financial highlights (one row per table cell, so we keep all periods/metrics)

We also keep a tiny `documents` table for lineage and idempotency.

### Why it’s modeled this way

- Financial highlights are matrix‑shaped in the PDF. Storing them as tall, atomic rows keeps the schema future‑proof and makes analytics (pivot, aggregation) straightforward.
- Variance values live alongside actuals as separate rows with `value_kind = 'variance_pct'` so you can filter or compare easily.
- Provenance is inline (`source_page`, `source_quote`) so you can always show users where a value came from without extra joins.

---

## Tables

### documents
One record per processed PDF. Used to de‑dupe by hash and for basic lineage.

Columns (PostgreSQL types):
- id UUID PK
- filename TEXT
- sha256 TEXT (file hash)
- page_count INT
- created_at TIMESTAMPTZ default now()

Reference implementation:

```1:11:/Users/tanchu/Documents/programming/test/mirarc-test/src/db/schema.ts
import { pgEnum, pgTable, text, uuid, integer, timestamp, numeric, index } from 'drizzle-orm/pg-core';

export const periodKind = pgEnum('period_kind', ['YTD', 'FY']);

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: text('filename').notNull(),
  sha256: text('sha256').notNull(),
  pageCount: integer('page_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### company_profiles
One row per document capturing the company info required by the exam.

Columns:
- id UUID PK
- document_id UUID FK → documents(id)
- name TEXT NOT NULL
- description TEXT
- geography TEXT
- fund_role TEXT
- first_investment_date DATE
- investment_type TEXT
- source_page INT (where we read the company info)
- source_quote TEXT (short snippet for audit)
- created_at TIMESTAMPTZ default now()

Reference implementation:

```13:32:/Users/tanchu/Documents/programming/test/mirarc-test/src/db/schema.ts
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
```

Notes
- We soft‑enforce uniqueness in code with upsert on `(document_id, name)` so re‑runs don’t duplicate.
- The name index helps quick lookups and de‑dupe checks.

### financial_metrics
Every visible cell in the Financial highlights tables becomes one row here. This preserves columns like “Dec‑24 YTD Actual”, “FY2021 Actual”, and “Variance to Prior Year (%)”.

Columns:
- id UUID PK
- company_profile_id UUID FK → company_profiles(id)
- currency TEXT (parsed from header like “In KRW bn”)
- unit TEXT (e.g., `bn`, `pct`)
- source_label TEXT NOT NULL (the row label as shown, e.g., `EBITDA margin (%)`)
- metric_name TEXT NOT NULL (normalized snake_case, e.g., `ebitda_margin_pct`)
- column_label TEXT NOT NULL (original column header)
- fiscal_year INT (derived when present; e.g., 2024, 2023, 2021)
- period_kind period_kind ENUM (`YTD` | `FY`)
- period_label TEXT (e.g., `Dec-24`, `FY2021`)
- value NUMERIC NULL (nullable, some cells can be empty)
- value_kind TEXT default 'actual' (either `actual` or `variance_pct`)
- source_page INT
- source_quote TEXT

Reference implementation:

```34:56:/Users/tanchu/Documents/programming/test/mirarc-test/src/db/schema.ts
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
```

How variance works
- YTD table adds a third column “Variance to Prior Year (%)”. Those rows are saved with `value_kind = 'variance_pct'` and `unit = 'pct'`.
- Example mapping for “Revenue | 792.7 | 745.3 | 6.4%” (Dec‑24 YTD section):
  - (metric_name=`revenue`, column_label=`Dec-24 YTD Actual`, value=792.7, period_kind=`YTD`, fiscal_year=2024, period_label=`Dec-24`)
  - (metric_name=`revenue`, column_label=`Dec-23 YTD Actual`, value=745.3, period_kind=`YTD`, fiscal_year=2023, period_label=`Dec-23`)
  - (metric_name=`revenue`, column_label=`Variance to Prior Year (%)`, value=6.4, value_kind=`variance_pct`, unit=`pct`, period_kind=`YTD`, fiscal_year=2024, period_label=`Dec-24`)

Idempotency key (enforced in code)
- `(company_profile_id, metric_name, column_label, value_kind)`
  - This keeps re‑runs from creating duplicates while preserving the original column headers.

---

## Migrations & setup

- Drizzle config: `drizzle.config.ts` (dialect `postgresql`)
- Generate SQL from schema:
  - `npm run drizzle:generate`
- Apply migrations:
  - `npm run drizzle:migrate` (requires `DATABASE_URL`)

---

## Handy queries

All FY metrics for a company:

```sql
SELECT metric_name, fiscal_year, value
FROM financial_metrics
WHERE company_profile_id = $1 AND period_kind = 'FY'
ORDER BY metric_name, fiscal_year;
```

YTD actuals vs variance for Dec‑24:

```sql
SELECT metric_name,
  MAX(CASE WHEN column_label = 'Dec-24 YTD Actual' THEN value END) AS ytd_2024,
  MAX(CASE WHEN column_label = 'Variance to Prior Year (%)' THEN value END) AS variance_pct
FROM financial_metrics
WHERE company_profile_id = $1 AND period_kind = 'YTD' AND period_label = 'Dec-24'
GROUP BY metric_name
ORDER BY metric_name;
```

Latest revenue (preferring YTD 2024 then FY 2023):

```sql
SELECT value, unit, currency
FROM financial_metrics
WHERE company_profile_id = $1 AND metric_name = 'revenue'
ORDER BY (period_kind = 'YTD') DESC, fiscal_year DESC
LIMIT 1;
```

---

## Notes & assumptions

- PDFs are text‑based; no OCR in scope.
- We derive `currency` and `unit` from header lines like “In KRW bn”. Percents are stored as numeric `value` with `unit='pct'`.
- `value` is nullable by design to allow empty cells.
- Time periods are derived from labels (e.g., “Dec‑24 YTD Actual”, “FY2023 Actual”).


