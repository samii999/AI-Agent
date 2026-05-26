import {tool} from 'ai';
import {z} from 'zod';
import shell from 'shelljs';


export const runCommand = tool({
    description: "Run a shell command and return the output. Use this for system operations, running scripts, or interacting with the OS.",
    inputSchema: z.object({
        command: z.string().describe("The shell command to execute. Be specific and include any necessary flags or arguments."),
    }),
    execute: async ({ command }) => {
        const result = shell.exec(command, { silent: true });
        let output = "";
        if (result.stdout) {
            output += `Output: ${result.stdout}`;
        }
        if (result.stderr) {
            output += `Error: ${result.stderr}`;
        }
        if (result.code !== 0) {
            output += `Command failed (exit code ${result.code}):\n${output}`;
        }

        return output || "Command completed successfully (no output).";
    }
});