import { db } from './client';
import { companyProfiles, financialMetrics, documents } from './schema';
import { eq, and } from 'drizzle-orm';

export type InsertCompanyProfile = typeof companyProfiles.$inferInsert;
export type InsertFinancialMetric = typeof financialMetrics.$inferInsert;
export type InsertDocument = typeof documents.$inferInsert;

export async function upsertDocument(doc: InsertDocument) {
  const existing = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.sha256, doc.sha256))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const [row] = await db.insert(documents).values(doc).returning({ id: documents.id });
  return row.id;
}

export async function upsertCompanyProfile(profile: InsertCompanyProfile) {
  const existing = await db
    .select({ id: companyProfiles.id })
    .from(companyProfiles)
    .where(and(eq(companyProfiles.documentId, profile.documentId), eq(companyProfiles.name, profile.name)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(companyProfiles).set(profile).where(eq(companyProfiles.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db.insert(companyProfiles).values(profile).returning({ id: companyProfiles.id });
  return row.id;
}

export async function upsertFinancialMetric(metric: InsertFinancialMetric) {
  const existing = await db
    .select({ id: financialMetrics.id })
    .from(financialMetrics)
    .where(
      and(
        eq(financialMetrics.companyProfileId, metric.companyProfileId),
        eq(financialMetrics.metricName, metric.metricName),
        eq(financialMetrics.columnLabel, metric.columnLabel),
        eq(financialMetrics.valueKind, metric.valueKind ?? 'actual')
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db.update(financialMetrics).set(metric).where(eq(financialMetrics.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db.insert(financialMetrics).values(metric).returning({ id: financialMetrics.id });
  return row.id;
}


