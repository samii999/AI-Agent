import {generateText, stepCountIs, tool, type ToolSet} from "ai"
import {createOpenAI} from "@ai-sdk/openai";

import {z} from "zod";

import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";
import { buildMessages } from "./utils.ts";
import { getModel, getSetting } from "../src/config/models.js";

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
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
    const {toolCalls} = await generateText({
      model: groq(data.config?.model ?? getModel('TOOL')),
      messages,
      tools,
      stopWhen: stepCountIs(1),
      temperature: data.config?.temperature ?? getSetting('TEMPERATURE'),
      providerOptions: {
        groq: {
         reasoningEffort: "high"
        }
      }
    });
    
    const cells = toolCalls.map(tc => ({
      toolName: tc.toolName,
      args: "args" in tc ? tc.args : {},
    }));

    const toolNames = toolCalls.map(tc => tc.toolName);

    return {
      toolCalls,
      toolNames,
      selectedAny: toolNames.length > 0,
    };
  } catch (error) {
    console.error('Error in singleTurnExecutorwithMocks:', error);
    throw error;


  }
    
}