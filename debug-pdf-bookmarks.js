#!/usr/bin/env node

/**
 * PDF Bookmark Analysis Debug Tool
 * Analyzes PDF bookmarks/outline to identify survey plan boundaries
 */

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
 * Load PDF.js dynamically
 */
async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  
  // Set worker source - try different locations
  const workerPaths = [
    './node_modules/pdfjs-dist/build/pdf.worker.min.js',
    './node_modules/pdfjs-dist/build/pdf.worker.js',
    'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  ];
  
  // Use the first available worker
  pdfjs.GlobalWorkerOptions.workerSrc = workerPaths[0];
  
  return pdfjs;
}

/**
 * Extract and analyze PDF bookmarks/outline
 */
async function analyzeBookmarks(pdfBuffer) {
  try {
    console.log('\n=== LOADING PDF FOR BOOKMARK ANALYSIS ===');
    
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded successfully - ${pdf.numPages} pages`);
    
    // Get the outline/bookmarks
    console.log('\n=== EXTRACTING BOOKMARKS/OUTLINE ===');
    const outline = await pdf.getOutline();
    
    if (!outline || outline.length === 0) {
      console.log('❌ No bookmarks/outline found in PDF');
      return null;
    }
    
    console.log(`✅ Found ${outline.length} top-level bookmark entries`);
    
    // Parse the bookmark structure
    const bookmarks = await parseOutlineItems(pdf, outline, 0);
    
    console.log('\n=== BOOKMARK STRUCTURE ===');
    printBookmarkStructure(bookmarks);
    
    // Analyze bookmarks for survey plan patterns
    console.log('\n=== SURVEY PLAN ANALYSIS ===');
    const plans = analyzeBookmarksForPlans(bookmarks, pdf.numPages);
    
    return { bookmarks, plans, totalPages: pdf.numPages };
    
  } catch (error) {
    console.error('Error analyzing bookmarks:', error.message);
    return null;
  }
}

/**
 * Recursively parse outline items
 */
async function parseOutlineItems(pdf, items, level) {
  const bookmarks = [];
  
  for (const item of items) {
    try {
      // Get destination page
      let pageNum = null;
      try {
        if (item.dest) {
          let dest;
          if (typeof item.dest === 'string') {
            dest = await pdf.getDestination(item.dest);
          } else {
            dest = item.dest;
          }
          
          if (dest && dest[0]) {
            const pageIndex = await pdf.getPageIndex(dest[0]);
            pageNum = pageIndex + 1; // Convert to 1-based
          }
        }
      } catch (destError) {
        console.warn(`Could not resolve destination for "${item.title}": ${destError.message}`);
      }
      
      const bookmark = {
        title: item.title,
        page: pageNum,
        level: level,
        hasChildren: item.items && item.items.length > 0
      };
      
      // Recursively parse children
      if (item.items && item.items.length > 0) {
        bookmark.children = await parseOutlineItems(pdf, item.items, level + 1);
      }
      
      bookmarks.push(bookmark);
      
    } catch (error) {
      console.warn(`Error processing bookmark "${item.title}": ${error.message}`);
    }
  }
  
  return bookmarks;
}

/**
 * Print bookmark structure for debugging
 */
function printBookmarkStructure(bookmarks, indent = '') {
  for (const bookmark of bookmarks) {
    const pageInfo = bookmark.page ? `(Page ${bookmark.page})` : '(No page)';
    console.log(`${indent}📖 "${bookmark.title}" ${pageInfo}`);
    
    if (bookmark.children && bookmark.children.length > 0) {
      printBookmarkStructure(bookmark.children, indent + '  ');
    }
  }
}

/**
 * Analyze bookmarks to identify survey plan boundaries
 */
function analyzeBookmarksForPlans(bookmarks, totalPages) {
  console.log('Analyzing bookmarks for survey plan patterns...');
  
  // Flatten bookmarks to get all entries with pages
  const flatBookmarks = flattenBookmarks(bookmarks).filter(b => b.page !== null);
  
  console.log(`Found ${flatBookmarks.length} bookmarks with valid page references`);
  
  // Survey plan patterns to look for in bookmark titles
  const planPatterns = [
    { name: 'Tasmania format (6-digit-number)', regex: /\b(\d{6}-\d+)\b/i },
    { name: 'Deposited Plan', regex: /\bDP\s*(\d+)\b/i },
    { name: 'Plan of Survey', regex: /\bPS\s*(\d+)\b/i },
    { name: 'Crown Plan', regex: /\bCP\s*(\d+)\b/i },
    { name: 'Plan of Title', regex: /\bPT\s*(\d+)\b/i },
    { name: 'LTO Plan', regex: /\bLTO\s*(\d+)\b/i },
    { name: 'Plan number only', regex: /\b(\d{6})\b/i },
    { name: 'Generic Plan', regex: /\bplan\s+([^\s]+)/i }
  ];
  
  const detectedPlans = [];
  
  console.log('\n--- Analyzing each bookmark ---');
  for (let i = 0; i < flatBookmarks.length; i++) {
    const bookmark = flatBookmarks[i];
    console.log(`\nBookmark ${i + 1}: "${bookmark.title}" -> Page ${bookmark.page}`);
    
    let planReference = null;
    let matchedPattern = null;
    
    // Test each pattern
    for (const pattern of planPatterns) {
      const match = bookmark.title.match(pattern.regex);
      if (match) {
        planReference = match[1] || match[0];
        matchedPattern = pattern.name;
        console.log(`  ✅ Matched ${pattern.name}: "${planReference}"`);
        break;
      }
    }
    
    if (!planReference) {
      console.log(`  ❌ No survey plan pattern matched`);
      // Check if this looks like a plan boundary anyway
      if (bookmark.title.toLowerCase().includes('plan') || 
          bookmark.title.toLowerCase().includes('survey') ||
          bookmark.title.toLowerCase().includes('lot')) {
        planReference = `PLAN_${String(detectedPlans.length + 1).padStart(3, '0')}`;
        matchedPattern = 'Generic boundary';
        console.log(`  🔍 Treating as generic plan boundary: "${planReference}"`);
      }
    }
    
    if (planReference) {
      // Calculate end page (start of next plan or end of document)
      const nextBookmark = flatBookmarks[i + 1];
      const endPage = nextBookmark ? nextBookmark.page - 1 : totalPages;
      const pageCount = endPage - bookmark.page + 1;
      
      const plan = {
        referenceNumber: planReference,
        title: bookmark.title,
        startPage: bookmark.page,
        endPage: endPage,
        pageCount: pageCount,
        source: 'bookmark',
        matchedPattern: matchedPattern,
        originalBookmarkTitle: bookmark.title
      };
      
      console.log(`  📋 Plan detected: Pages ${bookmark.page}-${endPage} (${pageCount} pages)`);
      detectedPlans.push(plan);
    }
  }
  
  console.log(`\n=== PLAN DETECTION SUMMARY ===`);
  console.log(`Total bookmarks analyzed: ${flatBookmarks.length}`);
  console.log(`Survey plans detected: ${detectedPlans.length}`);
  
  if (detectedPlans.length === 0) {
    console.log(`⚠️  No survey plans detected from bookmarks`);
    console.log(`   This might mean:`);
    console.log(`   - Bookmarks don't follow standard naming patterns`);
    console.log(`   - Plans are organized differently in this document`);
    console.log(`   - Manual review of bookmark structure needed`);
  }
  
  return detectedPlans;
}

/**
 * Flatten nested bookmarks into a single array
 */
function flattenBookmarks(bookmarks, result = []) {
  for (const bookmark of bookmarks) {
    result.push({
      title: bookmark.title,
      page: bookmark.page,
      level: bookmark.level
    });
    
    if (bookmark.children) {
      flattenBookmarks(bookmark.children, result);
    }
  }
  
  return result;
}

/**
 * Main debug function
 */
async function debugPDFBookmarks(pdfFilePath) {
  try {
    console.log('='.repeat(80));
    console.log('PDF BOOKMARK ANALYSIS TOOL');
    console.log('='.repeat(80));
    
    console.log(`Loading PDF: ${pdfFilePath}`);
    const pdfBuffer = readFileSync(pdfFilePath);
    
    const filename = pdfFilePath.split('/').pop() || 'unknown.pdf';
    
    // Analyze bookmarks
    const analysis = await analyzeBookmarks(pdfBuffer);
    
    if (!analysis) {
      console.log('\n❌ Could not analyze PDF bookmarks');
      return;
    }
    
    const { bookmarks, plans, totalPages } = analysis;
    
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Total pages: ${totalPages}`);
    console.log(`Total bookmarks: ${bookmarks.length}`);
    console.log(`Survey plans detected: ${plans.length}`);
    
    if (plans.length > 0) {
      console.log(`\n--- Detected Plans ---`);
      plans.forEach((plan, index) => {
        console.log(`\nPlan ${index + 1}:`);
        console.log(`  Reference: ${plan.referenceNumber}`);
        console.log(`  Title: ${plan.title}`);
        console.log(`  Pages: ${plan.startPage}-${plan.endPage} (${plan.pageCount} pages)`);
        console.log(`  Matched Pattern: ${plan.matchedPattern}`);
        console.log(`  Original Bookmark: "${plan.originalBookmarkTitle}"`);
      });
    }
    
    // Save debug output
    const debugOutput = {
      filename,
      totalPages,
      bookmarks,
      detectedPlans: plans,
      debugLogs
    };
    
    const debugFilePath = join(__dirname, 'bookmark-debug-output.json');
    writeFileSync(debugFilePath, JSON.stringify(debugOutput, null, 2));
    console.log(`\n=== DEBUG OUTPUT ===`);
    console.log(`Bookmark analysis saved to: ${debugFilePath}`);
    
    return analysis;
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// CLI interface
if (process.argv.length < 3) {
  console.log('Usage: node debug-pdf-bookmarks.js <path-to-pdf-file>');
  console.log('');
  console.log('Example:');
  console.log('  node debug-pdf-bookmarks.js ./SurveyDocument.pdf');
  console.log('');
  console.log('This will analyze PDF bookmarks to identify survey plan boundaries.');
  console.log('');
  console.log('First install pdfjs-dist:');
  console.log('  npm install pdfjs-dist');
  process.exit(1);
}

const pdfPath = process.argv[2];
debugPDFBookmarks(pdfPath).catch(console.error);