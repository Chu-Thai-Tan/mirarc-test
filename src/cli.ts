#!/usr/bin/env node
import "dotenv/config";
import { runExtraction } from "./pipeline/run";

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd !== "extract") {
    console.log("Usage: npm run extract -- <file.pdf>");
    process.exit(1);
  }
  const file = rest[0];
  if (!file) {
    console.error("Please provide a PDF file path");
    process.exit(1);
  }
  try {
    const result = await runExtraction(file);
    console.log("Extraction complete:", result);
  } catch (err) {
    console.error("Extraction failed:", err);
    process.exit(1);
  }
}

main();
