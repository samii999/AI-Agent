import {tools} from "./tools/index.ts";
export type Toolname = keyof typeof tools;
export const executeTools = async (name: Toolname, args: any) => {
    const tool = tools[name as Toolname];

    if (!tool) {
        return 'Unknown tool, this is not exist'
    }

    const execute = tool.execute;

    if(!execute) {
        return 'this is not a requested tool';

    }

    const result = await execute(args, {
        toolCallId: "",
        messages: [],
    });
    return String(result);
   
    
};