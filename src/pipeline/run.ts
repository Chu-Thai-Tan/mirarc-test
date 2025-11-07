import { readPdfPerPage } from "../pdf/readPdf";
import { extractCompanyProfile } from "../extract/extractCompany";
import { extractFinancialHighlights } from "../extract/extractFinancials";
import {
  upsertCompanyProfile,
  upsertDocument,
  upsertFinancialMetric,
} from "../db/repositories";

function findFinancialHighlightsText(pages: string[]): {
  text: string;
  startPage?: number;
} {
  for (let i = 0; i < pages.length; i++) {
    if (/financial\s+highlights/i.test(pages[i])) {
      const text = [pages[i], pages[i + 1], pages[i + 2]]
        .filter(Boolean)
        .join("\n\n");
      return { text, startPage: i + 1 };
    }
  }
  const start = Math.max(0, pages.length - 2);
  return { text: pages.slice(start).join("\n\n"), startPage: start + 1 };
}

export async function runExtraction(pdfPath: string) {
  const pdf = await readPdfPerPage(pdfPath);
  const documentId = await upsertDocument({
    filename: pdfPath.split(/[\/]/).pop() || pdfPath,
    sha256: pdf.sha256,
    pageCount: pdf.pageCount,
  });

  const companyText = pdf.pages.slice(0, 2).join("\n\n");
  const company = await extractCompanyProfile({
    text: companyText,
    pageHint: 1,
  });
  const companyProfileId = await upsertCompanyProfile({
    documentId,
    name: company.name,
    description: company.description,
    geography: company.geography,
    fundRole: company.fundRole,
    firstInvestmentDate: company.firstInvestmentDate
      ? (company.firstInvestmentDate as unknown as Date)
      : undefined,
    investmentType: company.investmentType,
    sourcePage: company.source?.page,
    sourceQuote: company.source?.quote,
  });

  const { text: finText, startPage } = findFinancialHighlightsText(pdf.pages);
  const finRecords = await extractFinancialHighlights({ text: finText });
  let inserted = 0;
  for (const r of finRecords) {
    if (r.value == null) continue;
    await upsertFinancialMetric({
      companyProfileId,
      currency: r.currency,
      unit: r.unit,
      sourceLabel: r.sourceLabel,
      metricName: r.metricName,
      columnLabel: r.columnLabel,
      fiscalYear: r.fiscalYear,
      periodKind: r.periodKind,
      periodLabel: r.periodLabel,
      value: r.value.toString(),
      valueKind:
        r.valueKind ??
        (r.columnLabel.toLowerCase().includes("variance")
          ? "variance_pct"
          : "actual"),
      sourcePage: r.source?.page ?? startPage,
      sourceQuote: r.source?.quote,
    });
    inserted++;
  }

  return { documentId, companyProfileId, metricsInserted: inserted };
}
