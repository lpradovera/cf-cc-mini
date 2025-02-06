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

app.get('/', async (req, res) => {
  const reference = (req.query.name || 'agent') + Math.floor(Math.random() * 999 + 1)
  const {subscriber_id, token} = await apiRequest('/api/fabric/subscribers/tokens', { reference })
  res.render('index', {subscriber_id, token, reference, destination: process.env.AGENT_RESOURCE});
});

app.get("/public", async (req, res) => {
  console.log('Public request', process.env.CUSTOMER_RESOURCE_ID);
  var payload = { 
    allowed_addresses: [process.env.CUSTOMER_RESOURCE_ID]
  }
  console.log(payload);
  const {subscriber_id, token} = await apiRequest('/api/fabric/guests/tokens', payload)
  // const reference = (req.query.name || 'guest') + Math.floor(Math.random() * 999 + 1)
  // const {subscriber_id, token} = await apiRequest('/api/fabric/subscribers/tokens', { reference })
  // console.log(subscriber_id, token);
  res.render('public', {subscriber_id, token, destination: process.env.CUSTOMER_RESOURCE});
});

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);
	channel.register(session);
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
  console.log('Customer request');
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

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port 3000");
})