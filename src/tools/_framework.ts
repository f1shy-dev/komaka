import { tool, type Tool } from "ai";
import { z } from "zod";
import {
  list_directory,
  read_file,
  write_file,
  delete_file,
  mkdir,
  stat_file,
  edit_file_segment,
  cd,
} from "./filesystem";
import { exec_command } from "./command";
import type { ReactNode } from "react";
import { edit_file } from "./agentic-edit";

type ToolExecuteArgs<T extends Tool> = T extends {
  execute: (args: infer A, options?: any) => PromiseLike<any>;
}
  ? A
  : never;

type ToolExecuteResult<T extends Tool> = T extends {
  execute: (args: any, options?: any) => PromiseLike<infer R>;
}
  ? R
  : never;

export function withRender<
  T extends Tool,
  R extends ((result: ToolExecuteResult<T>) => string | ReactNode) | undefined,
  H extends (keyof ToolExecuteArgs<T>)[] = (keyof ToolExecuteArgs<T>)[]
>(toolObj: T, render?: R, hideArgs?: H) {
  return {
    tool: toolObj,
    render,
    hideArgs,
  };
}

export const toolKit = () => ({
  list_directory,
  read_file,
  write_file,
  delete_file,
  mkdir,
  stat_file,
  // edit_file_segment,
  exec_command,
  cd,
  edit_file,
});

export const questionToolKit = () => ({
  list_directory,
  read_file,
  stat_file,
});

type ExtractTool<T> = T extends { tool: infer U } ? U : never;

export type ToolKit = {
  [K in keyof ReturnType<typeof toolKit>]: ExtractTool<
    ReturnType<typeof toolKit>[K]
  >;
};
