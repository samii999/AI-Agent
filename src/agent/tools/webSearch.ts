import { z } from "zod";

const webSearchParameters = {
    type: "object",
    properties: {
        query: {
            type: "string",
            description: "The search query to look up live facts.",
        },
    },
    required: ["query"],
} as const;

export const webSearch = {
    description:
        "Search the internet for real-time information, current news, and latest sports events. CRITICAL: You must extract the source URLs from the results and format them nicely in your final response as markdown hyperlinks like [Source Name](URL).",
    parameters: webSearchParameters,
    inputSchema: z.object({
        query: z.string().describe("The search query to look up."),
    }),
    execute: async ({ query }: { query: string }) => {
        // console.log(`🌐 Professional API Searching for: ${query}`);
        
        // Fetching from your environment variable
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            return "Error: TAVILY_API_KEY is missing in your .env file.";
        }

        try {
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "basic",
                    max_results: 3,
                }),
            });

            if (!response.ok) {
                return `Search API returned status: ${response.status}`;
            }

            const data: any = await response.json();
            
            // Map the structured response to exactly what the LLM loves to read
            const results = data.results.map((res: any) => ({
                title: res.title,
                snippet: res.content,
                link: res.url,
            }));

            return JSON.stringify(results);
        } catch (e: any) {
            return `Search failed seamlessly: ${e.message}`;
        }
    },
};