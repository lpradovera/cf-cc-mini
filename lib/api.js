const axios = require('axios');

async function apiRequest(endpoint, payload = {}, method = 'POST') {
  const url = `https://${process.env.SIGNALWIRE_SPACE}${endpoint}`;

  const resp = await axios.post(url, payload, {
    auth: {
      username: process.env.SIGNALWIRE_PROJECT_KEY,
      password: process.env.SIGNALWIRE_TOKEN
    }
  });
  return resp.data;
}

module.exports = {
  apiRequest
}; 