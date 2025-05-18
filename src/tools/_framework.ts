import { tool, type Tool } from "ai";
import { z } from "zod";
import {
  list_directory,
  read_file,
  write_file,
  delete_file,
  mkdir,
  stat_file,
} from "./filesystem";

type ToolExecuteResult<T extends Tool> = T extends {
  execute: (args: any, options?: any) => PromiseLike<infer R>;
}
  ? R
  : never;

export function withRender<
  T extends Tool,
  R extends ((result: ToolExecuteResult<T>) => string) | undefined
>(toolObj: T, render?: R) {
  return {
    tool: toolObj,
    render,
  };
}

export const weatherTool = withRender(
  tool({
    description: "Get the weather in a location",
    parameters: z.object({
      location: z.string().describe("The location to get the weather for"),
    }),
    execute: async ({ location }: { location: string }) => {
      return {
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      };
    },
  }),
  ({ location, temperature }) =>
    `The weather in ${location} is ${temperature}°F`
);

export const toolKit = () => ({
  weatherTool,
  list_directory,
  read_file,
  write_file,
  delete_file,
  mkdir,
  stat_file,
});

type ExtractTool<T> = T extends { tool: infer U } ? U : never;

export type ToolKit = {
  [K in keyof ReturnType<typeof toolKit>]: ExtractTool<
    ReturnType<typeof toolKit>[K]
  >;
};
