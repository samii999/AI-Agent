import { generateText, type ModelMessage } from "ai";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { extractMessageText } from "./tokenEstimator.ts";
import { getModel } from "../../config/models.ts";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

function providerForModel(modelName: string) {
  if (!modelName) return google(modelName);

  const lower = modelName.toLowerCase();
  if (lower.includes("qwen") || lower.includes("groq")) return groq(modelName);
  if (lower.includes("gemini") || lower.includes("google")) return google(modelName);

  return google(modelName);
}

const SUMMARIZATION_PROMPT = `You are a conversation summarizer. Your task is to create a concise summary of the conversation so far that preserves:

1. Key decisions and conclusions reached
2. Important context and facts mentioned
3. Any pending tasks or questions
4. The overall goal of the conversation

Be concise but complete. The summary should allow the conversation to continue naturally.

Conversation to summarize:

`;

/**
 * Format messages array as readable text for summarization
 */
function messagesToText(messages: ModelMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role.toUpperCase();
      const content = extractMessageText(msg);
      return `[${role}]: ${content}`;
    })
    .join("\n\n");
}

/**
 * Compact a conversation by summarizing it with an LLM.
 *
 * Takes the current messages (excluding system prompt) and returns a new
 * messages array with:
 * - A user message containing the summary
 * - An assistant acknowledgment
 *
 * The system prompt should be prepended by the caller.
 */
export async function compactConversation(
  messages: ModelMessage[],
  model: string = getModel("CONTEXT"),
): Promise<any> {
  const conversationMessages = messages.filter((msg) => msg.role !== "system");

  if (conversationMessages.length === 0) {
    return [];
  }

  const conversationText = messagesToText(conversationMessages);

  const { text: summary } = await generateText({
    model: providerForModel(model),
    prompt: SUMMARIZATION_PROMPT + conversationText,

  });

  const compactedMessages: any = [
    {
      role: "user",
      content:
        `[CONVERSATION SUMMARY]\n the following content is a summary of the conversation so far: \n ${summary}. please continue where we left off.`,
    },
    {
      role: "assistant",
      content: "Acknowledged. Continuing the conversation.",
    },
  ];
  return compactedMessages;
}
