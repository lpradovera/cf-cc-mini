var _client = null;
var _call = null;
var _invite = null;
var _my_call_id = null;
var _active_call = false;
const sse = new EventSource("/sse");

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

  console.log('Connecting to SignalWire with token:', _token);
  console.log('Client connected:', _client);

  _client.online({
    incomingCallHandlers: { all: _incomingCallNotification },
  });
  

  await _client.conversation.subscribe((newMsg) => {
    console.log('New message received!', newMsg)
  });
  console.log('Connected to SignalWire');
}

async function _incomingCallNotification(notification) {
  console.log('Incoming call', notification.invite.details.caller_id_number);
  incomingCallFrom.innerHTML = notification.invite.details.caller_id_number;
  _invite = notification.invite;
  incomingCall.style.display = 'block';
  dialControls.style.display = 'none';
}

async function answerCall() {
  if (_invite) {
    console.log('Accepting call');
    _call = await _invite.accept({
      rootElement: document.getElementById('rootElement'),
      audio: true,
      video: false
    });
    callControls.style.display = 'block';
    incomingCall.style.display = 'none';
    
    _call.on('destroy', function() {
      console.log('Call ended');
      _call = null;
    });
  }
}

async function hangupCall() {
  if (_call && _call.state !== 'destroy') {
    _call.hangup()
  }
  _active_call = false;
  _my_call_id = null;
  resetUI();
}

async function rejectCall() {
  if (_invite) {
    _invite.reject();
  }
  resetUI();
}

async function makeCall() {
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
  _active_call = true;
  callControls.style.display = 'block';
  dialControls.style.display = 'none';
  waitingCard.style.display = 'block';
}

function resetUI() {
  dialControls.style.display = 'block';
  callControls.style.display = 'none';
  waitingCard.style.display = 'none';
  contactForm.style.display = 'none';
}

async function sendMessage() {
  const message = document.getElementById('chatInput').value;
  const payload = {
    addressId: _chatServerId,
    text: message
  }
  console.log('Sending message', payload);
  await _client.conversation.sendMessage(payload);
}

ready(async function() {
  console.log('ready');
  await connect();

  sse.addEventListener("message", ({data}) => {
    const msg = JSON.parse(data);
    if (msg.StatusCallbackEvent =='participant-join') {
      console.log('Participant joined');
      if (!_my_call_id) {
        _my_call_id = msg.CallSid;
      } else {
        waitingCard.style.display = 'none';
        contactForm.style.display = 'block';
      }
    }

    if (msg.StatusCallbackEvent == 'participant-leave') {
      console.log('Participant left');
      contactForm.style.display = 'none';
      if (_active_call) {
        waitingCard.style.display = 'block';
      }
    }
  });
});