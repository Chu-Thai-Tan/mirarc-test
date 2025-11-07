CREATE TYPE "public"."period_kind" AS ENUM('YTD', 'FY');--> statement-breakpoint
CREATE TABLE "company_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"geography" text,
	"fund_role" text,
	"first_investment_date" timestamp,
	"investment_type" text,
	"source_page" integer,
	"source_quote" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"sha256" text NOT NULL,
	"page_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_profile_id" uuid NOT NULL,
	"currency" text,
	"unit" text,
	"source_label" text NOT NULL,
	"metric_name" text NOT NULL,
	"column_label" text NOT NULL,
	"fiscal_year" integer,
	"period_kind" "period_kind",
	"period_label" text,
	"value" numeric,
	"value_kind" text DEFAULT 'actual',
	"source_page" integer,
	"source_quote" text
);
--> statement-breakpoint
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_metrics" ADD CONSTRAINT "financial_metrics_company_profile_id_company_profiles_id_fk" FOREIGN KEY ("company_profile_id") REFERENCES "public"."company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_profiles_name_idx" ON "company_profiles" USING btree ("name");