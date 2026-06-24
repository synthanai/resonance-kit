/**
 * Context7 MCP Plugin
 * Integration with Context7 for fetching versioned library documentation.
 * 
 * @module resonance-kit/plugins/context7
 */

import chalk from 'chalk';

/**
 * Context7 MCP Configuration
 */
const CONTEXT7_CONFIG = {
    baseUrl: 'https://context7.com/api',
    mcpEndpoint: 'mcp://context7',
    timeout: 10000,
    retries: 2
};

/**
 * Library registry cache (in-memory for session)
 */
const libraryCache = new Map();

/**
 * Resolve library name to Context7 ID
 * @param {string} name - Library name (e.g., "react", "tailwind", "better-auth")
 * @returns {Promise<string|null>} Library ID or null if not found
 */
export async function resolveLibraryId(name) {
    // Check cache first
    if (libraryCache.has(name)) {
        return libraryCache.get(name);
    }

    console.log(chalk.gray(`  Resolving library: ${name}`));

    try {
        // Simulate MCP call (in production, use actual MCP client)
        const response = await fetchWithRetry(
            `${CONTEXT7_CONFIG.baseUrl}/resolve?name=${encodeURIComponent(name)}`
        );

        if (response.ok) {
            const data = await response.json();
            if (data.libraryId) {
                libraryCache.set(name, data.libraryId);
                return data.libraryId;
            }
        }

        // Fallback: Use name as ID (many libs use name directly)
        libraryCache.set(name, name);
        return name;

    } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not resolve ${name}, using name as ID`));
        libraryCache.set(name, name);
        return name;
    }
}

/**
 * Fetch library documentation from Context7
 * @param {string} libraryName - Library name or ID
 * @param {string} [version] - Specific version (default: latest)
 * @returns {Promise<string>} Documentation content
 */
export async function fetchContext7Docs(libraryName, version = 'latest') {
    const libraryId = await resolveLibraryId(libraryName);

    console.log(chalk.gray(`  Fetching docs: ${libraryId}@${version}`));

    try {
        // Primary: Try Context7 API
        const response = await fetchWithRetry(
            `${CONTEXT7_CONFIG.baseUrl}/docs/${encodeURIComponent(libraryId)}?version=${version}`
        );

        if (response.ok) {
            const data = await response.json();
            return data.content || data.docs || '';
        }

        // Fallback: Try llms.txt endpoint
        return await fetchLlmsTxt(libraryId);

    } catch (error) {
        console.log(chalk.yellow(`  ⚠ Context7 unavailable, attempting fallback...`));
        return await fetchFallbackDocs(libraryName);
    }
}

/**
 * Fetch llms.txt file for a library
 * Context7's optimized documentation format
 */
async function fetchLlmsTxt(libraryId) {
    try {
        const response = await fetchWithRetry(
            `${CONTEXT7_CONFIG.baseUrl}/llms/${encodeURIComponent(libraryId)}.txt`
        );

        if (response.ok) {
            return await response.text();
        }
    } catch (error) {
        // Silently fail, will use fallback
    }

    throw new Error('llms.txt not available');
}

/**
 * Fallback: Fetch from common documentation sources
 */
async function fetchFallbackDocs(libraryName) {
    const fallbackUrls = [
        `https://raw.githubusercontent.com/${libraryName}/${libraryName}/main/README.md`,
        `https://raw.githubusercontent.com/${libraryName}/${libraryName}/master/README.md`,
        `https://unpkg.com/${libraryName}/README.md`
    ];

    for (const url of fallbackUrls) {
        try {
            const response = await fetch(url, { timeout: 5000 });
            if (response.ok) {
                console.log(chalk.gray(`  ✓ Fallback succeeded: ${url}`));
                return await response.text();
            }
        } catch (error) {
            // Try next fallback
        }
    }

    // Last resort: Return minimal info
    return `# ${libraryName}\n\n> Documentation could not be fetched.\n> Please verify the library name and try again.`;
}

/**
 * Fetch with retry and timeout
 */
async function fetchWithRetry(url, options = {}) {
    const { retries = CONTEXT7_CONFIG.retries, timeout = CONTEXT7_CONFIG.timeout } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;

        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 100));
        }
    }
}

/**
 * Check if Context7 MCP is available
 * @returns {Promise<boolean>}
 */
export async function isContext7Available() {
    try {
        const response = await fetchWithRetry(
            `${CONTEXT7_CONFIG.baseUrl}/health`,
            { timeout: 3000, retries: 0 }
        );
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Get Context7 statistics
 * @returns {Promise<Object>} Stats including library count, last updated
 */
export async function getContext7Stats() {
    try {
        const response = await fetchWithRetry(`${CONTEXT7_CONFIG.baseUrl}/stats`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        // Return cached/default stats
    }

    return {
        libraries: 24000,
        repos: 65000,
        lastUpdated: 'unknown',
        note: 'Stats unavailable, using cached values'
    };
}
