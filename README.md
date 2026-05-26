# 🤖 Autonomous AI Agent Runtime (Zero-Dependency)

A production-grade, fully autonomous AI Agent runtime built from scratch using **TypeScript**, **Node.js**, and the **Vercel AI SDK**. This system moves beyond basic prompt engineering into a true **Agentic Workflow**—capable of dynamic reasoning, multi-step tool execution, memory compaction, and automated evaluation benchmarking.

---

## 🚀 Core Features & Architecture

The architecture implements a strict **Reasoning and Acting (ReAct)** loop. The agent evaluates user intent, selects appropriate system tools, parses their outputs, and self-corrects autonomously until the objective is reached.

### 🛠️ 1. Native System Tools (Strictly Typed)
All tools are secured using **Zod** schemas for runtime type safety, ensuring the LLM passes perfect arguments:
* **Dynamic File System Operations (`file.ts`):** Autonomous Local Workspace I/O (Read, Write, List, Delete files securely).
* **System Level Command Execution (`shell.ts`):** Safely spins up execution tasks inside the host environment (e.g., executing `git status` and parsing the architecture tree).
* **Real-Time Web Search (`webSearch.ts`):** Powered by the **Tavily API** to bypass traditional scraping limitations, delivering clean contextual data with formatted markdown source citations.
* **Temporal Awareness (`dateTime.ts`):** Keeps the agent anchored to real-time temporal baselines.

### 🧠 2. Advanced Context Management & Compaction
To prevent context window explosion and reduce token costs, the runtime features a custom **compaction layer (`compaction.ts`)**. When system logs or tool outputs cross defined threshold limits (`modelLimits.ts`), the agent autonomously summarizes historical conversational context without losing critical state properties.

### 🧪 3. Production-Grade Evaluation Suite (`/evals`)
To measure agent accuracy and resilience against regression, the project includes an automated evaluation framework:
* **Single-Turn Evals (`evaluators.ts`):** Benchmarks instantaneous tool-calling accuracy, verifying that the LLM hits the correct function with exact inputs on the first attempt.
* **Multi-Turn Evals (`executors.ts` / `run-sequential-evals.cjs`):** Simulates complex, long-running agentic interactions where the agent must chain multiple tools sequentially (e.g., searching the web -> writing a local file -> running a terminal check) to validate overall task completion rates.

---

## 📦 Project Structure

```text
├── evals/
│   ├── evaluators.ts           # Assertions for tool-calling accuracy
│   ├── executors.ts            # Multi-turn evaluation scenario configurations
│   └── run-sequential-evals.cjs# Sequential testing automation script
├── src/
│   ├── agent/
│   │   ├── context/
│   │   │   ├── compaction.ts   # Context pruning & summarization logic
│   │   │   └── modelLimits.ts  # Token boundaries and constraints
│   │   ├── tools/
│   │   │   ├── dateTime.ts     # Temporal utility tool
│   │   │   ├── file.ts         # Secure workspace File I/O tool
│   │   │   ├── index.ts        # Tool registry and export configurations
│   │   │   ├── shell.ts        # Host terminal execution tool
│   │   │   └── webSearch.ts    # Tavily API web search integration
│   │   ├── executeTool.ts      # Main tool execution router
│   │   └── run.ts              # Agentic loop core runtime
│   └── config/                 # System and model configurations
├── .env.example                # Blueprint for required environment variables
├── package.json                # Dependencies and project scripts
└── tsconfig.json               # TypeScript compiler options
```

## 🛠️ Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm/pnpm installed.

### 2. Installation
Clone the repository and install the production dependencies:

```bash
git clone https://github.com/samii999/AI-Agent.git
cd AI-Agent
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):

```env
OPENAI_API_KEY=your_openai_key_here
TAVILY_API_KEY=your_tavily_key_here
```

**Note:** The `.env` file is explicitly ignored in `.gitignore` to protect sensitive runtime credentials.

### 4. Running the Agent Interactively
Launch the clean, instructor-style terminal interface:

```bash
npm run start
```

### 5. Running the Evaluation Suite
Execute the multi-turn automated evaluation pipeline to benchmark agent performance:

```bash
npm run eval
```

## 🎯 Architectural Intent & Insights

This runtime was built to analyze how AI agents handle ambiguity. By abstracting tool call diagnostics and API payloads under the hood, the system delivers a clean command-line experience while preserving high-fidelity auditing data for developers behind the scenes.

**Special thanks to Scott Moss and Frontend Masters** for providing the core foundations of robust, production-ready agentic software engineering.

---

## 📄 License

ISC

## ⚠️ Disclaimer

This agent has the ability to execute system commands and modify files. Use within isolated development environments only. The authors assume no liability for unintended system modifications or data loss.
```
