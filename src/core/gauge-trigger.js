/**
 * GAUGE Trigger Module - Metacognitive Feedback Loop
 * 
 * Closes the GAUGE → Context7 loop identified in the 7-Day Capability Synthesis.
 * When a GAUGE phase detects knowledge drift, it triggers re-audit of suspect domains.
 * 
 * @module resonance-kit/core/gauge-trigger
 */

import chalk from 'chalk';
import { fetchExternalSkill, auditExternalSkill } from './external.js';

/**
 * Drift Detection Thresholds
 */
const THRESHOLDS = {
    MERIT_MIN: 0.5,           // Below this = knowledge drift detected
    STALENESS_DAYS: 30,       // Re-audit if last audit > N days old
    VERSION_MISMATCH: true    // Re-audit if version changed
};

/**
 * In-memory audit cache (would be persisted in production)
 * Key: skill@version, Value: { audit, timestamp }
 */
const auditCache = new Map();

/**
 * Register a completed audit in the cache
 * @param {Object} audit - MERIT audit result
 */
export function registerAudit(audit) {
    const key = `${audit.skill}@${audit.version}`;
    auditCache.set(key, {
        audit,
        timestamp: new Date()
    });
}

/**
 * Check if a skill needs re-audit based on GAUGE phase signals
 * @param {string} skillName - Name of the skill/library
 * @param {Object} gaugeSignals - Signals from GAUGE phase
 * @param {boolean} gaugeSignals.knowledgeDrift - Detected knowledge inconsistency
 * @param {number} gaugeSignals.meritScore - Last known MERIT score
 * @param {string} gaugeSignals.lastVersion - Version at last audit
 * @param {string} gaugeSignals.currentVersion - Current version in use
 * @returns {Object} { needsReaudit: boolean, reason: string }
 */
export function checkReauditNeeded(skillName, gaugeSignals = {}) {
    const reasons = [];

    // Check explicit drift signal
    if (gaugeSignals.knowledgeDrift) {
        reasons.push('GAUGE detected knowledge drift');
    }

    // Check MERIT score below threshold
    if (gaugeSignals.meritScore !== undefined && gaugeSignals.meritScore < THRESHOLDS.MERIT_MIN) {
        reasons.push(`MERIT score (${(gaugeSignals.meritScore * 100).toFixed(0)}%) below threshold (${THRESHOLDS.MERIT_MIN * 100}%)`);
    }

    // Check version mismatch
    if (THRESHOLDS.VERSION_MISMATCH &&
        gaugeSignals.lastVersion &&
        gaugeSignals.currentVersion &&
        gaugeSignals.lastVersion !== gaugeSignals.currentVersion) {
        reasons.push(`Version changed: ${gaugeSignals.lastVersion} → ${gaugeSignals.currentVersion}`);
    }

    // Check cache staleness
    const cacheKey = `${skillName}@${gaugeSignals.currentVersion || 'latest'}`;
    const cached = auditCache.get(cacheKey);
    if (cached) {
        const ageMs = Date.now() - cached.timestamp.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays > THRESHOLDS.STALENESS_DAYS) {
            reasons.push(`Last audit ${ageDays.toFixed(0)} days ago (threshold: ${THRESHOLDS.STALENESS_DAYS})`);
        }
    } else {
        reasons.push('No cached audit found');
    }

    return {
        needsReaudit: reasons.length > 0,
        reasons
    };
}

/**
 * Execute re-audit with GAUGE context
 * This is the core of the metacognitive feedback loop.
 * 
 * @param {string} target - Skill/library to re-audit
 * @param {Object} options - Re-audit options
 * @param {Object} options.gaugeContext - Context from GAUGE phase
 * @param {string} options.source - Source type (context7, github, etc.)
 * @param {string} options.version - Version to audit
 * @returns {Promise<Object>} Enhanced audit result with feedback metadata
 */
export async function executeReaudit(target, options = {}) {
    const startTime = Date.now();

    console.log(chalk.bold.cyan('\n🔄 GAUGE-Triggered Re-Audit\n'));
    console.log(chalk.gray(`Target: ${target}`));
    console.log(chalk.gray(`Trigger: ${options.triggerReason || 'manual'}\n`));

    try {
        // Fetch fresh skill data
        const skill = await fetchExternalSkill(target, {
            source: options.source,
            version: options.version
        });

        // Run MERIT audit
        const audit = auditExternalSkill(skill);

        // Enhance with GAUGE metadata
        const enhancedAudit = {
            ...audit,
            gaugeContext: {
                triggerReason: options.triggerReason || 'manual',
                previousScore: options.gaugeContext?.previousScore,
                driftDetected: options.gaugeContext?.driftDetected,
                reauditTimestamp: new Date().toISOString(),
                durationMs: Date.now() - startTime
            },
            feedback: {
                scoreChange: options.gaugeContext?.previousScore
                    ? audit.overall - options.gaugeContext.previousScore
                    : null,
                resolution: determineResolution(audit, options.gaugeContext)
            }
        };

        // Update cache
        registerAudit(enhancedAudit);

        // Emit GAUGE_EVENT for cross-kit learning
        try {
            const { emitGaugeEvent } = await import('agentic-kit/src/core/event-bus.js');
            emitGaugeEvent(
                { id: enhancedAudit.skill },
                {
                    category: 'audit_complete',
                    delta: enhancedAudit.feedback.scoreChange || 0,
                    confidence: enhancedAudit.overall,
                    summary: `Re-audit of ${target}: ${enhancedAudit.feedback.resolution}`
                },
                { priority: enhancedAudit.overall < 0.5 ? 'high' : 'medium' }
            );
            console.log(chalk.cyan('📡 GAUGE_EVENT emitted to ecosystem'));
        } catch {
            // Event bus not available, continue without emission
        }

        return enhancedAudit;

    } catch (error) {
        console.log(chalk.red(`✗ Re-audit failed: ${error.message}`));
        throw error;
    }
}

/**
 * Determine resolution status based on re-audit results
 */
function determineResolution(audit, gaugeContext) {
    if (!gaugeContext?.previousScore) {
        return 'BASELINE_ESTABLISHED';
    }

    const delta = audit.overall - gaugeContext.previousScore;

    if (delta > 0.1) {
        return 'IMPROVED';
    } else if (delta < -0.1) {
        return 'DEGRADED';
    } else if (audit.overall >= 0.7) {
        return 'STABLE_HEALTHY';
    } else {
        return 'STABLE_AT_RISK';
    }
}

/**
 * Batch re-audit: Process multiple skills from a manifest
 * @param {Array<{name: string, source?: string, version?: string}>} manifest
 * @param {Object} options
 * @returns {Promise<Array>} Results array
 */
export async function batchReaudit(manifest, options = {}) {
    console.log(chalk.bold.cyan(`\n🔄 Batch Re-Audit: ${manifest.length} skills\n`));

    const results = [];

    for (const item of manifest) {
        try {
            const result = await executeReaudit(item.name, {
                source: item.source,
                version: item.version,
                triggerReason: 'batch_reaudit',
                gaugeContext: options.gaugeContext
            });
            results.push({ skill: item.name, status: 'success', audit: result });
        } catch (error) {
            results.push({ skill: item.name, status: 'failed', error: error.message });
        }
    }

    // Summary
    const passed = results.filter(r => r.status === 'success' && r.audit.overall >= 0.7).length;
    const warned = results.filter(r => r.status === 'success' && r.audit.overall < 0.7).length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(chalk.bold('\n📊 Batch Summary'));
    console.log(chalk.green(`  ✓ Passed: ${passed}`));
    console.log(chalk.yellow(`  ⚠ At Risk: ${warned}`));
    console.log(chalk.red(`  ✗ Failed: ${failed}`));

    return results;
}

export { THRESHOLDS };
