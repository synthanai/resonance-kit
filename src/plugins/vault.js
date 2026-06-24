/**
 * VAULT Compliance Plugin for Resonance-Kit
 * 
 * Checks codebase for VAULT property compliance:
 * V - Verified (authentication patterns)
 * A - Auditable (logging patterns)
 * U - Unleakable (plane separation)
 * L - Limited (bulk disclosure prevention)
 * T - Traceable (provenance/revocation)
 */

import chalk from 'chalk';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

/**
 * VAULT property patterns to detect
 */
const VAULT_PATTERNS = {
    verified: {
        name: 'Verified',
        description: 'Step-up authentication before sensitive operations',
        patterns: [
            /auth[_-]?required/i,
            /verify[_-]?(identity|user|access)/i,
            /authenticate/i,
            /check[_-]?credentials/i,
            /jwt[_-]?verify/i,
            /session[_-]?valid/i
        ],
        weight: 1.0
    },
    auditable: {
        name: 'Auditable',
        description: 'Append-only, hash-chained logging',
        patterns: [
            /audit[_-]?log/i,
            /log[_-]?access/i,
            /hash[_-]?chain/i,
            /append[_-]?only/i,
            /immutable[_-]?log/i,
            /trace[_-]?id/i
        ],
        weight: 1.0
    },
    unleakable: {
        name: 'Unleakable',
        description: 'Plane separation for data',
        patterns: [
            /plane[_-]?separation/i,
            /security[_-]?zone/i,
            /isolation/i,
            /sandbox/i,
            /encrypt/i,
            /classified/i
        ],
        weight: 1.0
    },
    limited: {
        name: 'Limited',
        description: 'Prevention of bulk disclosure',
        patterns: [
            /rate[_-]?limit/i,
            /max[_-]?results/i,
            /pagination/i,
            /batch[_-]?size/i,
            /throttle/i,
            /bulk[_-]?prevent/i
        ],
        weight: 1.0
    },
    traceable: {
        name: 'Traceable',
        description: 'Origin visibility and revocation tracking',
        patterns: [
            /provenance/i,
            /origin[_-]?trace/i,
            /revoke/i,
            /revocation/i,
            /lineage/i,
            /source[_-]?track/i,
            /data[_-]?origin/i
        ],
        weight: 1.0
    }
};

/**
 * Run VAULT compliance check on a directory
 * @param {string} directory - Path to scan
 * @returns {Object} VAULT compliance scores and findings
 */
export async function runVaultCheck(directory) {
    const startTime = Date.now();
    const scores = {
        verified: { score: 0, matches: 0, files: [] },
        auditable: { score: 0, matches: 0, files: [] },
        unleakable: { score: 0, matches: 0, files: [] },
        limited: { score: 0, matches: 0, files: [] },
        traceable: { score: 0, matches: 0, files: [] }
    };

    const findings = [];
    let filesScanned = 0;

    // Recursively scan files
    await scanDirectory(directory, scores, findings, () => filesScanned++);

    // Calculate normalized scores (0-1)
    const totalFiles = Math.max(filesScanned, 1);
    Object.keys(scores).forEach(prop => {
        // Score based on percentage of files with at least one pattern match
        scores[prop].score = Math.min(scores[prop].files.length / Math.max(totalFiles * 0.1, 1), 1);
    });

    // Calculate overall VAULT score
    const overall = Object.values(scores).reduce((acc, s) => acc + s.score, 0) / 5;

    const duration = Date.now() - startTime;

    // Print console summary
    printVaultSummary(scores, overall, filesScanned, duration);

    return {
        scores,
        overall,
        findings,
        filesScanned,
        duration,
        timestamp: new Date().toISOString()
    };
}

/**
 * Recursively scan directory for VAULT patterns
 */
async function scanDirectory(dir, scores, findings, onFile) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip common non-source directories
                if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
                    await scanDirectory(fullPath, scores, findings, onFile);
                }
            } else if (isSourceFile(entry.name)) {
                onFile();
                await scanFile(fullPath, scores, findings);
            }
        }
    } catch {
        // Silently skip inaccessible directories
    }
}

/**
 * Check if file is a source file worth scanning
 */
function isSourceFile(filename) {
    const sourceExtensions = ['.js', '.mjs', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java'];
    return sourceExtensions.includes(extname(filename).toLowerCase());
}

/**
 * Scan a single file for VAULT patterns
 */
async function scanFile(filePath, scores, findings) {
    try {
        const content = await readFile(filePath, 'utf-8');

        for (const [prop, config] of Object.entries(VAULT_PATTERNS)) {
            for (const pattern of config.patterns) {
                const matches = content.match(new RegExp(pattern, 'g'));
                if (matches && matches.length > 0) {
                    scores[prop].matches += matches.length;
                    if (!scores[prop].files.includes(filePath)) {
                        scores[prop].files.push(filePath);
                    }
                    findings.push({
                        property: prop,
                        file: filePath,
                        pattern: pattern.toString(),
                        count: matches.length
                    });
                }
            }
        }
    } catch {
        // Skip unreadable files
    }
}

/**
 * Print VAULT summary to console
 */
function printVaultSummary(scores, overall, filesScanned, duration) {
    console.log(chalk.bold('🛡️  VAULT Compliance Summary\n'));

    const scoreBar = (score) => {
        const filled = Math.round(score * 10);
        const empty = 10 - filled;
        const color = score >= 0.7 ? 'green' : score >= 0.4 ? 'yellow' : 'red';
        return chalk[color]('█'.repeat(filled) + '░'.repeat(empty)) + ` ${(score * 100).toFixed(0)}%`;
    };

    console.log('  V - Verified:   ', scoreBar(scores.verified.score));
    console.log('  A - Auditable:  ', scoreBar(scores.auditable.score));
    console.log('  U - Unleakable: ', scoreBar(scores.unleakable.score));
    console.log('  L - Limited:    ', scoreBar(scores.limited.score));
    console.log('  T - Traceable:  ', scoreBar(scores.traceable.score));
    console.log('  ─────────────────────────────');
    console.log('  Overall VAULT:  ', scoreBar(overall));

    console.log(chalk.gray(`\n  Files scanned: ${filesScanned} | Duration: ${duration}ms`));

    // Recommendations
    const lowScores = Object.entries(scores)
        .filter(([_, s]) => s.score < 0.4)
        .map(([prop, _]) => VAULT_PATTERNS[prop].name);

    if (lowScores.length > 0) {
        console.log(chalk.yellow('\n⚠️  Low compliance: ' + lowScores.join(', ')));
        console.log(chalk.cyan('💡 Consider adding patterns for: ' + lowScores.map(n => n.charAt(0)).join('-')));
    }
}

export default { runVaultCheck };
