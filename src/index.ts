import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
    const headers = {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    };
  
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      console.error("Error making NWS request:", error);
      return null;
    }
  }
  
  interface AlertFeature {
    properties: {
      event?: string;
      areaDesc?: string;
      severity?: string;
      status?: string;
      headline?: string;
    };
  }
  
  // Format alert data
  function formatAlert(feature: AlertFeature): string {
    const props = feature.properties;
    return [
      `Event: ${props.event || "Unknown"}`,
      `Area: ${props.areaDesc || "Unknown"}`,
      `Severity: ${props.severity || "Unknown"}`,
      `Status: ${props.status || "Unknown"}`,
      `Headline: ${props.headline || "No headline"}`,
      "---",
    ].join("\n");
  }
  
  interface ForecastPeriod {
    name?: string;
    temperature?: number;
    temperatureUnit?: string;
    windSpeed?: string;
    windDirection?: string;
    shortForecast?: string;
  }
  
  interface AlertsResponse {
    features: AlertFeature[];
  }
  
  interface PointsResponse {
    properties: {
      forecast?: string;
    };
  }
  
  interface ForecastResponse {
    properties: {
      periods: ForecastPeriod[];
    };
  }


  // Register weather tools
server.tool(
    "get-alerts",
    "Get weather alerts for a state",
    {
      state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
    },
    async ({ state }) => {
      const stateCode = state.toUpperCase();
      const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
      const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);
  
      if (!alertsData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve alerts data",
            },
          ],
        };
      }
  
      const features = alertsData.features || [];
      if (features.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No active alerts for ${stateCode}`,
            },
          ],
        };
      }
  
      const formattedAlerts = features.map(formatAlert);
      const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;
  
      return {
        content: [
          {
            type: "text",
            text: alertsText,
          },
        ],
      };
    },
  );
  
  server.tool(
    "get-forecast",
    "Get weather forecast for a location",
    {
      latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
      longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
    },
    async ({ latitude, longitude }) => {
      // Get grid point data
      const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);
  
      if (!pointsData) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
            },
          ],
        };
      }
  
      const forecastUrl = pointsData.properties?.forecast;
      if (!forecastUrl) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to get forecast URL from grid point data",
            },
          ],
        };
      }
  
      // Get forecast data
      const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
      if (!forecastData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve forecast data",
            },
          ],
        };
      }
  
      const periods = forecastData.properties?.periods || [];
      if (periods.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No forecast periods available",
            },
          ],
        };
      }
  
      // Format forecast periods
      const formattedForecast = periods.map((period: ForecastPeriod) =>
        [
          `${period.name || "Unknown"}:`,
          `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
          `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
          `${period.shortForecast || "No forecast available"}`,
          "---",
        ].join("\n"),
      );
  
      const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;
  
      return {
        content: [
          {
            type: "text",
            text: forecastText,
          },
        ],
      };
    },
  );

  // Sample prompts that can be served by the MCP server
const PROMPTS = [
  {
    id: "forecast-summary",
    title: "3-day Forecast Summary",
    description: "Summarize the next 3 days of weather for a given location.",
    template:
      "Summarize the weather forecast for the next 3 days for {location} (lat: {latitude}, lon: {longitude}). Include high/low temperatures, chance of precipitation, and any notable hazards.",
  },
  {
    id: "severe-weather-alerts",
    title: "Severe Weather Alerts Summary",
    description: "Summarize active severe weather alerts for a state and recommended actions.",
    template:
      "Check for active severe weather alerts in {state}. Summarize the event, affected areas, severity, expected timing, and recommended actions for residents.",
  },
  {
    id: "heat-safety-tips",
    title: "Heat Safety Tips",
    description: "Provide short, actionable heat safety tips for vulnerable populations.",
    template:
      "Provide concise heat safety tips for outdoor workers and vulnerable populations during an extreme heat event in {location}. Include hydration guidance, cooling strategies, and when to seek medical attention.",
  },
  {
    id: "travel-advisory",
    title: "Travel Advisory",
    description: "Generate travel advisories and safety recommendations based on current and forecasted weather.",
    template:
      "Given current and forecasted weather conditions for {location}, provide travel advisories and road safety recommendations for drivers traveling between {start_time} and {end_time}.",
  },
];

// Simple template renderer that replaces tokens like {key} with values from variables
function renderTemplate(template: string, variables?: Record<string, any>): string {
  if (!variables) return template;
  return template.replace(/\{([^}]+)\}/g, (_match, key) => {
    const v = variables[key];
    if (v === undefined || v === null) return `{${key}}`;
    // For objects/arrays, JSON stringify to preserve structure
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

// Register prompts
server.prompt(
  "forecast-summary",
  "Summarize the next 3 days of weather for a given location",
  {
    location: z.string().describe("The location name"),
    latitude: z.string().describe("Latitude of the location"),
    longitude: z.string().describe("Longitude of the location"),
  },
  async ({ location, latitude, longitude }) => {
    const rendered = `Summarize the weather forecast for the next 3 days for ${location} (lat: ${latitude}, lon: ${longitude}). Include high/low temperatures, chance of precipitation, and any notable hazards.`;
    return {
      description: "Summarize the next 3 days of weather for a given location",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: rendered,
          },
        },
      ],
    };
  },
);

server.prompt(
  "severe-weather-alerts",
  "Summarize active severe weather alerts for a state and recommended actions",
  {
    state: z.string().describe("Two-letter state code"),
  },
  async ({ state }) => {
    const rendered = `Check for active severe weather alerts in ${state}. Summarize the event, affected areas, severity, expected timing, and recommended actions for residents.`;
    return {
      description: "Summarize active severe weather alerts for a state and recommended actions",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: rendered,
          },
        },
      ],
    };
  },
);

server.prompt(
  "heat-safety-tips",
  "Provide short, actionable heat safety tips for vulnerable populations",
  {
    location: z.string().describe("The location name"),
  },
  async ({ location }) => {
    const rendered = `Provide concise heat safety tips for outdoor workers and vulnerable populations during an extreme heat event in ${location}. Include hydration guidance, cooling strategies, and when to seek medical attention.`;
    return {
      description: "Provide short, actionable heat safety tips for vulnerable populations",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: rendered,
          },
        },
      ],
    };
  },
);

server.prompt(
  "travel-advisory",
  "Generate travel advisories and safety recommendations based on current and forecasted weather",
  {
    location: z.string().describe("The location name"),
    start_time: z.string().describe("Start time for travel"),
    end_time: z.string().describe("End time for travel"),
  },
  async ({ location, start_time, end_time }) => {
    const rendered = `Given current and forecasted weather conditions for ${location}, provide travel advisories and road safety recommendations for drivers traveling between ${start_time} and ${end_time}.`;
    return {
      description: "Generate travel advisories and safety recommendations based on current and forecasted weather",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: rendered,
          },
        },
      ],
    };
  },
);

// Tool: list-prompts - returns the available prompts
server.tool(
  "list-prompts",
  "List example prompts that this server can provide",
  {},
  async () => {
    const text = PROMPTS.map((p) => `${p.id} - ${p.title}: ${p.description}\nTemplate: ${p.template}`).join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Available prompts (${PROMPTS.length}):\n\n${text}`,
        },
      ],
    };
  },
);

// Tool: render-prompt - render a selected prompt with optional substitution variables
server.tool(
  "render-prompt",
  "Render one of the example prompts with optional variable substitution",
  {
    promptId: z.string().describe("ID of the prompt to render (see list-prompts)"),
    variables: z.record(z.any()).optional().describe("Optional map of variables to substitute into the prompt"),
  },
  async ({ promptId, variables }) => {
    const prompt = PROMPTS.find((p) => p.id === promptId);
    if (!prompt) {
      return {
        content: [
          {
            type: "text",
            text: `Prompt not found: ${promptId}`,
          },
        ],
      };
    }

    const rendered = renderTemplate(prompt.template, variables as Record<string, any>);

    return {
      content: [
        {
          type: "text",
          text: `Prompt: ${prompt.title}\n\n${rendered}`,
        },
      ],
    };
  },
);

  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
  }
  
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });