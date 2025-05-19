import { tool } from "ai";
import { z } from "zod";
import { withRender } from "./_framework";

const ENDPOINT_URL =
  "https://y2am67ueik.execute-api.eu-west-2.amazonaws.com/v1/batch";

export const batch_web_fetch = withRender(
  tool({
    description: "Fetches content from a list of URLs.",
    parameters: z.object({
      urls: z
        .array(z.string().url({ message: "Invalid URL provided." }))
        .min(1, { message: "At least one URL must be provided." }),
    }),
    async execute({ urls }) {
      try {
        const response = await fetch(ENDPOINT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ urls }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          return {
            success: false,
            error: `API request failed with status ${response.status}: ${response.statusText}`,
            details: errorBody,
            urls,
          };
        }

        const responseData = await response.json();

        return {
          success: true,
          data: responseData,
          urls,
        };
      } catch (error: any) {
        return {
          success: false,
          error:
            error?.message ||
            "An unknown error occurred during the batch web fetch.",
          details: error instanceof Error ? error.stack : undefined,
          urls,
        };
      }
    },
  }),
  (result) => {
    if (result.success) {
      // Assuming the responseData is an array or an object that can be summarized
      // You might want to adjust this based on the actual structure of responseData
      const summary = result.data
        ? JSON.stringify(result.data).substring(0, 100) + "..."
        : "No data returned.";
      return `Successfully fetched ${result.urls.length} URL(s). Response summary: ${summary}`;
    }
    return `Failed to fetch URLs: ${result.error}`;
  }
);
