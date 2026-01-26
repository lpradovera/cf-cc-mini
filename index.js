require('dotenv').config();
let express = require('express');
let app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const axios = require('axios');
const http = require('http');
const { WebSocketServer } = require('ws');
app.use(express.static('public'))
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOW-FROM https://signalwire.com");
  next();
});

const staticConference = '4567'+ Math.floor(Math.random() * 999 + 1);

let {createSession, createChannel} = require("better-sse");
const channel = createChannel();

async function apiRequest(endpoint, payload = {}, method = 'POST') {
  var url = `https://${process.env.SIGNALWIRE_SPACE}${endpoint}`

  resp = await axios.post(url, payload, {
    auth: {
      username: process.env.SIGNALWIRE_PROJECT_KEY,
      password: process.env.SIGNALWIRE_TOKEN
    }
  })
  return resp.data
}

app.get('/', async (req, res, next) => {
  try {
    const reference = (req.query.name || 'agent') + Math.floor(Math.random() * 999 + 1)
    const {subscriber_id, token} = await apiRequest('/api/fabric/subscribers/tokens', { reference })
    res.render('index', {subscriber_id, token, reference, destination: process.env.AGENT_RESOURCE, aiSipAddress: process.env.AI_SIP_ADDRESS});
  } catch (err) {
    next(err);
  }
});

app.get("/public", async (req, res, next) => {
  try {
    console.log('Public request');
    var payload = {
      allowed_addresses: [process.env.CUSTOMER_RESOURCE_ID]
    }
    console.log(payload);
    const {subscriber_id, token} = await apiRequest('/api/fabric/guests/tokens', payload)
    res.render('public', {subscriber_id, token, destination: process.env.CUSTOMER_RESOURCE});
  } catch (err) {
    next(err);
  }
});

app.get("/sse", async (req, res, next) => {
  try {
    const session = await createSession(req, res);
    channel.register(session);
  } catch (err) {
    next(err);
  }
});

app.post("/agent", async (req, res) => {
  console.log('Agent request', req.body);
  res.type('application/xml');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Dial>
  <Conference statusCallback="https://${req.headers.host}/conference" statusCallbackEvent="start end join leave" endConferenceOnExit="true">${staticConference}</Conference>
</Dial>
</Response>`
  res.send(xml);
});

app.post("/customer", async (req, res) => {
  console.log('Customer request', req.query, req.body);
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Dial>
  <Conference statusCallback="https://${req.headers.host}/conference" statusCallbackEvent="start end join leave">${staticConference}</Conference>
</Dial>
</Response>`);
});

app.post("/aiagent", async (req, res) => {
  console.log('Customer request', req.query, req.body);
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Dial>
  <Conference statusCallback="https://${req.headers.host}/conference" statusCallbackEvent="start end join leave">${staticConference}</Conference>
</Dial>
</Response>`);
});

app.post("/conference", async (req, res) => {
  channel.broadcast(req.body);
  res.sendStatus(200);
});

app.post("/recording", async (req, res) => {
  console.log('Recording callback:', req.body);
  channel.broadcast({
    type: 'recording',
    ...req.body
  });
  res.sendStatus(200);
});

app.post("/start-recording", async (req, res, next) => {
  try {
    const { callSid } = req.body;

    if (!callSid) {
      return res.status(400).json({ success: false, error: 'callSid is required' });
    }

    const url = `https://${process.env.SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${process.env.SIGNALWIRE_PROJECT_KEY}/Calls/${callSid}/Recordings.json`;

    const params = new URLSearchParams();
    params.append('RecordingChannels', 'dual');
    params.append('RecordingStatusCallback', `https://${req.headers.host}/recording`);
    params.append('RecordingStatusCallbackMethod', 'POST');
    params.append('RecordingStatusCallbackEvent', 'completed in-progress');

    const response = await axios.post(url, params, {
      auth: {
        username: process.env.SIGNALWIRE_PROJECT_KEY,
        password: process.env.SIGNALWIRE_TOKEN
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Recording started:', response.data);
    res.json({ success: true, recordingSid: response.data.sid });
  } catch (err) {
    console.error('Error starting recording:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
  }
});

app.get("/recordings", async (req, res, next) => {
  try {
    const url = `https://${process.env.SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${process.env.SIGNALWIRE_PROJECT_KEY}/Recordings.json`;

    const response = await axios.get(url, {
      auth: {
        username: process.env.SIGNALWIRE_PROJECT_KEY,
        password: process.env.SIGNALWIRE_TOKEN
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error listing recordings:', err.response?.data || err.message);
    next(err);
  }
});

app.get("/recording/:sid", async (req, res, next) => {
  try {
    const { sid } = req.params;
    const url = `https://${process.env.SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${process.env.SIGNALWIRE_PROJECT_KEY}/Recordings/${sid}.mp3`;

    const response = await axios.get(url, {
      auth: {
        username: process.env.SIGNALWIRE_PROJECT_KEY,
        password: process.env.SIGNALWIRE_TOKEN
      },
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="recording-${sid}.mp3"`);
    response.data.pipe(res);
  } catch (err) {
    console.error('Error downloading recording:', err.response?.data || err.message);
    next(err);
  }
});

app.post("/add-ai-agent", async (req, res, next) => {
  try {
    const sipAddress = req.body.sipAddress || process.env.AI_SIP_ADDRESS;
    const streamUrl = `wss://${process.env.STREAM_HOST}/stream`;

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;

    const url = `https://${process.env.SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${process.env.SIGNALWIRE_PROJECT_KEY}/Calls.json`;

    const params = new URLSearchParams();
    params.append('To', sipAddress);
    params.append('From', '+12293511220');
    params.append('Twiml', laml);

    const response = await axios.post(url, params, {
      auth: {
        username: process.env.SIGNALWIRE_PROJECT_KEY,
        password: process.env.SIGNALWIRE_TOKEN
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('AI agent call initiated:', response.data);
    res.json({ success: true, callSid: response.data.sid });
  } catch (err) {
    console.error('Error adding AI agent:', err.response?.data || err.message);
    next(err);
  }
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/stream' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected to /stream');
  let streamSid = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.event) {
        case 'connected':
          console.log('Stream connected');
          break;
        case 'start':
          streamSid = message.start.streamSid;
          console.log('Stream started:', streamSid);
          break;
        case 'media':
          // Echo audio back after 500ms delay
          const payload = message.media.payload;
          setTimeout(() => {
            if (ws.readyState === ws.OPEN && streamSid) {
              ws.send(JSON.stringify({
                event: 'media',
                streamSid: streamSid,
                media: { payload }
              }));
            }
          }, 500);
          break;
        case 'stop':
          console.log('Stream stopped');
          break;
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => console.log('WebSocket disconnected'));
  ws.on('error', (err) => console.error('WebSocket error:', err));
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port " + (process.env.PORT || 3000));
});