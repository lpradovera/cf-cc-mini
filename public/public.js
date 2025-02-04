var _client = null;
var _call = null;

function ready(callback) {
  if (document.readyState != 'loading') {
    callback();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState != 'loading') {
        callback();
      }
    });
  }
}

async function connect() {
  _client = await SignalWire.SignalWire({
    token: _token,
    rootElement: document.getElementById('rootElement')
  });
  
  console.log('Connected to SignalWire');
}


async function hangupCall() {
  if (_call && _call.state !== 'destroy') {
    _call.hangup()
  }
  resetUI();
}

async function makeCall() {
  await connect();
  _call = await _client.dial({
    to: document.getElementById('destination').value,
    logLevel: 'debug',
    debug: { logWsTraffic: true },
    rootElement: document.getElementById('rootElement')
  })

  _call.on('destroy', function() {
    console.log('Call ended');
    _call = null;
    resetUI();
  });

  console.log('Starting call');
  _call.start();
  callControls.style.display = 'block';
  dialControls.style.display = 'none';
}

function resetUI() {
  dialControls.style.display = 'block';
  callControls.style.display = 'none';
}

ready(async function() {
  console.log('ready');
});