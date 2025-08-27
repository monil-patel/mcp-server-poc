# Weather MCP Server

This project is a Weather MCP (Model Context Protocol) Server that provides weather alerts, forecasts, and prompt templates using the National Weather Service (NWS) API. It is implemented using the `@modelcontextprotocol/sdk` package.

## Features

- **Get Weather Alerts**: Retrieve active weather alerts for a specific U.S. state.
- **Get Weather Forecast**: Retrieve weather forecasts for a specific location using latitude and longitude.
- **Prompt Templates**: Pre-defined prompts for common weather-related questions and analysis.

## Prerequisites

- Node.js (version 16 or higher)
- Internet connection (to access the NWS API)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd weather
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Tools

The server provides the following tools:

#### 1. `get-alerts`
- **Description**: Get weather alerts for a state.
- **Input**:
  - `state` (string): Two-letter state code (e.g., `CA`, `NY`).
- **Output**: Active weather alerts for the specified state.

#### 2. `get-forecast`
- **Description**: Get weather forecast for a location.
- **Input**:
  - `latitude` (number): Latitude of the location.
  - `longitude` (number): Longitude of the location.
- **Output**: Weather forecast for the specified location.

#### 3. `list-prompts`
- **Description**: List available prompt templates.
- **Input**: None.
- **Output**: List of available prompt templates with descriptions.

#### 4. `render-prompt`
- **Description**: Render a prompt template with variable substitution.
- **Input**:
  - `promptId` (string): ID of the prompt to render.
  - `variables` (object, optional): Variables to substitute in the template.
- **Output**: Rendered prompt text.

### Prompts

The server provides the following prompt templates:

#### 1. `forecast-summary`
- **Description**: Summarize the next 3 days of weather for a given location.
- **Arguments**:
  - `location` (string): The location name.
  - `latitude` (string): Latitude of the location.
  - `longitude` (string): Longitude of the location.

#### 2. `severe-weather-alerts`
- **Description**: Summarize active severe weather alerts for a state and recommended actions.
- **Arguments**:
  - `state` (string): Two-letter state code.

#### 3. `heat-safety-tips`
- **Description**: Provide short, actionable heat safety tips for vulnerable populations.
- **Arguments**:
  - `location` (string): The location name.

#### 4. `travel-advisory`
- **Description**: Generate travel advisories and safety recommendations based on current and forecasted weather.
- **Arguments**:
  - `location` (string): The location name.
  - `start_time` (string): Start time for travel.
  - `end_time` (string): End time for travel.

## Development

### Project Structure

- `src/index.ts`: Main server implementation.
- `build/index.js`: Compiled JavaScript output.

### Scripts

- `npm start`: Start the server.
- `npm run build`: Compile TypeScript to JavaScript.

### TypeScript Configuration

The project uses a `tsconfig.json` file for TypeScript configuration.

## API Details

The server interacts with the National Weather Service (NWS) API. Below are the key endpoints used:

- **Alerts**: `https://api.weather.gov/alerts?area={state}`
- **Points**: `https://api.weather.gov/points/{latitude},{longitude}`
- **Forecast**: URL provided by the Points API.

## Error Handling

The server includes error handling for API requests. If an error occurs, a descriptive message will be returned.

## License

This project is licensed under the MIT License.