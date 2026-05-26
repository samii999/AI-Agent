import {generateText, stepCountIs, tool, type ToolSet, type ModelMessage} from "ai"
import {createOpenAI} from "@ai-sdk/openai";
import {createGoogleGenerativeAI} from "@ai-sdk/google";

import {z} from "zod";

import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";
import { buildMessages, buildMockedTools } from "./utils.ts";
import { getModel, getSetting } from "../src/config/models.ts";
import { SYSTEM_PROMPT } from "../dist/agent/system/prompt";

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const TOOL_DEFINITIONS:any  = {
  readFile: {
    description: 'Read the contents a file at the specified path',
    parameters: z.object({
      path: z.string().describe('The path to the file to read')
    })
  },
  writeFile: {
    description: 'write given content to the file at the given path',
    parameters: z.object({
      path: z.string().describe('the path to the file to write'),
      content: z.string().describe('the content to write to the file')
    })
  },
  listFiles: {
    description: 'List all the files in a directory',
    parameters: z.object({
      path: z.string().describe('the path to the directory in which you want to list the files')
    })
  },
  deleteFile: {
    description: 'Delete a file at the given path',
    parameters: z.object({
      path: z.string().describe('the path to the file to delete')
    })
  },
  runCommand: {
    description: 'Run a command in the terminal and return its output',
    parameters: z.object({
      command: z.string().describe('the command to run')
    })
  }
} 

export const singleTurnExecutorwithMocks = async (data: EvalData) => {
  const messages = buildMessages(data);

  const tools: ToolSet = {};
  for (const toolName of data.tools){
    const def = TOOL_DEFINITIONS[toolName];
    if (def) {
      tools[toolName] = tool({
        description: def.description,
        inputSchema: def.parameters,
        execute: async () => `Mocked ${toolName} result`,
      })
    }
  }

  try {
    // Add delay to avoid rate limits (15 RPM = 1 request every 4 seconds)
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const {toolCalls} = await generateText({
      model: groq(getModel('TOOL')),
      messages,
      tools,
      stopWhen: stepCountIs(1),
      temperature: data.config?.temperature ?? getSetting('TEMPERATURE'),
    });
    
    const cells = toolCalls.map(tc => ({
      toolName: tc.toolName,
      args: "args" in tc ? tc.args : {},
    }));

    const toolNames = toolCalls.map(tc => tc.toolName);

    return {
      toolCalls: cells,
      toolNames,
      selectedAny: toolNames.length > 0,
    };
  } catch (error) {
    console.error('Error in singleTurnExecutorwithMocks:', error);
    throw error;


  }
    
}

/**
 * Multi-turn executor with mocked tools.
 * Runs a complete agent loop with tools returning fixed values.
 */

export const multiTurnWithMocks = async (data: MultiTurnEvalData) => {
  const tools = buildMockedTools(data.mockTools);

  const messages: ModelMessage[] = data.messages ?? [
    {
      role:"system",
      content:SYSTEM_PROMPT
    },
    {
      role: "user", content: data.prompt!
    }
  ];

  const result = await generateText({
    model: google(getModel('BRAIN_3')),
    messages,
    tools,
    stopWhen: stepCountIs(data.config?.maxSteps ?? 20),
   
  })

  const allToolCalls: string [] = []
  const steps = result.steps.map(step => {
   const stepToolCalls = (step.toolCalls ?? []).map(tc =>{
    allToolCalls.push(tc.toolName)

    return {
      toolName: tc.toolName,
      args: "args" in tc ? tc.args : {},
    }
   })
   
   const stepToolResults = (step.toolResults ?? []).map(tr => ({
    toolName: tr.toolName,
    result: "results" in tr ? tr.results : tr,
   }))

   return {
    toolCalls: stepToolCalls.length > 0 ? stepToolCalls : undefined,
    toolResults: stepToolResults.length > 0 ? stepToolResults : undefined,
    text: step.text || undefined,
   }
  
  })

  const toolsUsed = [new Set(allToolCalls)]

  return {
    text: result.text,
    steps,
    toolsUsed,
    toolCallOrder: allToolCalls,
  }



};

// Export alias for backward compatibility
export const singleTurnWithMocks = singleTurnExecutorwithMocks;