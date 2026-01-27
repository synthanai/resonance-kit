#!/usr/bin/env node
/**
 * Resonance Kit CLI
 * AI-Readiness & DMS Compliance Auditor
 * 
 * Fork-and-Extend model: Core logic inspired by @aiready/cli
 * Extended with SYNTHAI-specific DMS/MERIT/GRACE checks.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { scanContext } from '../src/core/context.js';
import { scanPatterns } from '../src/core/patterns.js';
import { runDMSCheck } from '../src/plugins/dms.js';
import { generateReport } from '../src/reports/resonance.js';

const program = new Command();

program
    .name('resonance')
    .description('AI-Readiness & DMS Compliance Auditor for SYNTHAI')
    .version('1.0.0');

program
    .command('scan <directory>')
    .description('Run full resonance scan (Context + Patterns + DMS)')
    .option('--dms', 'Include DMS Heptagon compliance checks')
    .option('--vault', 'Include VAULT property compliance checks')
    .option('--spar', 'Include SPAR debate structure validation')
    .option('--max-context <tokens>', 'Maximum token budget per file', '5000')
    .option('-o, --output <format>', 'Output format: console, json, md', 'console')
    .action(async (directory, options) => {
        console.log(chalk.bold.cyan('\n🔬 Resonance Kit v1.0.0\n'));
        console.log(chalk.gray(`Scanning: ${directory}\n`));

        // Core Analysis (AIReady-compatible)
        const contextResult = await scanContext(directory, { maxContext: parseInt(options.maxContext) });
        const patternResult = await scanPatterns(directory);

        // DMS Plugin (SYNTHAI Extension)
        let dmsResult = null;
        if (options.dms) {
            console.log(chalk.yellow('\n🏛️  Running DMS Compliance Check...\n'));
            dmsResult = await runDMSCheck(directory);
        }

        // VAULT Plugin (Privacy Compliance)
        let vaultResult = null;
        if (options.vault) {
            console.log(chalk.magenta('\n🛡️  Running VAULT Compliance Check...\n'));
            const { runVaultCheck } = await import('../src/plugins/vault.js');
            vaultResult = await runVaultCheck(directory);
        }

        // SPAR Plugin (Debate Structure Validation)
        let sparResult = null;
        if (options.spar) {
            console.log(chalk.blue('\n⚔️  Running SPAR Compliance Check...\n'));
            const { runSPARCheck } = await import('../src/plugins/spar.js');
            sparResult = await runSPARCheck(directory);
        }

        // Generate Report
        await generateReport({
            context: contextResult,
            patterns: patternResult,
            dms: dmsResult,
            vault: vaultResult,
            spar: sparResult,
            format: options.output
        });
    });

program
    .command('context <directory>')
    .description('Analyze token consumption and context efficiency')
    .option('--max-context <tokens>', 'Maximum token budget', '10000')
    .action(async (directory, options) => {
        console.log(chalk.bold.cyan('\n📊 Context Analysis\n'));
        const result = await scanContext(directory, { maxContext: parseInt(options.maxContext) });
        console.log(result.summary);
    });

program
    .command('dms <directory>')
    .description('Run DMS Heptagon & MERIT compliance check')
    .action(async (directory) => {
        console.log(chalk.bold.yellow('\n🏛️  DMS Compliance Audit\n'));
        const result = await runDMSCheck(directory);
        console.log(result.summary);
    });

program
    .command('external <target>')
    .description('Audit external skill/doc against MERIT principles (Verified Skills)')
    .option('-s, --source <type>', 'Source type: context7, github, url, local', 'auto')
    .option('-v, --version <version>', 'Library version (for context7)', 'latest')
    .option('--offline', 'Use cached/fallback only')
    .option('-o, --output <format>', 'Output format: console, json, md', 'console')
    .action(async (target, options) => {
        console.log(chalk.bold.magenta('\n🔐 Verified Skills Audit\n'));
        console.log(chalk.gray(`Target: ${target}`));
        console.log(chalk.gray(`Source: ${options.source === 'auto' ? 'auto-detect' : options.source}\n`));

        try {
            const { fetchExternalSkill, auditExternalSkill } = await import('../src/core/external.js');

            // Fetch the external skill
            const skill = await fetchExternalSkill(target, {
                source: options.source === 'auto' ? undefined : options.source,
                version: options.version,
                offline: options.offline
            });

            console.log(chalk.green(`✓ Fetched: ${skill.name}@${skill.version}`));
            console.log(chalk.gray(`  Source: ${skill.source}`));
            console.log(chalk.gray(`  Content: ${skill.content.length} chars\n`));

            // Run MERIT audit
            const audit = auditExternalSkill(skill);

            // Output results
            if (options.output === 'json') {
                console.log(JSON.stringify(audit, null, 2));
            } else if (options.output === 'md') {
                console.log(formatAuditMarkdown(audit));
            } else {
                printAuditConsole(audit);
            }

        } catch (error) {
            console.log(chalk.red(`\n✗ Audit failed: ${error.message}`));
            process.exit(1);
        }
    });

/**
 * Print audit results to console with colors
 */
function printAuditConsole(audit) {
    console.log(chalk.bold('📊 MERIT Audit Results\n'));

    const scoreBar = (score) => {
        const filled = Math.round(score * 10);
        const empty = 10 - filled;
        const color = score >= 0.7 ? 'green' : score >= 0.5 ? 'yellow' : 'red';
        return chalk[color]('█'.repeat(filled) + '░'.repeat(empty)) + ` ${(score * 100).toFixed(0)}%`;
    };

    console.log('  Measurable:  ', scoreBar(audit.merit.measurable));
    console.log('  Explicit:    ', scoreBar(audit.merit.explicit));
    console.log('  Reversible:  ', scoreBar(audit.merit.reversible));
    console.log('  Informed:    ', scoreBar(audit.merit.informed));
    console.log('  Transparent: ', scoreBar(audit.merit.transparent));
    console.log('  ─────────────────────────────');
    console.log('  Overall:     ', scoreBar(audit.overall));

    if (audit.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        audit.warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
    }

    if (audit.recommendations.length > 0) {
        console.log(chalk.cyan('\n💡 Recommendations:'));
        audit.recommendations.forEach(r => console.log(chalk.cyan(`  • ${r}`)));
    }

    console.log('\n' + chalk.gray(`Audit completed: ${audit.timestamp}`));
}

/**
 * Format audit as Markdown
 */
function formatAuditMarkdown(audit) {
    return `# Verified Skills Audit Report

**Skill**: ${audit.skill}  
**Source**: ${audit.source}  
**Version**: ${audit.version}  
**Timestamp**: ${audit.timestamp}

## MERIT Scores

| Principle | Score |
|-----------|-------|
| Measurable | ${(audit.merit.measurable * 100).toFixed(0)}% |
| Explicit | ${(audit.merit.explicit * 100).toFixed(0)}% |
| Reversible | ${(audit.merit.reversible * 100).toFixed(0)}% |
| Informed | ${(audit.merit.informed * 100).toFixed(0)}% |
| Transparent | ${(audit.merit.transparent * 100).toFixed(0)}% |
| **Overall** | **${(audit.overall * 100).toFixed(0)}%** |

${audit.warnings.length > 0 ? `## Warnings\n${audit.warnings.map(w => `- ⚠️ ${w}`).join('\n')}` : ''}

${audit.recommendations.length > 0 ? `## Recommendations\n${audit.recommendations.map(r => `- 💡 ${r}`).join('\n')}` : ''}
`;
}

program
    .command('re-audit <target>')
    .description('GAUGE-triggered re-audit of skill (closes metacognitive feedback loop)')
    .option('-s, --source <type>', 'Source type: context7, github, url, local', 'auto')
    .option('-v, --version <version>', 'Library version', 'latest')
    .option('--drift', 'Flag indicating GAUGE detected knowledge drift')
    .option('--previous-score <score>', 'Previous MERIT score for delta calculation')
    .option('-o, --output <format>', 'Output format: console, json, md', 'console')
    .action(async (target, options) => {
        try {
            const { executeReaudit } = await import('../src/core/gauge-trigger.js');

            const gaugeContext = {
                driftDetected: options.drift || false,
                previousScore: options.previousScore ? parseFloat(options.previousScore) : undefined
            };

            const result = await executeReaudit(target, {
                source: options.source === 'auto' ? undefined : options.source,
                version: options.version,
                triggerReason: options.drift ? 'GAUGE_DRIFT_DETECTED' : 'MANUAL_REAUDIT',
                gaugeContext
            });

            // Output
            if (options.output === 'json') {
                console.log(JSON.stringify(result, null, 2));
            } else {
                printReauditConsole(result);
            }

        } catch (error) {
            console.log(chalk.red(`\n✗ Re-audit failed: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('re-audit-batch <manifest>')
    .description('Batch re-audit from JSON manifest file')
    .option('--drift', 'Apply drift context to all items')
    .action(async (manifestPath, options) => {
        try {
            const fs = await import('fs/promises');
            const { batchReaudit } = await import('../src/core/gauge-trigger.js');

            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            await batchReaudit(manifest, {
                gaugeContext: { driftDetected: options.drift }
            });

        } catch (error) {
            console.log(chalk.red(`\n✗ Batch re-audit failed: ${error.message}`));
            process.exit(1);
        }
    });

/**
 * Print re-audit results with GAUGE context
 */
function printReauditConsole(result) {
    console.log(chalk.bold('📊 Re-Audit Results\n'));

    const scoreBar = (score) => {
        const filled = Math.round(score * 10);
        const empty = 10 - filled;
        const color = score >= 0.7 ? 'green' : score >= 0.5 ? 'yellow' : 'red';
        return chalk[color]('█'.repeat(filled) + '░'.repeat(empty)) + ` ${(score * 100).toFixed(0)}%`;
    };

    console.log('  Measurable:  ', scoreBar(result.merit.measurable));
    console.log('  Explicit:    ', scoreBar(result.merit.explicit));
    console.log('  Reversible:  ', scoreBar(result.merit.reversible));
    console.log('  Informed:    ', scoreBar(result.merit.informed));
    console.log('  Transparent: ', scoreBar(result.merit.transparent));
    console.log('  ─────────────────────────────');
    console.log('  Overall:     ', scoreBar(result.overall));

    // GAUGE Feedback Section
    console.log(chalk.bold.cyan('\n🔄 GAUGE Feedback\n'));
    console.log(chalk.gray(`  Trigger: ${result.gaugeContext.triggerReason}`));
    console.log(chalk.gray(`  Duration: ${result.gaugeContext.durationMs}ms`));

    if (result.feedback.scoreChange !== null) {
        const changeColor = result.feedback.scoreChange >= 0 ? 'green' : 'red';
        const changeSymbol = result.feedback.scoreChange >= 0 ? '↑' : '↓';
        console.log(chalk[changeColor](`  Score Change: ${changeSymbol} ${(Math.abs(result.feedback.scoreChange) * 100).toFixed(1)}%`));
    }

    const resolutionColors = {
        'IMPROVED': 'green',
        'STABLE_HEALTHY': 'green',
        'BASELINE_ESTABLISHED': 'cyan',
        'STABLE_AT_RISK': 'yellow',
        'DEGRADED': 'red'
    };
    const resColor = resolutionColors[result.feedback.resolution] || 'gray';
    console.log(chalk[resColor](`  Resolution: ${result.feedback.resolution}`));

    console.log('\n' + chalk.gray(`Re-audit completed: ${result.gaugeContext.reauditTimestamp}`));
}

program.parse();
