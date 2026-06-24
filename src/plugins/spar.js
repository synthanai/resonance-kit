/**
 * SPAR Compliance Plugin for Resonance-Kit
 * 
 * Checks codebase for SPAR debate structure validation:
 * S - Structured (protocols and patterns)
 * P - Persona (persona definitions and library)
 * A - Argumentation (debate flow and tension)
 * R - Reasoning (synthesis and decision recording)
 */

import chalk from 'chalk';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

/**
 * SPAR pattern categories to detect
 */
const SPAR_PATTERNS = {
    structured: {
        name: 'Structured',
        description: 'Protocol-driven deliberation patterns',
        patterns: [
            /sparkit/i,
            /spar[_-]?protocol/i,
            /heptagon/i,
            /7[_-]?step/i,
            /debate[_-]?flow/i,
            /dialectic/i,
            /structured[_-]?debate/i
        ],
        weight: 1.0
    },
    persona: {
        name: 'Persona',
        description: 'Persona definitions and compass directions',
        patterns: [
            /persona/i,
            /NEWS[_-]?compass/i,
            /north|east|south|west/i,
            /visionary|challenger|pragmatist|sage/i,
            /archetype/i,
            /109[_-]?persona/i,
            /persona[_-]?library/i
        ],
        weight: 1.0
    },
    argumentation: {
        name: 'Argumentation',
        description: 'Debate mechanics and tension patterns',
        patterns: [
            /rumble/i,
            /round[_-]?\d/i,
            /clash/i,
            /tension/i,
            /dissent/i,
            /counter[_-]?argument/i,
            /devil[_-]?s[_-]?advocate/i
        ],
        weight: 1.0
    },
    reasoning: {
        name: 'Reasoning',
        description: 'Synthesis and decision recording',
        patterns: [
            /synthesis/i,
            /knit/i,
            /verdict/i,
            /recommendation/i,
            /confidence[_-]?score/i,
            /transmit/i,
            /transaction/i
        ],
        weight: 1.0
    }
};

/**
 * Debate file structure patterns
 */
const DEBATE_STRUCTURE = {
    hasScope: /##?\s*\d?\.\s*SCOPE/i,
    hasPopulate: /##?\s*\d?\.\s*POPULATE/i,
    hasRumble: /##?\s*\d?\.\s*RUMBLE/i,
    hasKnit: /##?\s*\d?\.\s*KNIT|SYNTHESIS/i,
    hasTransmit: /##?\s*\d?\.\s*TRANSMIT|VERDICT/i
};

/**
 * Run SPAR compliance check on a directory
 * @param {string} directory - Path to scan
 * @returns {Object} SPAR compliance scores and findings
 */
export async function runSPARCheck(directory) {
    const startTime = Date.now();
    const scores = {
        structured: { score: 0, matches: 0, files: [] },
        persona: { score: 0, matches: 0, files: [] },
        argumentation: { score: 0, matches: 0, files: [] },
        reasoning: { score: 0, matches: 0, files: [] }
    };

    const debateFiles = [];
    const findings = [];
    let filesScanned = 0;

    // Recursively scan files
    await scanDirectory(directory, scores, findings, debateFiles, () => filesScanned++);

    // Calculate normalized scores (0-1)
    const totalFiles = Math.max(filesScanned, 1);
    Object.keys(scores).forEach(prop => {
        scores[prop].score = Math.min(scores[prop].files.length / Math.max(totalFiles * 0.05, 1), 1);
    });

    // Analyze debate file structure
    const debateAnalysis = await analyzeDebateFiles(debateFiles);

    // Calculate overall SPAR score
    const patternScore = Object.values(scores).reduce((acc, s) => acc + s.score, 0) / 4;
    const structureScore = debateAnalysis.completeness;
    const overall = (patternScore * 0.6) + (structureScore * 0.4);

    const duration = Date.now() - startTime;

    // Print console summary
    printSPARSummary(scores, debateAnalysis, overall, filesScanned, duration);

    return {
        scores,
        debateAnalysis,
        overall,
        findings,
        debateFiles: debateFiles.length,
        filesScanned,
        duration,
        timestamp: new Date().toISOString()
    };
}

/**
 * Recursively scan directory for SPAR patterns
 */
async function scanDirectory(dir, scores, findings, debateFiles, onFile) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
                    await scanDirectory(fullPath, scores, findings, debateFiles, onFile);
                }
            } else if (isSourceFile(entry.name)) {
                onFile();
                await scanFile(fullPath, scores, findings);

                // Check if it's a potential debate file
                if (entry.name.toLowerCase().includes('debate') ||
                    entry.name.toLowerCase().includes('spar') ||
                    entry.name.toLowerCase().includes('arena')) {
                    debateFiles.push(fullPath);
                }
            }
        }
    } catch {
        // Silently skip inaccessible directories
    }
}

/**
 * Check if file is worth scanning
 */
function isSourceFile(filename) {
    const extensions = ['.js', '.mjs', '.ts', '.jsx', '.tsx', '.md', '.json', '.yaml', '.yml'];
    return extensions.includes(extname(filename).toLowerCase());
}

/**
 * Scan a single file for SPAR patterns
 */
async function scanFile(filePath, scores, findings) {
    try {
        const content = await readFile(filePath, 'utf-8');

        for (const [prop, config] of Object.entries(SPAR_PATTERNS)) {
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
 * Analyze debate files for structural completeness
 */
async function analyzeDebateFiles(debateFiles) {
    const analysis = {
        total: debateFiles.length,
        complete: 0,
        partial: 0,
        incomplete: 0,
        completeness: 0,
        details: []
    };

    for (const file of debateFiles) {
        try {
            const content = await readFile(file, 'utf-8');
            const hasScope = DEBATE_STRUCTURE.hasScope.test(content);
            const hasPopulate = DEBATE_STRUCTURE.hasPopulate.test(content);
            const hasRumble = DEBATE_STRUCTURE.hasRumble.test(content);
            const hasKnit = DEBATE_STRUCTURE.hasKnit.test(content);
            const hasTransmit = DEBATE_STRUCTURE.hasTransmit.test(content);

            const sections = [hasScope, hasPopulate, hasRumble, hasKnit, hasTransmit];
            const sectionCount = sections.filter(Boolean).length;
            const fileCompleteness = sectionCount / 5;

            let status = 'incomplete';
            if (sectionCount === 5) {
                status = 'complete';
                analysis.complete++;
            } else if (sectionCount >= 3) {
                status = 'partial';
                analysis.partial++;
            } else {
                analysis.incomplete++;
            }

            analysis.details.push({
                file: basename(file),
                status,
                sections: { hasScope, hasPopulate, hasRumble, hasKnit, hasTransmit },
                completeness: fileCompleteness
            });
        } catch {
            // Skip unreadable files
        }
    }

    analysis.completeness = analysis.total > 0
        ? analysis.details.reduce((acc, d) => acc + d.completeness, 0) / analysis.total
        : 0;

    return analysis;
}

/**
 * Print SPAR summary to console
 */
function printSPARSummary(scores, debateAnalysis, overall, filesScanned, duration) {
    console.log(chalk.bold('⚔️  SPAR Compliance Summary\n'));

    const scoreBar = (score) => {
        const filled = Math.round(score * 10);
        const empty = 10 - filled;
        const color = score >= 0.7 ? 'green' : score >= 0.4 ? 'yellow' : 'red';
        return chalk[color]('█'.repeat(filled) + '░'.repeat(empty)) + ` ${(score * 100).toFixed(0)}%`;
    };

    console.log('  S - Structured:     ', scoreBar(scores.structured.score));
    console.log('  P - Persona:        ', scoreBar(scores.persona.score));
    console.log('  A - Argumentation:  ', scoreBar(scores.argumentation.score));
    console.log('  R - Reasoning:      ', scoreBar(scores.reasoning.score));
    console.log('  ─────────────────────────────');
    console.log('  Pattern Score:      ', scoreBar(Object.values(scores).reduce((a, s) => a + s.score, 0) / 4));

    if (debateAnalysis.total > 0) {
        console.log(chalk.bold('\n📜 Debate Files Structure\n'));
        console.log(`  Complete: ${debateAnalysis.complete} | Partial: ${debateAnalysis.partial} | Incomplete: ${debateAnalysis.incomplete}`);
        console.log('  Structure Score:    ', scoreBar(debateAnalysis.completeness));
    }

    console.log('  ─────────────────────────────');
    console.log(chalk.bold('  Overall SPAR:       '), scoreBar(overall));

    console.log(chalk.gray(`\n  Files scanned: ${filesScanned} | Debate files: ${debateAnalysis.total} | Duration: ${duration}ms`));

    // Recommendations
    const lowScores = Object.entries(scores)
        .filter(([_, s]) => s.score < 0.4)
        .map(([prop, _]) => SPAR_PATTERNS[prop].name);

    if (lowScores.length > 0) {
        console.log(chalk.yellow('\n⚠️  Low coverage: ' + lowScores.join(', ')));
        console.log(chalk.cyan('💡 Consider adding SPAR methodology patterns'));
    }

    if (debateAnalysis.incomplete > 0) {
        console.log(chalk.yellow(`\n⚠️  ${debateAnalysis.incomplete} debate file(s) missing required sections`));
    }
}

export default { runSPARCheck };
