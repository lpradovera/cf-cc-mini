require('dotenv').config();
let express = require('express');
let app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const axios = require('axios');
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
  <Conference statusCallback="https://${req.headers.host}/conference" statusCallbackEvent="start end join leave">${staticConference}</Conference>
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

app.post("/add-ai-agent", async (req, res, next) => {
  try {
    const sipAddress = req.body.sipAddress || process.env.AI_SIP_ADDRESS;
    const streamUrl = 'wss://your-websocket-server.example.com/stream';

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

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port 3000");
})