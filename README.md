# Resonance Kit

> AI-Readiness & DMS Compliance Auditor for the SYNTHAI Ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

**Resonance Kit** is a specialized code analysis tool designed to optimize codebases for AI model comprehension and Decision Moment Standard (DMS) compliance. It extends the concepts of generic AI-readiness tools with SYNTHAI-specific checks.

### Core Features

| Feature | Description |
|:---|:---|
| **Context Analysis** | Token consumption metrics to fit within LLM context windows |
| **Pattern Detection** | Consistency checks for naming, error handling, and exports |
| **DMS Plugin** | Heptagon coverage & MERIT compliance verification |

## Installation

```bash
npm install
npm link  # Makes 'resonance' command available globally
```

## Usage

```bash
# Full ecosystem scan with DMS checks
resonance scan ../spar-kit --dms

# Context-only analysis
resonance context ../agentic-kit --max-context 5000

# DMS compliance check
resonance dms ../vault-kit
```

## Architecture

```
resonance-kit/
├── bin/resonance.js      # CLI entry point
├── src/
│   ├── core/
│   │   ├── context.js    # Token counting (AIReady-compatible)
│   │   ├── patterns.js   # Consistency analysis
│   │   └── external.js   # External skill fetcher & MERIT auditor
│   ├── plugins/
│   │   ├── dms.js        # SYNTHAI-specific Heptagon/MERIT
│   │   └── context7.js   # Context7 MCP integration
│   └── reports/
│       └── resonance.js  # Report generator
```

---

## 🔐 Verified Skills

Audit external skills and documentation against MERIT principles before trusting them.

```bash
# Audit a library from Context7
resonance external react --source context7 --version 18

# Audit from GitHub
resonance external https://github.com/vercel/next.js/blob/main/docs/README.md

# Audit local skill file
resonance external ./my-workflow.md --source local

# Output as Markdown report
resonance external tailwind -o md > tailwind-audit.md
```

### MERIT Assessment

| Principle | What We Check |
|-----------|---------------|
| **M**easurable | Metrics, examples, quantifiable outcomes |
| **E**xplicit | Clear headings, step-by-step instructions |
| **R**eversible | Rollback options, warnings, breaking changes |
| **I**nformed | Prerequisites, dependencies, context links |
| **T**ransparent | Source provenance, version tracking |

---

## Methodology

This kit implements the **Fork-and-Extend** model:

1. **Core Logic**: Inspired by `@aiready/cli` (MIT Licensed)
2. **DMS Extension**: Custom Heptagon & MERIT compliance checks
3. **Verified Skills**: Context7 integration for external skill auditing
4. **Ecosystem Integration**: Native to SYNTHAI repository standards

See: [AIReady Deep Analysis](../../.gemini/antigravity/brain/d0b97ad2-7ced-47bb-b0c9-b595de9c4c3b/aiready_deep_analysis.md)

## License

MIT © SYNTHAI

