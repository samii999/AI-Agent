import { tools } from "./tools/index.ts";

export type ToolName = keyof typeof tools;

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  // console.log(`Executing tool: ${name} with args:`, args);
  
  const tool = tools[name as ToolName];

  if (!tool) {
    return `Unknown tool: ${name}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await tool.execute?.(args as any, {
    toolCallId: "",
    messages: [],
  });

  if (result === undefined) {
    return `Tool ${name} did not return a result`;
  }

  // console.log(`Tool ${name} result:`, result);
  return String(result);
}
