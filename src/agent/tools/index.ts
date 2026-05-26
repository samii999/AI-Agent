import { getDateTime } from "./dateTime.ts";
import { readFile, writeFile, listFiles, deleteFile } from "./file.ts";
import { webSearch } from "./webSearch.ts";
import {runCommand} from "./shell.ts";
// All tools combined for the agent
export const tools = {
  getDateTime,
  readFile,
  writeFile,
  listFiles,
  deleteFile,
  webSearch,
  runCommand,
};


export {readFile, writeFile, listFiles, deleteFile} from "./file.ts";
export {webSearch} from "./webSearch.ts";
export {runCommand} from "./shell.ts";


export const fileTools = {
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};

export const terminalTools = {
  runCommand,
};