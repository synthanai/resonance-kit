/**
 * Pattern Analysis Module
 * Detects semantic duplicates and consistency issues.
 * 
 * Note: This is a lightweight heuristic version.
 * Full semantic detection would require embedding models.
 */

import { glob } from 'glob';
import { readFileSync } from 'fs';
import chalk from 'chalk';

// Common patterns to detect
const PATTERNS = {
    // Function naming conventions
    mixedNaming: /(?:const|let|var|function)\s+([a-z]+[A-Z][a-zA-Z]*|[a-z]+_[a-z]+)/g,
    // Error handling styles
    tryCatch: /try\s*{/g,
    promiseCatch: /\.catch\(/g,
    // Export styles
    namedExport: /export\s+(const|function|class)/g,
    defaultExport: /export\s+default/g
};

export async function scanPatterns(directory) {
    const files = await glob(`${directory}/**/*.{js,ts,jsx,tsx}`, {
        ignore: ['**/node_modules/**', '**/.git/**']
    });

    const issues = [];
    const stats = {
        tryCatchCount: 0,
        promiseCatchCount: 0,
        namedExports: 0,
        defaultExports: 0
    };

    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf-8');

            // Count patterns
            stats.tryCatchCount += (content.match(PATTERNS.tryCatch) || []).length;
            stats.promiseCatchCount += (content.match(PATTERNS.promiseCatch) || []).length;
            stats.namedExports += (content.match(PATTERNS.namedExport) || []).length;
            stats.defaultExports += (content.match(PATTERNS.defaultExport) || []).length;

        } catch (e) {
            // Skip unreadable
        }
    }

    // Detect inconsistencies
    if (stats.tryCatchCount > 0 && stats.promiseCatchCount > 0) {
        const ratio = stats.tryCatchCount / (stats.tryCatchCount + stats.promiseCatchCount);
        if (ratio > 0.3 && ratio < 0.7) {
            issues.push({
                type: 'pattern_inconsistency',
                message: 'Mixed error handling: try/catch and .catch() used inconsistently',
                severity: 'warning'
            });
        }
    }

    if (stats.namedExports > 0 && stats.defaultExports > 0) {
        const ratio = stats.namedExports / (stats.namedExports + stats.defaultExports);
        if (ratio > 0.3 && ratio < 0.7) {
            issues.push({
                type: 'export_inconsistency',
                message: 'Mixed export styles: named and default exports used inconsistently',
                severity: 'info'
            });
        }
    }

    // Build summary
    let summary = chalk.bold('\n🔍 Pattern Analysis\n\n');
    summary += `   Try/Catch blocks: ${stats.tryCatchCount}\n`;
    summary += `   Promise .catch(): ${stats.promiseCatchCount}\n`;
    summary += `   Named exports: ${stats.namedExports}\n`;
    summary += `   Default exports: ${stats.defaultExports}\n`;

    if (issues.length > 0) {
        summary += chalk.yellow(`\n⚠️  ${issues.length} pattern issues detected:\n`);
        for (const issue of issues) {
            summary += `   - ${issue.message}\n`;
        }
    } else {
        summary += chalk.green('\n✅ No significant pattern inconsistencies\n');
    }

    return { issues, stats, summary };
}
