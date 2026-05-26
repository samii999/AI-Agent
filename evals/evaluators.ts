import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

import type {
  EvalTarget,
  SingleTurnResult,
  MultiTurnTarget,
  MultiTurnResult,
} from "./types.ts";
import { getModel } from "../src/config/models.ts";

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const judgeSchema = z.object({
  score: z.number().min(1).max(10).describe("Score from 1 to 10 where 1 is worst and 10 is best"),
  reason: z.string().describe("Brief reasoning for the score"),
});


export const llmjudge = async (output: MultiTurnResult, target: MultiTurnTarget) => {
  const result = await generateObject({
    model: google(getModel('BRAIN_3')),
    schema: judgeSchema,
    schemaName: 'evaluation',
    schemaDescription: 'Evaluate the quality of the response',
    messages: [
      {
        role: 'system',
        content: `
          You are an expert evaluator. Score the agents response on a scale of 1-10.
          Scoring critiria:
          - 10: Response fully addresses the query with accurate, complete, and clear information
          - 7-9: Response addresses the query with minor issues
          - 4-6: Response addresses the query with significant issues
          - 1-3: Response does not address the query
        `
      },
      {
        role: 'user',
        content: `task: ${target.originalTask}
        
        Tools Called: ${JSON.stringify(output.toolCallOrder)}
        Tool Results provided: ${JSON.stringify(target.mockToolResults)}

        Agent's final answer: ${output.text}

        Evaluate if this response correctly uses the tool results to answer the task.
        `,
      }
    ],

  });
  
  return result.object.score / 10;
 
};

export function toolsSelected(
  output: SingleTurnResult | MultiTurnResult,
  target: EvalTarget | MultiTurnTarget,
): number {
  const expectedTools =
    "expectedTools" in target
      ? target.expectedTools
      : "expectedToolOrder" in target
        ? target.expectedToolOrder
        : undefined;

  if (!expectedTools?.length) return 1;

  const selected = new Set(
    "toolNames" in output ? output.toolNames : output.toolsUsed,
  );

  return expectedTools.every((t) => selected.has(t)) ? 1 : 0;
}

/**
 * Evaluator: Check if forbidden tools were avoided.
 * Returns 1 if NONE of the forbidden tools are in the output, 0 otherwise.
 * For negative prompts.
 */
export function toolsAvoided(
  output: SingleTurnResult | MultiTurnResult,
  target: EvalTarget | MultiTurnTarget,
): number {
  if (!target.forbiddenTools?.length) return 1;

  const selected = new Set(
    "toolNames" in output ? output.toolNames : output.toolsUsed,
  );

  return target.forbiddenTools.some((t) => selected.has(t)) ? 0 : 1;
}

/**
 * Evaluator: Precision/recall score for tool selection.
 * Returns a score between 0 and 1 based on correct selections.
 * For secondary prompts.
 */
export function toolSelectionScore(
  output: SingleTurnResult,
  target: EvalTarget,
): number {
  if (!target.expectedTools?.length) {
    return output.selectedAny ? 0.5 : 1;
  }

  const expected = new Set(target.expectedTools);
  const selected = new Set(output.toolNames);

  const hits = output.toolNames.filter((t) => expected.has(t)).length;
  const precision = selected.size > 0 ? hits / selected.size : 0;
  const recall = expected.size > 0 ? hits / expected.size : 0;

  // Simple F1-ish score
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Evaluator: Check if tools were called in the expected order.
 * Returns the fraction of expected tools found in sequence.
 * Order matters but tools don't need to be consecutive.
 */
export function toolOrderCorrect(
  output: MultiTurnResult,
  target: MultiTurnTarget,
): number {
  if (!target.expectedToolOrder?.length) return 1;

  const actualOrder = output.toolCallOrder;

  // Check if expected tools appear in order (not necessarily consecutive)
  let expectedIdx = 0;
  for (const toolName of actualOrder) {
    if (toolName === target.expectedToolOrder[expectedIdx]) {
      expectedIdx++;
      if (expectedIdx === target.expectedToolOrder.length) break;
    }
  }

  return expectedIdx / target.expectedToolOrder.length;
}
