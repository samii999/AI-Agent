import "dotenv/config"
import { generateText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import {getTracer, Laminar} from '@lmnr-ai/lmnr'

import { tools } from './tools/index.js'
import { executeTools, type Toolname } from './executeTools.js'
import { SYSTEM_PROMPT } from "./system/prompt.js"
import type { AgentCallbacks } from '../types.js';
import { is } from "zod/locales"
import { getModel, getSetting } from '../config/models.js'

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL_NAME = getModel('BRAIN');

Laminar.initialize({
    projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

export const runAgent = async (
    userMessage: string, 
    conversationHistory: ModelMessage[] = [], 
    callbacks?: AgentCallbacks
): Promise<ModelMessage[]> => {
    const { text, toolCalls } = await generateText({
        model: groq(MODEL_NAME), 
       // prompt: userMessage,
       messages:[],
        system: SYSTEM_PROMPT,
        tools,
        toolChoice: "auto",
        temperature: getSetting('TEMPERATURE'),
        experimental_telemetry: {
            isEnabled: true,
            tracer: getTracer(),
        }
    });
    await Laminar.flush();

    console.log('done');

    // Build new conversation history
    const newHistory = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: text }
    ];

    // Execute tool calls if any
    if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
            const toolName = tc.toolName as Toolname;
            if (toolName in tools) {
                const result = await executeTools(toolName, tc.input);
                console.log(result);
            } else {
                console.log(`Unknown tool: ${tc.toolName}`);
            }
        }
    }

    return newHistory;
};

// runAgent("what is the current time right now?");