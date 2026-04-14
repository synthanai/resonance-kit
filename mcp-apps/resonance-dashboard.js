/**
 * Resonance-Kit MCP Apps: AI-Readiness Dashboard
 * 
 * Interactive UI for visualizing codebase AI-readiness scores.
 * Displays context cost, cohesion, and resonance metrics.
 * 
 * @see https://modelcontextprotocol.github.io/ext-apps/api/
 */

/**
 * Generate the Resonance Dashboard HTML
 */
export function generateResonanceDashboardUI(options = {}) {
    const {
        repoName = '',
        scores = {
            resonance: 0,
            contextCost: 0,
            cohesion: 0,
            dmCompliance: 0
        },
        status = 'pending'
    } = options;

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resonance Dashboard</title>
    <style>
        :root {
            --bg-primary: #1e1e1e;
            --bg-secondary: #252526;
            --text-primary: #ffffff;
            --text-muted: #858585;
            --accent: #8b5cf6;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 16px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 16px;
        }
        
        .header-icon { font-size: 1.5rem; }
        
        .header-title {
            font-size: 1rem;
            font-weight: 600;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .repo-name {
            font-size: 0.75rem;
            color: var(--text-muted);
            font-family: monospace;
            margin-top: 4px;
        }
        
        .main-score {
            display: flex;
            justify-content: center;
            margin: 20px 0;
        }
        
        .score-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: conic-gradient(
                var(--score-color) calc(var(--score) * 3.6deg),
                var(--bg-secondary) 0
            );
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .score-inner {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: var(--bg-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .score-value {
            font-size: 1.5rem;
            font-weight: 700;
        }
        
        .score-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            text-transform: uppercase;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin: 16px 0;
        }
        
        .metric-card {
            background: var(--bg-secondary);
            padding: 12px 8px;
            border-radius: 8px;
            text-align: center;
        }
        
        .metric-value {
            font-size: 1.1rem;
            font-weight: 700;
        }
        
        .metric-bar {
            height: 4px;
            background: transparent;
            border-radius: 2px;
            margin: 6px 0;
            overflow: hidden;
        }
        
        .metric-fill {
            height: 100%;
            border-radius: 2px;
            transition: width 0.5s;
        }
        
        .metric-label {
            font-size: 0.65rem;
            color: var(--text-muted);
        }
        
        .action-btn {
            display: block;
            width: 100%;
            padding: 10px;
            margin-top: 16px;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .action-btn:hover {
            transform: scale(1.02);
        }
        
        .footer {
            margin-top: 12px;
            text-align: center;
            font-size: 0.7rem;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="header-icon">📊</span>
        <div class="header-title">Resonance Report</div>
        <div class="repo-name" id="repo-name">${repoName || 'No repository selected'}</div>
    </div>
    
    <div class="main-score">
        <div class="score-circle" style="--score: ${scores.resonance}; --score-color: ${getScoreColor(scores.resonance)}">
            <div class="score-inner">
                <span class="score-value" id="main-score">${scores.resonance}</span>
                <span class="score-label">Resonance</span>
            </div>
        </div>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value" id="context-cost">${scores.contextCost}%</div>
            <div class="metric-bar">
                <div class="metric-fill" style="width: ${scores.contextCost}%; background: ${getScoreColor(scores.contextCost)}"></div>
            </div>
            <div class="metric-label">Context Cost</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="cohesion">${scores.cohesion}%</div>
            <div class="metric-bar">
                <div class="metric-fill" style="width: ${scores.cohesion}%; background: ${getScoreColor(scores.cohesion)}"></div>
            </div>
            <div class="metric-label">Cohesion</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="dms-compliance">${scores.dmCompliance}%</div>
            <div class="metric-bar">
                <div class="metric-fill" style="width: ${scores.dmCompliance}%; background: ${getScoreColor(scores.dmCompliance)}"></div>
            </div>
            <div class="metric-label">DMS Compliance</div>
        </div>
    </div>
    
    <button class="action-btn" onclick="sendMessage('Run full resonance audit')">
        Run Full Audit
    </button>
    
    <div class="footer">Resonance-Kit — AI-Ready Codebase Protocol</div>
    
    <script>
        function sendMessage(text) {
            window.parent.postMessage({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'ui/message',
                params: { content: [{ type: 'text', text }] }
            }, '*');
        }
        
        window.addEventListener('message', (event) => {
            const { data } = event;
            if (data.method === 'ui/notifications/tool-input') {
                const args = data.params?.arguments || {};
                if (args.repoName) {
                    document.getElementById('repo-name').textContent = args.repoName;
                }
                if (args.scores) {
                    updateScores(args.scores);
                }
            }
        });
        
        function updateScores(scores) {
            document.getElementById('main-score').textContent = scores.resonance || 0;
            document.getElementById('context-cost').textContent = (scores.contextCost || 0) + '%';
            document.getElementById('cohesion').textContent = (scores.cohesion || 0) + '%';
            document.getElementById('dms-compliance').textContent = (scores.dmCompliance || 0) + '%';
        }
    </script>
</body>
</html>`;
}

/**
 * Register Resonance-Kit MCP Apps resources
 */
export function registerResonanceAppsResources(server) {
    server.resource(
        "resonance-dashboard",
        "ui://resonance-kit/dashboard",
        {
            description: "AI-readiness resonance dashboard with scores",
            mimeType: "text/html;profile=mcp-app"
        },
        async () => ({
            contents: [{
                mimeType: "text/html;profile=mcp-app",
                text: generateResonanceDashboardUI()
            }]
        })
    );
}

export default { generateResonanceDashboardUI, registerResonanceAppsResources };
