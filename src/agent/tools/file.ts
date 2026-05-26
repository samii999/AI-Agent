import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { type } from "node:os";

export const readFile = tool({
    description: "Read the full contents of a file at the given path, always use this to read a file",
    inputSchema: z.object({
        path: z.string().describe("The path to the file to read"),
    }),
    execute: async ({path}) =>{
        try {
            const content = await fs.readFile(path, "utf-8");
            return content;
        } catch (error) {
            return `There was an error reading the file, here is the native error in node.js: ${error}`;
        }
    }
});


export const writeFile = tool({
    description: "Write the content to a file at a specified path. Creates the file if it does not exist and will overwrite it if it does",
    inputSchema: z.object({
        path: z.string().describe("The path to the file to write"),
        content: z.string().describe("The content to write to the file"),
    }),
    execute: async ({path, content}) =>{
        try {
            const dir = nodePath.dirname(path);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path, content, "utf-8");
            return `Succesfully wrote ${content.length} character to ${path}.`;
        } catch (error) {
            return `was not able to write to that file at that path, here is the node.js error: ${error}`;
        }
    }
});

export const listFiles = tool({
    description: "List all the files and directories in a directory path",
    inputSchema: z.object({
        directory: z.string().describe('The directory path to list the content of')
        .default("."),
    }),
    execute: async ({directory}) =>{
        try {
           const entries = await fs.readdir(directory, {withFileTypes: true})
           const items = entries.map(entry => {
           const type = entry.isDirectory()? "[dir]" : "[file]"
           return `${type} ${entry.name}`;
           })
          
           return items.length>0

           ? items.join("\n")
           : `Directory ${directory} is empty.`;
        } catch (error) {
            return `There was an error listing the files, here is the native error in node.js: ${error}`;
        }
    }
});

export const deleteFile = tool({
    description: "Delete a file at a specified path, as this is very disctructive and cannot be recovered",
    inputSchema: z.object({
        path: z.string().describe("The path to the file you want to delete"),
    }),
    execute: async ({path}) =>{
        try {
            await fs.unlink(path);
            return `Succesfully deleted ${path}.`;
        } catch (error) {
            return `There was an error deleting the file, here is the native error in node.js: ${error}`;
        }
    }
});