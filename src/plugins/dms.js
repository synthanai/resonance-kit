/**
 * DMS Plugin Module
 * SYNTHAI-specific Heptagon & MERIT compliance checks.
 * 
 * This is the EXTENSION layer on top of generic AIReady logic.
 */

import { glob } from 'glob';
import { readFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import path from 'path';

// The 7-Step Heptagon (DMS v0.2)
const HEPTAGON_STEPS = ['FRAME', 'SPAR', 'GATE', 'COMMIT', 'ENACT', 'YIELD', 'GAUGE'];

// MERIT Principles
const MERIT_PRINCIPLES = ['Modular', 'Explainable', 'Reversible', 'Incremental', 'Traceable'];

export async function runDMSCheck(directory) {
    const issues = [];
    const compliance = {
        heptagon: {},
        merit: {},
        ossIpBoundary: false,
        license: false
    };

    // Check for OSS_IP_BOUNDARY.md (Required for OSS repos)
    if (existsSync(path.join(directory, 'OSS_IP_BOUNDARY.md'))) {
        compliance.ossIpBoundary = true;
    } else {
        issues.push({
            type: 'dms_missing',
            message: 'Missing OSS_IP_BOUNDARY.md (Required for OSS Kit)',
            severity: 'warning'
        });
    }

    // Check for LICENSE
    if (existsSync(path.join(directory, 'LICENSE')) || existsSync(path.join(directory, 'LICENSE.md'))) {
        compliance.license = true;
    } else {
        issues.push({
            type: 'dms_missing',
            message: 'Missing LICENSE file',
            severity: 'error'
        });
    }

    // Scan for Heptagon step references in code
    const files = await glob(`${directory}/**/*.{js,ts,py}`, {
        ignore: ['**/node_modules/**', '**/.git/**']
    });

    for (const step of HEPTAGON_STEPS) {
        compliance.heptagon[step] = { found: false, files: [] };
    }

    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf-8').toUpperCase();
            for (const step of HEPTAGON_STEPS) {
                if (content.includes(step)) {
                    compliance.heptagon[step].found = true;
                    compliance.heptagon[step].files.push(file);
                }
            }
        } catch (e) {
            // Skip
        }
    }

    // Calculate Heptagon coverage
    const heptagonCoverage = HEPTAGON_STEPS.filter(s => compliance.heptagon[s].found).length / HEPTAGON_STEPS.length;

    // Build summary
    let summary = chalk.bold('━'.repeat(60) + '\n');
    summary += chalk.bold('  DMS COMPLIANCE REPORT\n');
    summary += chalk.bold('━'.repeat(60) + '\n\n');

    summary += chalk.bold('🏛️  Heptagon Coverage: ') +
        (heptagonCoverage >= 0.7 ? chalk.green : heptagonCoverage >= 0.4 ? chalk.yellow : chalk.red)(
            `${Math.round(heptagonCoverage * 100)}%`
        ) + '\n\n';

    for (const step of HEPTAGON_STEPS) {
        const found = compliance.heptagon[step].found;
        summary += `   ${found ? '✅' : '❌'} ${step}\n`;
    }

    summary += '\n📋 Standards Compliance:\n\n';
    summary += `   ${compliance.ossIpBoundary ? '✅' : '❌'} OSS_IP_BOUNDARY.md\n`;
    summary += `   ${compliance.license ? '✅' : '❌'} LICENSE\n`;

    if (issues.length > 0) {
        summary += chalk.yellow(`\n⚠️  ${issues.length} DMS issues:\n`);
        for (const issue of issues) {
            const icon = issue.severity === 'error' ? '🔴' : '🟡';
            summary += `   ${icon} ${issue.message}\n`;
        }
    } else {
        summary += chalk.green('\n✅ DMS Compliant\n');
    }

    return { issues, compliance, heptagonCoverage, summary };
}
