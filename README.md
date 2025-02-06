# SignalWire Call Fabric Mini Contact Center

A minimalist contact center application built with SignalWire Call Fabric, demonstrating how to create a simple customer service platform with agent and customer interfaces.

## Features

- Real-time audio communication using SignalWire Call Fabric
- Agent interface with customer information display
- Public customer interface for initiating calls
- Conference-based call routing
- Server-Sent Events (SSE) for real-time status updates
- Basic call controls (answer, reject, hangup)


## How  does it work?

Agents are connected using the Call Fabric SDK and join a conference.

Customers are connected using the Call Fabric SDK and join the same conference.

The token that is generated for the customer is scoped to the customer resource, so they can only call the customer resource.

## Prerequisites

- SignalWire Account ([Sign up here](https://signalwire.com/signup))
- Node.js installed on your system
- npm (Node Package Manager)
- ngrok ([https://ngrok.com/](https://ngrok.com/)) or similar tunneling service

## SignalWire Dashboard

You need to set up two resources as CXML scripts. One will point to the public-facing side, the other will point to your agent-specific handler.
Via `ngrok`, find out what your address is for the local machine, you will use it to set up the handlers

In your dashboard, click `Resources`, `Add New`, `Script`, `CXML Script`, then fill out as follows (use your tunnel address) to create your agent endpoint.

<img width="1264" alt="image" src="https://github.com/user-attachments/assets/a30fea1a-6043-445c-a19d-7b9465da3bab" />

On the newly created resource page, click on `Addresses` and make a note of the assigned address (in the screenshot, `/public/agent-resource`.

<img width="1087" alt="image" src="https://github.com/user-attachments/assets/a58360ba-6157-484c-8210-1d3c04b5b3f3" />


Create another resource for the public endpoint using `https://<yourtunnel>.ngrok.io` as the address, and again, on the following screen, click on `Addresses`.
This time, click on the first address and on the next screen, note the address ID.

<img width="1091" alt="image" src="https://github.com/user-attachments/assets/61111e4e-7d08-4b4d-92bb-899c3bf6b4a1" />

You now have created two resources, you have the address for the agent one, and the address and its ID of the customer one. The ID will be used to create the secure token to allow the guest caller to only call that resource.


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

3. Create a `.env` file in the root directory with your SignalWire credentials and the information from above (your values will vary)

```
# .env
SIGNALWIRE_PROJECT_KEY=your_project_key
SIGNALWIRE_TOKEN=your_token
SIGNALWIRE_SPACE=<your_space>.signalwire.com
AGENT_RESOURCE=/public/agent-handler
CUSTOMER_RESOURCE=/public/customer-handler
CUSTOMER_RESOURCE_ID=af9d4ac4-12d4-4068-82f3-2112ee452c24
```

4. Start the application:

```bash
node index.js
```

6. Visit the agent endpoint in your browser:

```
http://localhost:3000
```

Click on `Start session` and wait for the call to connect.

5. Visit the public endpoint in your browser:

```
http://localhost:3000/public
```

Click on `Call Us` and wait for the call to connect.




