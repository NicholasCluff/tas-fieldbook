#!/usr/bin/env node

/**
 * Local debug version of the PDF processing logic (Simple JS version)
 * This allows us to test and analyze the processing before deploying to edge function
 */

import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock console.log to capture debug output
const debugLogs = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  debugLogs.push(message);
  originalConsoleLog(...args);
};

/**
 * Extract survey plans from PDF using intelligent pattern matching
 */
async function extractPlansFromPDF(pdfDoc, filename) {
  const plans = [];
  const pageCount = pdfDoc.getPageCount();
  
  console.log(`\n=== ANALYZING DOCUMENT ===`);
  console.log(`Filename: ${filename}`);
  console.log(`Total pages: ${pageCount}`);
  
  // Try to extract plan information from filename first
  const filenamePatterns = extractPlanReferencesFromFilename(filename);
  
  if (filenamePatterns.length > 0) {
    console.log(`✅ Found plan references in filename:`, filenamePatterns);
    
    // If we found specific plan references, try to intelligently split
    return createPlansFromReferences(filenamePatterns, pageCount);
  }
  
  // Fallback: Analyze document structure for common patterns
  console.log(`❌ No plan references found in filename`);
  return analyzeDocumentStructure(pageCount, filename);
}

/**
 * Extract plan references from filename using Tasmanian survey patterns
 */
function extractPlanReferencesFromFilename(filename) {
  console.log(`\n=== FILENAME PATTERN MATCHING ===`);
  console.log(`Testing patterns against: "${filename}"`);
  
  const patterns = [
    { name: 'Multiple plans (comma/&/+ separated)', regex: /(\\d{6}-\\d+(?:\\s*[,&+]\\s*\\d{6}-\\d+)*)/gi },
    { name: 'Tasmania format (6-digit-number)', regex: /\\b(\\d{6}-\\d+)\\b/g },
    { name: 'Alpha-numeric (letter + 6 digits)', regex: /\\b([A-Z]\\d{6})\\b/g },
    { name: 'Deposited Plan', regex: /\\bDP\\s*(\\d+)\\b/gi },
    { name: 'Plan of Survey', regex: /\\bPS\\s*(\\d+)\\b/gi },
    { name: 'Crown Plan', regex: /\\bCP\\s*(\\d+)\\b/gi },
    { name: 'Plan of Title', regex: /\\bPT\\s*(\\d+)\\b/gi },
    { name: 'Land Titles Office', regex: /\\bLTO\\s*(\\d+)\\b/gi },
  ];
  
  const references = new Set();
  
  for (const { name, regex } of patterns) {
    let match;
    const matches = [];
    
    // Reset regex lastIndex to avoid issues with global flag
    regex.lastIndex = 0;
    
    while ((match = regex.exec(filename)) !== null) {
      const ref = match[1] || match[0];
      matches.push(ref);
      
      // If it contains multiple references, split them
      if (ref.includes(',') || ref.includes('&') || ref.includes('+')) {
        console.log(`  ${name}: Found multiple refs in "${ref}"`);
        const multiRefs = ref.split(/[,&+]/).map(r => r.trim()).filter(r => r);
        multiRefs.forEach(r => {
          console.log(`    -> "${r}"`);
          references.add(r);
        });
      } else {
        console.log(`  ${name}: Found "${ref}"`);
        references.add(ref);
      }
    }
    
    if (matches.length === 0) {
      console.log(`  ${name}: No matches`);
    }
  }
  
  const result = Array.from(references);
  console.log(`\nFinal extracted references: [${result.map(r => `"${r}"`).join(', ')}]`);
  return result;
}

/**
 * Create plan objects from extracted references
 */
function createPlansFromReferences(references, totalPages) {
  console.log(`\n=== CREATING PLANS FROM REFERENCES ===`);
  console.log(`References: [${references.map(r => `"${r}"`).join(', ')}]`);
  console.log(`Total pages: ${totalPages}`);
  
  const plans = [];
  
  if (references.length === 1) {
    console.log(`Single plan detected - using all ${totalPages} pages`);
    plans.push({
      referenceNumber: references[0],
      title: `Survey Plan ${references[0]}`,
      startPage: 1,
      endPage: totalPages,
      pageCount: totalPages
    });
  } else {
    console.log(`Multiple plans detected (${references.length}) - distributing pages evenly`);
    const pagesPerPlan = Math.ceil(totalPages / references.length);
    console.log(`Pages per plan (estimated): ${pagesPerPlan}`);
    
    let currentPage = 1;
    
    references.forEach((ref, index) => {
      const isLast = index === references.length - 1;
      const endPage = isLast ? totalPages : Math.min(currentPage + pagesPerPlan - 1, totalPages);
      
      const plan = {
        referenceNumber: ref,
        title: `Survey Plan ${ref}`,
        startPage: currentPage,
        endPage: endPage,
        pageCount: endPage - currentPage + 1
      };
      
      console.log(`  Plan ${index + 1}: "${ref}" -> pages ${currentPage}-${endPage} (${plan.pageCount} pages)`);
      plans.push(plan);
      
      currentPage = endPage + 1;
    });
  }
  
  return plans;
}

/**
 * Analyze document structure when no clear references are found
 */
function analyzeDocumentStructure(totalPages, filename) {
  console.log(`\n=== DOCUMENT STRUCTURE ANALYSIS ===`);
  console.log(`No plan references found in filename, analyzing document structure`);
  console.log(`Total pages: ${totalPages}`);
  
  let numPlans;
  let pagesPerPlan;
  let reasoning;
  
  if (totalPages <= 5) {
    numPlans = 1;
    pagesPerPlan = totalPages;
    reasoning = 'Small document (≤5 pages) - likely single plan';
  } else if (totalPages <= 20) {
    pagesPerPlan = 8;
    numPlans = Math.ceil(totalPages / pagesPerPlan);
    reasoning = 'Medium document (≤20 pages) - ~8 pages per plan';
  } else if (totalPages <= 50) {
    pagesPerPlan = 10;
    numPlans = Math.ceil(totalPages / pagesPerPlan);
    reasoning = 'Larger document (≤50 pages) - ~10 pages per plan';
  } else {
    pagesPerPlan = 12;
    numPlans = Math.ceil(totalPages / pagesPerPlan);
    reasoning = 'Very large document (>50 pages) - ~12 pages per plan';
  }
  
  console.log(`Reasoning: ${reasoning}`);
  console.log(`Calculated plans: ${numPlans}`);
  console.log(`Target pages per plan: ${pagesPerPlan}`);
  
  if (numPlans === 1) {
    const plan = {
      referenceNumber: generatePlanReference(filename, 1),
      title: 'Survey Plan',
      startPage: 1,
      endPage: totalPages,
      pageCount: totalPages
    };
    console.log(`  Single plan: "${plan.referenceNumber}" -> pages 1-${totalPages}`);
    return [plan];
  }
  
  return createEvenlyDistributedPlans(numPlans, totalPages, filename);
}

/**
 * Create evenly distributed plans when we can't determine exact boundaries
 */
function createEvenlyDistributedPlans(numPlans, totalPages, filename) {
  console.log(`\n=== CREATING EVENLY DISTRIBUTED PLANS ===`);
  console.log(`Number of plans: ${numPlans}`);
  console.log(`Total pages: ${totalPages}`);
  
  const plans = [];
  const pagesPerPlan = Math.ceil(totalPages / numPlans);
  console.log(`Actual pages per plan: ${pagesPerPlan}`);
  
  let currentPage = 1;
  
  for (let i = 1; i <= numPlans; i++) {
    const isLast = i === numPlans;
    const endPage = isLast ? totalPages : Math.min(currentPage + pagesPerPlan - 1, totalPages);
    
    const plan = {
      referenceNumber: generatePlanReference(filename, i),
      title: `Survey Plan ${i}`,
      startPage: currentPage,
      endPage: endPage,
      pageCount: endPage - currentPage + 1
    };
    
    console.log(`  Plan ${i}: "${plan.referenceNumber}" -> pages ${currentPage}-${endPage} (${plan.pageCount} pages)`);
    plans.push(plan);
    
    currentPage = endPage + 1;
  }
  
  return plans;
}

/**
 * Generate a plan reference when none can be extracted
 */
function generatePlanReference(filename, index) {
  const cleanName = filename
    .replace(/\\.(pdf|PDF)$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 10)
    .toUpperCase();
  
  const ref = `${cleanName}_${String(index).padStart(3, '0')}`;
  console.log(`Generated reference: "${ref}" from filename "${filename}"`);
  return ref;
}

/**
 * Main debug function
 */
async function debugProcessPDF(pdfFilePath) {
  try {
    console.log('='.repeat(80));
    console.log('PDF PROCESSING DEBUG TOOL');
    console.log('='.repeat(80));
    
    // Read PDF file
    console.log(`Loading PDF: ${pdfFilePath}`);
    const pdfBuffer = readFileSync(pdfFilePath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    const filename = pdfFilePath.split('/').pop() || 'unknown.pdf';
    
    // Extract plans
    const extractedPlans = await extractPlansFromPDF(pdfDoc, filename);
    
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Total plans extracted: ${extractedPlans.length}`);
    
    extractedPlans.forEach((plan, index) => {
      console.log(`\nPlan ${index + 1}:`);
      console.log(`  Reference: ${plan.referenceNumber}`);
      console.log(`  Title: ${plan.title}`);
      console.log(`  Pages: ${plan.startPage}-${plan.endPage} (${plan.pageCount} pages)`);
    });
    
    // Save debug output to file
    const debugOutput = {
      filename,
      totalPages: pdfDoc.getPageCount(),
      extractedPlans,
      debugLogs
    };
    
    const debugFilePath = join(__dirname, 'debug-output.json');
    writeFileSync(debugFilePath, JSON.stringify(debugOutput, null, 2));
    console.log(`\n=== DEBUG OUTPUT ===`);
    console.log(`Debug information saved to: ${debugFilePath}`);
    
    return extractedPlans;
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

// CLI interface
if (process.argv.length < 3) {
  console.log('Usage: node debug-pdf-processor-simple.js <path-to-pdf-file>');
  console.log('');
  console.log('Example:');
  console.log('  node debug-pdf-processor-simple.js ./test-documents/survey-432367-1.pdf');
  console.log('');
  console.log('This will analyze the PDF and show detailed debug information about how');
  console.log('the processing algorithm splits the document into survey plans.');
  console.log('');
  console.log('First install pdf-lib:');
  console.log('  npm install pdf-lib');
  process.exit(1);
}

const pdfPath = process.argv[2];
debugProcessPDF(pdfPath).catch(console.error);