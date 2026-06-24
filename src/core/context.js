/**
 * Context Analysis Module
 * Calculates token consumption across a codebase.
 * 
 * Core logic inspired by @aiready/cli, adapted for SYNTHAI.
 */

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { encode } from 'gpt-tokenizer';
import chalk from 'chalk';

const CODE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'java'];

export async function scanContext(directory, options = {}) {
    const maxContext = options.maxContext || 10000;

    // Find code files
    const patterns = CODE_EXTENSIONS.map(ext => `${directory}/**/*.${ext}`);
    const files = await glob(patterns, { ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'] });

    const results = [];
    let totalTokens = 0;

    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf-8');
            const tokens = encode(content).length;
            totalTokens += tokens;

            results.push({
                file: file.replace(directory, ''),
                tokens,
                overBudget: tokens > maxContext
            });
        } catch (e) {
            // Skip unreadable files
        }
    }

    // Sort by token count descending
    results.sort((a, b) => b.tokens - a.tokens);

    const overBudgetCount = results.filter(r => r.overBudget).length;
    const avgTokens = files.length > 0 ? Math.round(totalTokens / files.length) : 0;

    // Build summary
    let summary = chalk.bold('━'.repeat(60) + '\n');
    summary += chalk.bold('  CONTEXT ANALYSIS SUMMARY\n');
    summary += chalk.bold('━'.repeat(60) + '\n\n');
    summary += `📁 Files analyzed: ${files.length}\n`;
    summary += `📊 Total tokens: ${totalTokens.toLocaleString()}\n`;
    summary += `💰 Avg context budget: ${avgTokens} tokens/file\n`;

    if (overBudgetCount > 0) {
        summary += chalk.red(`\n⚠️  ${overBudgetCount} files exceed ${maxContext} token budget\n`);
    } else {
        summary += chalk.green('\n✅ All files within budget\n');
    }

    summary += '\n💸 Most Expensive Files:\n\n';
    for (const r of results.slice(0, 10)) {
        const marker = r.overBudget ? chalk.red('●') : chalk.gray('○');
        summary += `   ${marker} ${r.file} (${r.tokens.toLocaleString()} tokens)\n`;
    }

    return {
        files: results,
        totalTokens,
        avgTokens,
        overBudgetCount,
        summary
    };
}
