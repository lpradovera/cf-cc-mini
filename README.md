# SignalWire Call Fabric Mini Contact Center

A minimalist contact center application built with SignalWire Call Fabric, demonstrating how to create a simple customer service platform with agent and customer interfaces.

## Features

- Real-time audio communication using SignalWire Call Fabric
- Agent interface with customer information display
- Public customer interface for initiating calls
- Conference-based call routing
- Server-Sent Events (SSE) for real-time status updates
- Basic call controls (answer, reject, hangup)

## Prerequisites

- SignalWire Account ([Sign up here](https://signalwire.com/signup))
- Node.js installed on your system
- npm (Node Package Manager)

## Setup

1. Clone this repository:

```bash
git clone <repository-url>
cd cf-cc-mini
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your SignalWire credentials:

```
# .env
SIGNALWIRE_PROJECT_KEY=your_project_key
SIGNALWIRE_TOKEN=your_token
SIGNALWIRE_SPACE=your_space.signalwire.com
DESTINATION_RESOURCE=/public/agent-handler
```

4. Start the application:

```bash
node index.js
```

