import type { ModelLimits } from "../../types.ts";

/**
 * Default threshold for context window usage (80%)
 */
export const DEFAULT_THRESHOLD = 0.8;

/**
 * Model limits registry for the models used by this project.
 * The active config uses Gemini-style models, so the registry is keyed that way.
 */
const MODEL_LIMITS: Record<string, ModelLimits> = {
  "gemini-3.1-flash-lite": {
    inputLimit: 983040,
    outputLimit: 65536,
    contextWindow: 1048576,
  },
};

/**
 * Default limits used when model is not found in registry
 */
const DEFAULT_LIMITS: ModelLimits = {
  inputLimit: 983040,
  outputLimit: 65536,
  contextWindow: 1048576,
};

/**
 * Get token limits for a specific model.
 * Falls back to default limits if model not found.
 * Matches Gemini variants (gemini-*, etc.)
 */
export function getModelLimits(model: string): ModelLimits {
  // Direct match
  if (MODEL_LIMITS[model]) {
    return MODEL_LIMITS[model];
  }

  // Check for Gemini variants
  if (model.startsWith("gemini")) {
    return MODEL_LIMITS["gemini-3.1-flash-lite"];
  }

  return DEFAULT_LIMITS;
}

/**
 * Check if token usage exceeds the threshold
 */
export function isOverThreshold(
  totalTokens: number,
  contextWindow: number,
  threshold: number = DEFAULT_THRESHOLD,
): boolean {
  return totalTokens >= contextWindow * threshold;
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(
  totalTokens: number,
  contextWindow: number,
): number {
  return (totalTokens / contextWindow) * 100;
}
