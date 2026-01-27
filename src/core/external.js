/**
 * External Skill Auditor
 * Fetches and normalizes external skills for MERIT-based verification.
 * 
 * @module resonance-kit/core/external
 */

import chalk from 'chalk';

/**
 * Skill Schema - Normalized format for external skills
 * @typedef {Object} NormalizedSkill
 * @property {string} name - Skill name
 * @property {string} source - Origin (context7, github, local)
 * @property {string} version - Version string if available
 * @property {string} content - Raw documentation/skill content
 * @property {Object} metadata - Source metadata
 * @property {Date} fetchedAt - Timestamp of fetch
 */

/**
 * Fetch external skill from URL or MCP source
 * @param {string} target - URL, library name, or local path
 * @param {Object} options - Fetch options
 * @param {string} options.source - Source type: context7, github, local
 * @returns {Promise<NormalizedSkill>}
 */
export async function fetchExternalSkill(target, options = {}) {
    const source = options.source || detectSource(target);

    console.log(chalk.gray(`  Fetching from ${source}: ${target}`));

    switch (source) {
        case 'context7':
            return await fetchFromContext7(target, options);
        case 'github':
            return await fetchFromGitHub(target, options);
        case 'local':
            return await fetchFromLocal(target, options);
        case 'url':
            return await fetchFromUrl(target, options);
        default:
            throw new Error(`Unknown source: ${source}`);
    }
}

/**
 * Detect source type from target string
 */
function detectSource(target) {
    if (target.startsWith('http://') || target.startsWith('https://')) {
        if (target.includes('github.com') || target.includes('raw.githubusercontent.com')) {
            return 'github';
        }
        return 'url';
    }
    if (target.startsWith('/') || target.startsWith('./')) {
        return 'local';
    }
    // Assume bare name is Context7 library lookup
    return 'context7';
}

/**
 * Fetch from Context7 MCP (delegated to plugin)
 */
async function fetchFromContext7(libraryName, options) {
    // Lazy import to avoid circular dependency
    const { fetchContext7Docs } = await import('../plugins/context7.js');
    const docs = await fetchContext7Docs(libraryName, options.version);

    return normalizeSkillFormat({
        name: libraryName,
        source: 'context7',
        version: options.version || 'latest',
        content: docs,
        metadata: { provider: 'context7', libraryName }
    });
}

/**
 * Fetch from GitHub raw content
 */
async function fetchFromGitHub(url, options) {
    const rawUrl = url.replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');

    const response = await fetch(rawUrl);
    if (!response.ok) {
        throw new Error(`GitHub fetch failed: ${response.status}`);
    }
    const content = await response.text();

    return normalizeSkillFormat({
        name: extractNameFromUrl(url),
        source: 'github',
        version: extractVersionFromUrl(url),
        content,
        metadata: { url, rawUrl }
    });
}

/**
 * Fetch from arbitrary URL
 */
async function fetchFromUrl(url, options) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`URL fetch failed: ${response.status}`);
    }
    const content = await response.text();

    return normalizeSkillFormat({
        name: extractNameFromUrl(url),
        source: 'url',
        version: 'unknown',
        content,
        metadata: { url }
    });
}

/**
 * Fetch from local filesystem
 */
async function fetchFromLocal(path, options) {
    const fs = await import('fs/promises');
    const content = await fs.readFile(path, 'utf-8');
    const name = path.split('/').pop().replace(/\.\w+$/, '');

    return normalizeSkillFormat({
        name,
        source: 'local',
        version: 'local',
        content,
        metadata: { path }
    });
}

/**
 * Normalize skill to standard format
 */
export function normalizeSkillFormat(skill) {
    return {
        name: skill.name || 'unknown',
        source: skill.source || 'unknown',
        version: skill.version || 'unknown',
        content: skill.content || '',
        metadata: skill.metadata || {},
        fetchedAt: new Date()
    };
}

/**
 * Audit external skill against MERIT principles
 * @param {NormalizedSkill} skill
 * @returns {Object} Audit result with MERIT scores
 */
export function auditExternalSkill(skill) {
    const audit = {
        skill: skill.name,
        source: skill.source,
        version: skill.version,
        timestamp: new Date().toISOString(),
        merit: {
            measurable: checkMeasurable(skill),
            explicit: checkExplicit(skill),
            reversible: checkReversible(skill),
            informed: checkInformed(skill),
            transparent: checkTransparent(skill)
        },
        overall: null,
        warnings: [],
        recommendations: []
    };

    // Calculate overall score
    const scores = Object.values(audit.merit);
    audit.overall = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Add warnings based on audit
    if (audit.merit.transparent < 0.5) {
        audit.warnings.push('Low transparency: source provenance unclear');
    }
    if (audit.merit.informed < 0.5) {
        audit.warnings.push('Low informed score: insufficient context for decisions');
    }
    if (skill.version === 'unknown') {
        audit.warnings.push('Version unknown: cannot ensure API compatibility');
    }

    // Add recommendations
    if (audit.overall < 0.7) {
        audit.recommendations.push('Consider manual review before production use');
    }
    if (skill.source === 'url') {
        audit.recommendations.push('Pin to specific version or commit for reproducibility');
    }

    return audit;
}

// MERIT Check Implementations

function checkMeasurable(skill) {
    // Check if skill has quantifiable outcomes or metrics
    const hasMetrics = /\b(metric|score|count|time|rate|percent|%|ms|kb|mb)\b/i.test(skill.content);
    const hasExamples = /```|example|usage/i.test(skill.content);
    return (hasMetrics ? 0.5 : 0) + (hasExamples ? 0.5 : 0);
}

function checkExplicit(skill) {
    // Check if skill has clear, unambiguous instructions
    const hasHeadings = /^#{1,3}\s/m.test(skill.content);
    const hasSteps = /\b(step\s*\d|first|then|finally|1\.|2\.)/i.test(skill.content);
    const wordCount = skill.content.split(/\s+/).length;
    const isSubstantial = wordCount > 100;
    return (hasHeadings ? 0.33 : 0) + (hasSteps ? 0.33 : 0) + (isSubstantial ? 0.34 : 0);
}

function checkReversible(skill) {
    // Check if skill documents rollback/undo options
    const hasRollback = /\b(rollback|undo|revert|restore|fallback|downgrade)\b/i.test(skill.content);
    const hasWarnings = /\b(warning|caution|note|important|breaking)\b/i.test(skill.content);
    return (hasRollback ? 0.6 : 0.2) + (hasWarnings ? 0.4 : 0);
}

function checkInformed(skill) {
    // Check if skill provides sufficient context
    const hasPrerequisites = /\b(require|prerequisite|dependency|install|setup)\b/i.test(skill.content);
    const hasLinks = /https?:\/\/|see also|reference/i.test(skill.content);
    const hasVersion = skill.version !== 'unknown';
    return (hasPrerequisites ? 0.4 : 0) + (hasLinks ? 0.3 : 0) + (hasVersion ? 0.3 : 0);
}

function checkTransparent(skill) {
    // Check if source is trustworthy and traceable
    const trustedSources = ['context7', 'github'];
    const isTrusted = trustedSources.includes(skill.source);
    const hasMetadata = Object.keys(skill.metadata).length > 1;
    const hasProvenance = skill.metadata.url || skill.metadata.libraryName || skill.metadata.path;
    return (isTrusted ? 0.5 : 0.2) + (hasMetadata ? 0.25 : 0) + (hasProvenance ? 0.25 : 0);
}

// Utility functions

function extractNameFromUrl(url) {
    const parts = url.split('/');
    const filename = parts.pop() || parts.pop();
    return filename.replace(/\.\w+$/, '');
}

function extractVersionFromUrl(url) {
    const versionMatch = url.match(/\/v?(\d+\.\d+(?:\.\d+)?)\//);
    return versionMatch ? versionMatch[1] : 'unknown';
}
