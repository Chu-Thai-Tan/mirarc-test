import { z } from 'zod';
import { CompanyProfileSchema, type CompanyProfile } from './schemas';
import { COMPANY_SYSTEM_PROMPT, COMPANY_USER_PROMPT } from './prompts';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CompanyResultSchema = CompanyProfileSchema;

export async function extractCompanyProfile(input: {
  text: string;
  pageHint?: number; // optional page number estimate
}): Promise<CompanyProfile> {
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const { object } = await generateObject({
    model: openai(modelName),
    schema: CompanyResultSchema as unknown as z.ZodTypeAny,
    system: COMPANY_SYSTEM_PROMPT,
    prompt: `${COMPANY_USER_PROMPT}\n\nTEXT:\n${input.text}`,
  });
  return object as CompanyProfile;
}


