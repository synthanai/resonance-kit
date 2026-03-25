/**
 * Resonance Report Generator
 * Aggregates all analysis results into a unified report.
 */

import chalk from 'chalk';

export async function generateReport({ context, patterns, dms, format }) {
    console.log(chalk.bold.magenta('\n' + '═'.repeat(60)));
    console.log(chalk.bold.magenta('  RESONANCE REPORT'));
    console.log(chalk.bold.magenta('═'.repeat(60) + '\n'));

    // Context Summary
    if (context) {
        console.log(context.summary);
    }

    // Pattern Summary
    if (patterns) {
        console.log(patterns.summary);
    }

    // DMS Summary
    if (dms) {
        console.log(dms.summary);
    }

    // Overall Score
    let score = 100;

    if (context?.overBudgetCount > 0) {
        score -= context.overBudgetCount * 5;
    }

    if (patterns?.issues?.length > 0) {
        score -= patterns.issues.length * 3;
    }

    if (dms?.issues?.length > 0) {
        score -= dms.issues.filter(i => i.severity === 'error').length * 10;
        score -= dms.issues.filter(i => i.severity === 'warning').length * 5;
    }

    if (dms?.heptagonCoverage) {
        score += Math.round(dms.heptagonCoverage * 10); // Bonus for Heptagon
    }

    score = Math.max(0, Math.min(100, score));

    const scoreColor = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;

    console.log(chalk.bold('\n' + '═'.repeat(60)));
    console.log(chalk.bold(`  RESONANCE SCORE: ${scoreColor(score + '/100')}`));
    console.log(chalk.bold('═'.repeat(60) + '\n'));

    if (score >= 80) {
        console.log(chalk.green('🎯 Production Ready - Excellent AI/Human collaboration potential\n'));
    } else if (score >= 50) {
        console.log(chalk.yellow('⚠️  Developing - Some optimization opportunities remain\n'));
    } else {
        console.log(chalk.red('🔴 Critical - Significant refactoring recommended\n'));
    }

    return { score };
}
