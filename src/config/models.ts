export const MODELS = {
    BRAIN: process.env.AGENT_BRAIN_MODEL || 'llama-3.3-70b-versatile',
    TOOL: process.env.AGENT_TOOL_MODEL || 'qwen/qwen3-32b',
    FAST: process.env.AGENT_FAST_MODEL || 'llama-3.1-8b-instant',
    CONTEXT: process.env.AGENT_CONTEXT_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
    BACKUP: process.env.AGENT_BACKUP_MODEL || 'gemini-3.1-flash-lite'
} as const;

export const SETTINGS = {
    TEMPERATURE: parseFloat(process.env.TEMPERATURE ?? "0"),
    MAX_STEPS: parseInt(process.env.MAX_STEPS ?? "10")
} as const;

export const getModel = (type: keyof typeof MODELS) => MODELS[type];
export const getSetting = <K extends keyof typeof SETTINGS>(key: K) => SETTINGS[key];
