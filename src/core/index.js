/**
 * Resonance-Kit Core Exports
 * 
 * AI-Readiness & DMS Compliance Auditor
 * @module resonance-kit/core
 */

// Context Analysis
export { default as Context } from './context.js';

// External Tool Integration
export { default as External } from './external.js';

// Pattern Detection
export { default as Patterns } from './patterns.js';

// GAUGE Trigger (feedback loop)
export { default as GaugeTrigger } from './gauge-trigger.js';

// Plane-Aware Emission (C1/C2/C3)
export {
    PLANES,
    emit,
    formatC1,
    formatC2,
    formatC3,
    getPlaneExtension
} from './plane-emitter.js';

// Safety Threshold Audit (MERIT → Agency)
export {
    SAFETY_THRESHOLDS,
    calculateSafetyScore,
    determineAgencyLevel,
    runSafetyAudit,
    enhanceGaugeWithSafety,
    withSafetyEnforcement
} from './safety-audit.js';
