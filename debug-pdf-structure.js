#!/usr/bin/env node

/**
 * PDF Structure Analysis (Node.js compatible)
 * Uses pdf-parse to analyze PDF structure and look for plan boundaries
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pdf from 'pdf-parse';

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
 * Analyze PDF structure and content
 */
async function analyzePDFStructure(pdfBuffer) {
  try {
    console.log('\n=== PARSING PDF STRUCTURE ===');
    
    const data = await pdf(pdfBuffer, {
      // Options to get more detailed info
      pagerender: function(pageData) {
        // Extract text from each page
        return pageData.getTextContent().then(function(textContent) {
          return textContent.items.map(item => item.str).join(' ');
        });
      },
      // Extract metadata and info
      max: 0 // Parse all pages
    });
    
    console.log(`✅ PDF parsed successfully`);
    console.log(`Total pages: ${data.numpages}`);
    console.log(`PDF version: ${data.version || 'Unknown'}`);
    console.log(`Producer: ${data.info?.Producer || 'Unknown'}`);
    console.log(`Creator: ${data.info?.Creator || 'Unknown'}`);
    console.log(`Title: ${data.info?.Title || 'None'}`);
    
    // Analyze text content for plan references
    console.log('\n=== ANALYZING TEXT CONTENT FOR PLAN REFERENCES ===');
    const textContent = data.text;
    const plans = analyzeTextForPlans(textContent, data.numpages);
    
    return {
      totalPages: data.numpages,
      metadata: data.info,
      plans: plans,
      hasText: textContent && textContent.length > 0
    };
    
  } catch (error) {
    console.error('Error parsing PDF:', error.message);
    return null;
  }
}

/**
 * Analyze PDF text content to find plan references and boundaries
 */
function analyzeTextForPlans(textContent, totalPages) {
  console.log('Analyzing text content for survey plan patterns...');
  
  if (!textContent || textContent.trim().length === 0) {
    console.log('❌ No text content found in PDF');
    console.log('   This might be a scan/image-based PDF');
    console.log('   Consider using OCR or examining the visual structure');
    return [];
  }
  
  console.log(`✅ Found text content (${textContent.length} characters)`);
  
  // Survey plan patterns to look for in text
  const planPatterns = [
    { name: 'Tasmania format (6-digit-number)', regex: /\b(\d{6}-\d+)\b/gi },
    { name: 'Deposited Plan', regex: /\bDP\s*(\d+)\b/gi },
    { name: 'Plan of Survey', regex: /\bPS\s*(\d+)\b/gi },
    { name: 'Crown Plan', regex: /\bCP\s*(\d+)\b/gi },
    { name: 'Plan of Title', regex: /\bPT\s*(\d+)\b/gi },
    { name: 'LTO Plan', regex: /\bLTO\s*(\d+)\b/gi },
    { name: '6-digit plan number', regex: /\b(\d{6})\b/gi },
  ];
  
  const foundReferences = new Set();
  const detailedMatches = [];
  
  console.log('\n--- Searching for plan references ---');
  
  for (const pattern of planPatterns) {
    // Reset regex
    pattern.regex.lastIndex = 0;
    
    let match;
    const patternMatches = [];
    
    while ((match = pattern.regex.exec(textContent)) !== null) {
      const reference = match[1] || match[0];
      const startPos = match.index;
      const context = textContent.substring(Math.max(0, startPos - 50), startPos + 100);
      
      patternMatches.push({
        reference: reference,
        position: startPos,
        context: context.replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim()
      });
      
      foundReferences.add(reference);
    }
    
    if (patternMatches.length > 0) {
      console.log(`\\n  ${pattern.name}: ${patternMatches.length} matches`);
      patternMatches.forEach((match, idx) => {
        if (idx < 5) { // Show first 5 matches
          console.log(`    "${match.reference}" - Context: ...${match.context}...`);
        }
      });
      if (patternMatches.length > 5) {
        console.log(`    (and ${patternMatches.length - 5} more...)`);
      }
      
      detailedMatches.push({
        pattern: pattern.name,
        matches: patternMatches
      });
    } else {
      console.log(`\\n  ${pattern.name}: No matches`);
    }
  }
  
  const uniqueReferences = Array.from(foundReferences);
  console.log(`\\n=== REFERENCE SUMMARY ===`);
  console.log(`Unique plan references found: ${uniqueReferences.length}`);
  console.log(`References: [${uniqueReferences.slice(0, 10).join(', ')}${uniqueReferences.length > 10 ? '...' : ''}]`);
  
  // Try to create logical plan boundaries
  const plans = createPlansFromReferences(uniqueReferences, totalPages, detailedMatches);
  
  return plans;
}

/**
 * Create plan objects from found references
 */
function createPlansFromReferences(references, totalPages, detailedMatches) {
  console.log(`\\n=== CREATING PLAN BOUNDARIES ===`);
  
  if (references.length === 0) {
    console.log('❌ No plan references found - cannot create plan boundaries');
    return [];
  }
  
  console.log(`Working with ${references.length} unique references`);
  console.log(`Total pages: ${totalPages}`);
  
  // Sort references if they look like numbers
  const sortedReferences = references.sort((a, b) => {
    const numA = parseInt(a.replace(/\\D/g, ''));
    const numB = parseInt(b.replace(/\\D/g, ''));
    return numA - numB;
  });
  
  console.log(`Sorted references: [${sortedReferences.slice(0, 10).join(', ')}${sortedReferences.length > 10 ? '...' : ''}]`);
  
  const plans = [];
  
  if (references.length === 1) {
    // Single plan
    console.log('Single plan detected - using all pages');
    plans.push({
      referenceNumber: references[0],
      title: `Survey Plan ${references[0]}`,
      startPage: 1,
      endPage: totalPages,
      pageCount: totalPages,
      source: 'text_analysis',
      confidence: 'medium'
    });
  } else {
    // Multiple plans - distribute evenly for now
    // In a more sophisticated version, we could try to determine actual boundaries
    console.log(`Multiple plans detected (${references.length}) - distributing pages evenly`);
    
    const pagesPerPlan = Math.ceil(totalPages / references.length);
    let currentPage = 1;
    
    sortedReferences.forEach((ref, index) => {
      const isLast = index === references.length - 1;
      const endPage = isLast ? totalPages : Math.min(currentPage + pagesPerPlan - 1, totalPages);
      
      const plan = {
        referenceNumber: ref,
        title: `Survey Plan ${ref}`,
        startPage: currentPage,
        endPage: endPage,
        pageCount: endPage - currentPage + 1,
        source: 'text_analysis',
        confidence: 'low' // Low confidence because we're just distributing evenly
      };
      
      console.log(`  Plan ${index + 1}: "${ref}" -> pages ${currentPage}-${endPage} (${plan.pageCount} pages)`);
      plans.push(plan);
      
      currentPage = endPage + 1;
    });
  }
  
  return plans;
}

/**
 * Main debug function
 */
async function debugPDFStructure(pdfFilePath) {
  try {
    console.log('='.repeat(80));
    console.log('PDF STRUCTURE ANALYSIS TOOL');
    console.log('='.repeat(80));
    
    console.log(`Loading PDF: ${pdfFilePath}`);
    const pdfBuffer = readFileSync(pdfFilePath);
    
    const filename = pdfFilePath.split('/').pop() || 'unknown.pdf';
    
    // Analyze PDF structure
    const analysis = await analyzePDFStructure(pdfBuffer);
    
    if (!analysis) {
      console.log('\\n❌ Could not analyze PDF structure');
      return;
    }
    
    const { totalPages, metadata, plans, hasText } = analysis;
    
    console.log(`\\n=== FINAL RESULTS ===`);
    console.log(`Filename: ${filename}`);
    console.log(`Total pages: ${totalPages}`);
    console.log(`Has text content: ${hasText ? 'Yes' : 'No'}`);
    console.log(`Survey plans detected: ${plans.length}`);
    
    if (plans.length > 0) {
      console.log(`\\n--- Detected Plans ---`);
      plans.forEach((plan, index) => {
        console.log(`\\nPlan ${index + 1}:`);
        console.log(`  Reference: ${plan.referenceNumber}`);
        console.log(`  Title: ${plan.title}`);
        console.log(`  Pages: ${plan.startPage}-${plan.endPage} (${plan.pageCount} pages)`);
        console.log(`  Source: ${plan.source}`);
        console.log(`  Confidence: ${plan.confidence}`);
      });
    } else {
      console.log(`\\n⚠️  No survey plans detected`);
      console.log(`   Possible reasons:`);
      console.log(`   - PDF is image-based (scanned) with no text`);
      console.log(`   - Plan references use different naming patterns`);
      console.log(`   - Plans are not clearly delimited in the text`);
      console.log(`   - May need bookmark/outline analysis instead`);
    }
    
    // Save debug output
    const debugOutput = {
      filename,
      totalPages,
      metadata,
      hasText,
      detectedPlans: plans,
      debugLogs
    };
    
    const debugFilePath = join(__dirname, 'structure-debug-output.json');
    writeFileSync(debugFilePath, JSON.stringify(debugOutput, null, 2));
    console.log(`\\n=== DEBUG OUTPUT ===`);
    console.log(`Structure analysis saved to: ${debugFilePath}`);
    
    return analysis;
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// CLI interface
if (process.argv.length < 3) {
  console.log('Usage: node debug-pdf-structure.js <path-to-pdf-file>');
  console.log('');
  console.log('Example:');
  console.log('  node debug-pdf-structure.js ./SurveyDocument.pdf');
  console.log('');
  console.log('This analyzes PDF text content to identify survey plan references.');
  console.log('For bookmark analysis, try using a browser-based tool instead.');
  process.exit(1);
}

const pdfPath = process.argv[2];
debugPDFStructure(pdfPath).catch(console.error);