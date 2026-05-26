import { streamText, type ModelMessage } from "ai";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { getTracer } from "@lmnr-ai/lmnr";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTool.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import { Laminar } from "@lmnr-ai/lmnr";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import {
    estimateMessagesTokens,
    getModelLimits,
    isOverThreshold,
    calculateUsagePercentage,
    compactConversation,
    DEFAULT_THRESHOLD,

} from './context/index.ts'


import { filterCompatibleMessages } from "./system/filterMessages.ts";
import { getModel } from "../config/models.ts";
import { TokenUsage } from "../ui/components/TokenUsage.tsx";
import { report } from "process";

Laminar.initialize({
  projectApiKey: process.env.LMNR_API_KEY,
});

// Use BRAIN_3 for the agent's main runtime (configured via AGENT_BRAIN_3)
const MODEL_NAME = getModel('BRAIN_3');
const BACKUP_MODEL = getModel('BACKUP');

// Groq/OpenAI-compatible factory for Groq API (qwen models)
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

function providerForModel(modelName: string) {
    if (!modelName) return google(modelName);
    const lower = modelName.toLowerCase();
    if (lower.includes('qwen') || lower.includes('groq')) return groq(modelName);
    if (lower.includes('gemini') || lower.includes('google')) return google(modelName);
    // default to google provider
    return google(modelName);
}

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<ModelMessage[]> {
    const modelLimits = getModelLimits(MODEL_NAME);



    const workingHistory = filterCompatibleMessages(conversationHistory);
    
    let messages: ModelMessage[] = [{
        role: "system",
        content: SYSTEM_PROMPT
    }, 
    ...workingHistory,

    {role: "user", content: userMessage}
     
    ];
    const precheckTokens= estimateMessagesTokens(messages);

    if (isOverThreshold(precheckTokens.total, modelLimits.contextWindow)) {
        messages = await compactConversation(workingHistory, MODEL_NAME);
    }

    let fullResponse = "";


    // Use currentModel so we can switch to a backup on quota errors
    let currentModel = MODEL_NAME;
    let triedBackup = false;

    while (true) {
        let result: any;
        try {
            result = streamText({
                model: providerForModel(currentModel),
                messages,
                tools,
                experimental_telemetry: {
                    isEnabled: true,
                    tracer: getTracer(),
                },
            });
        } catch (err: any) {
            // If it's a quota/rate-limit error from Gemini, try a single fallback model
            const isQuota = err?.reason === 'maxRetriesExceeded' || err?.message?.includes('quota') || err?.statusCode === 429;
            if (isQuota && !triedBackup && BACKUP_MODEL && BACKUP_MODEL !== currentModel) {
                triedBackup = true;
                currentModel = BACKUP_MODEL;
                callbacks.onToken?.('\n[Using backup model due to provider quota limits]\n');
                continue; // retry the loop with backup model
            }

            throw err;
        }

        const reportTokenUsage = async () => {
            if (callbacks.onTokenUsage) {
                const usage = estimateMessagesTokens(messages);
                callbacks.onTokenUsage({
                    inputTokens: usage.input,
                    outputTokens: usage.output,
                    totalTokens: usage.total,
                    contextWindow: modelLimits.contextWindow,
                        percentage: calculateUsagePercentage(usage.total, modelLimits.contextWindow),
                        threshold: DEFAULT_THRESHOLD,

                });
            }

        }


        const toolcalls: ToolCallInfo[] = [];
        let currentText = "";
        let streamError: Error | null = null;


        try {
            for await (const chunk of result.fullStream) {
                if (chunk.type === "text-delta") {
                    currentText += chunk.text;
                    callbacks.onToken?.(chunk.text);
                }

                if (chunk.type === "tool-call") {
                    const input = 'input' in chunk ? chunk.input : {};
                    toolcalls.push({
                        toolCallId: chunk.toolCallId,
                        toolName: chunk.toolName,
                        args: input as any,
                    })

                    callbacks.onToolCallStart(chunk.toolName, input);
                }
            }
        } catch (e) {
            streamError = e as Error;

            if(!currentText && !streamError.message.includes("no output generated")) {
                throw streamError;
            }
        }
        fullResponse += currentText;

        if (streamError && !currentText) {
            fullResponse = "sorry about that, something went wrong";

            callbacks.onToken(fullResponse);
            return messages;
        }

        const finishReason =await result.finishReason;

        if (finishReason !== 'tool-calls' || toolcalls.length === 0) {
            const responseMessages = await result.response;
            messages.push(...responseMessages.messages);
            
            reportTokenUsage();

            callbacks.onComplete(fullResponse);
            return messages;
           
        }
        const responseMessages = await result.response;

        messages.push(...responseMessages.messages);

        let rejected = false;

        for (const tc of toolcalls) {
            const approved = await callbacks.onToolApproval(tc.toolName, tc.args);

            if (!approved) {
                rejected = true;
                callbacks.onToolCallEnd(tc.toolName, "Tool call rejected by user");
                break;
            }

            try {
                result = await executeTool(tc.toolName, tc.args);
                callbacks.onToolCallEnd(tc.toolName, result);
            } catch (error) {
                result = `Error executing tool ${tc.toolName}: ${error}`;
                callbacks.onToolCallEnd(tc.toolName, result);
            }

            messages.push({
                role: "tool",
                content: [{
                    type: 'tool-result',
                    toolCallId: tc.toolCallId,
                    toolName: tc.toolName,
                    output: {
                        type: 'text',
                        value: result,
                    }
                }]
            });

            await reportTokenUsage();
        }

        if (rejected) {
            callbacks.onComplete(fullResponse);
            return messages;
        }

        await new Promise((resolve) => setTimeout(resolve, 4000));

       // Continue the loop to let AI respond to tool results
        
    }

    // This should never be reached, but TypeScript requires it
    return messages;
}
   
