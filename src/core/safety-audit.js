/**
 * Safety Threshold Audit
 * 
 * Connects Resonance-Kit MERIT audits to Agentic-Kit agency routing.
 * When MERIT scores fall below thresholds, escalates to higher agency levels.
 * 
 * @module resonance-kit/safety-audit
 */

import chalk from 'chalk';

/**
 * Safety thresholds for agency escalation
 * Based on MERIT scores from Resonance-Kit audits
 */
export const SAFETY_THRESHOLDS = {
    // Above this = Doer can execute autonomously
    DOER_SAFE: 0.85,

    // Above this = Deliberator reviews, below escalates to Decider
    DELIBERATOR_SAFE: 0.60,

    // Below this = Decider (human judgment) required
    DECIDER_REQUIRED: 0.60,

    // Below this = HALT - do not proceed without explicit approval
    HALT: 0.30
};

/**
 * Audit categories and their weight in safety calculation
 */
const SAFETY_WEIGHTS = {
    M: 0.15,  // Modularity
    E: 0.25,  // Explainability (high weight - critical for safety)
    R: 0.20,  // Reliability
    I: 0.25,  // Integrity (high weight - trust signal)
    T: 0.15   // Transparency
};

/**
 * Calculate weighted safety score from MERIT audit
 * 
 * @param {Object} meritScores - Individual MERIT dimension scores
 * @returns {number} Weighted safety score 0-1
 */
export function calculateSafetyScore(meritScores) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [dimension, weight] of Object.entries(SAFETY_WEIGHTS)) {
        if (meritScores[dimension] !== undefined) {
            weightedSum += meritScores[dimension] * weight;
            totalWeight += weight;
        }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Determine required agency level based on safety score
 * 
 * @param {number} safetyScore - The calculated safety score
 * @returns {Object} Agency determination with level and reasoning
 */
export function determineAgencyLevel(safetyScore) {
    if (safetyScore >= SAFETY_THRESHOLDS.DOER_SAFE) {
        return {
            agency: 'doer',
            canAutoExecute: true,
            escalation: null,
            reasoning: `Safety score ${(safetyScore * 100).toFixed(0)}% exceeds Doer threshold (${SAFETY_THRESHOLDS.DOER_SAFE * 100}%)`
        };
    }

    if (safetyScore >= SAFETY_THRESHOLDS.DELIBERATOR_SAFE) {
        return {
            agency: 'deliberator',
            canAutoExecute: false,
            escalation: 'review_required',
            reasoning: `Safety score ${(safetyScore * 100).toFixed(0)}% requires Deliberator review`
        };
    }

    if (safetyScore >= SAFETY_THRESHOLDS.HALT) {
        return {
            agency: 'decider',
            canAutoExecute: false,
            escalation: 'human_judgment',
            reasoning: `Safety score ${(safetyScore * 100).toFixed(0)}% below Deliberator threshold - human judgment required`
        };
    }

    return {
        agency: 'halt',
        canAutoExecute: false,
        escalation: 'explicit_approval',
        reasoning: `Safety score ${(safetyScore * 100).toFixed(0)}% below HALT threshold - explicit approval required before proceeding`
    };
}

/**
 * Run safety threshold audit
 * 
 * @param {Object} audit - MERIT audit result from Resonance-Kit
 * @param {Object} options - Audit options
 * @returns {Object} Safety audit result with agency recommendation
 */
export function runSafetyAudit(audit, options = {}) {
    const { verbose = false, context = {} } = options;

    // Extract MERIT scores
    const meritScores = {
        M: audit.modularity ?? audit.M ?? null,
        E: audit.explainability ?? audit.E ?? null,
        R: audit.reliability ?? audit.R ?? null,
        I: audit.integrity ?? audit.I ?? null,
        T: audit.transparency ?? audit.T ?? null
    };

    // Calculate safety score
    const safetyScore = calculateSafetyScore(meritScores);

    // Determine agency
    const agencyDetermination = determineAgencyLevel(safetyScore);

    const result = {
        timestamp: new Date().toISOString(),
        auditSource: audit.skill || audit.source || 'unknown',
        meritScores,
        safetyScore,
        ...agencyDetermination,
        context
    };

    if (verbose) {
        console.log(chalk.bold.cyan('\n🛡️ Safety Threshold Audit'));
        console.log(chalk.gray(`Source: ${result.auditSource}`));
        console.log(chalk.gray(`Safety Score: ${(safetyScore * 100).toFixed(1)}%`));
        console.log(
            result.agency === 'halt' ? chalk.red(`Agency: ${result.agency.toUpperCase()}`) :
                result.agency === 'decider' ? chalk.yellow(`Agency: ${result.agency}`) :
                    chalk.green(`Agency: ${result.agency}`)
        );
        console.log(chalk.gray(`Reasoning: ${result.reasoning}\n`));
    }

    return result;
}

/**
 * Integrate with GAUGE event flow
 * Called when GAUGE_EVENT received with audit data
 * 
 * @param {Object} gaugeEvent - The GAUGE event
 * @returns {Object} Safety-enhanced event
 */
export function enhanceGaugeWithSafety(gaugeEvent) {
    // Check if event contains audit data
    if (!gaugeEvent.insight?.audit && !gaugeEvent.audit) {
        return gaugeEvent;
    }

    const audit = gaugeEvent.insight?.audit || gaugeEvent.audit;
    const safetyAudit = runSafetyAudit(audit, {
        context: { gaugeEventId: gaugeEvent.id }
    });

    return {
        ...gaugeEvent,
        safety: safetyAudit,
        agencyRecommendation: safetyAudit.agency
    };
}

/**
 * Create safety-aware action filter
 * Use this to wrap action execution with safety checks
 * 
 * @param {Function} action - The action to execute
 * @param {Object} safetyContext - Safety context including audit data
 * @returns {Function} Wrapped action with safety enforcement
 */
export function withSafetyEnforcement(action, safetyContext) {
    return async (...args) => {
        const safetyAudit = runSafetyAudit(safetyContext.audit || {});

        if (safetyAudit.agency === 'halt') {
            throw new Error(`HALT: ${safetyAudit.reasoning}`);
        }

        if (!safetyAudit.canAutoExecute && !safetyContext.approved) {
            throw new Error(`Escalation required: ${safetyAudit.reasoning}`);
        }

        return action(...args);
    };
}

export default {
    SAFETY_THRESHOLDS,
    calculateSafetyScore,
    determineAgencyLevel,
    runSafetyAudit,
    enhanceGaugeWithSafety,
    withSafetyEnforcement
};
