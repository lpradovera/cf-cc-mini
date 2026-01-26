var _client = null;
var _call = null;
var _invite = null;
var _my_call_id = null;
var _active_call = false;
var _recording = false;
var _recording_sid = null;
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
  // await _client.connect();

  _client.online({
    incomingCallHandlers: { all: _incomingCallNotification },
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
    aiAgentControls.style.display = 'block';
    document.getElementById('recordingControls').style.display = 'block';
    incomingCall.style.display = 'none';

    _call.on('destroy', function() {
      console.log('Call ended');
      _call = null;
    });
  }
}

async function addAiAgent() {
  const sipAddress = document.getElementById('aiSipAddress').value;
  const statusEl = document.getElementById('aiAgentStatus');

  statusEl.innerHTML = '<span class="text-info">Adding AI agent...</span>';

  try {
    const response = await fetch('/add-ai-agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sipAddress })
    });

    const data = await response.json();

    if (data.success) {
      statusEl.innerHTML = '<span class="text-success">AI agent added successfully!</span>';
    } else {
      statusEl.innerHTML = '<span class="text-danger">Failed to add AI agent</span>';
    }
  } catch (err) {
    console.error('Error adding AI agent:', err);
    statusEl.innerHTML = '<span class="text-danger">Error: ' + err.message + '</span>';
  }
}

async function startRecording() {
  // Try to get call ID from the _call object first, fall back to conference CallSid
  const callSid = _call?.id || _my_call_id;

  console.log('Starting recording for call:', callSid, '_call?.id:', _call?.id, '_my_call_id:', _my_call_id);

  if (!callSid) {
    console.error('No active call to record');
    return;
  }

  const statusEl = document.getElementById('recordingStatus');
  statusEl.innerHTML = '<span class="text-info">Starting recording...</span>';

  try {
    const response = await fetch('/start-recording', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ callSid })
    });

    const data = await response.json();

    if (data.success) {
      _recording = true;
      _recording_sid = data.recordingSid;
      document.getElementById('startRecordingBtn').style.display = 'none';
      document.getElementById('recordingIndicator').style.display = 'block';
      statusEl.innerHTML = '<span class="text-success">Recording in progress</span>';
    } else {
      statusEl.innerHTML = '<span class="text-danger">Failed to start recording: ' + data.error + '</span>';
    }
  } catch (err) {
    console.error('Error starting recording:', err);
    statusEl.innerHTML = '<span class="text-danger">Error: ' + err.message + '</span>';
  }
}

function handleRecordingEvent(msg) {
  const statusEl = document.getElementById('recordingStatus');

  if (msg.RecordingStatus === 'in-progress') {
    _recording = true;
    statusEl.innerHTML = '<span class="text-warning">Recording in progress...</span>';
    document.getElementById('recordingIndicator').style.display = 'block';
    document.getElementById('startRecordingBtn').style.display = 'none';
  } else if (msg.RecordingStatus === 'completed') {
    _recording = false;
    statusEl.innerHTML = '<span class="text-success">Recording complete (' + msg.RecordingDuration + 's)</span>';

    const downloadBtn = document.getElementById('downloadRecordingBtn');
    downloadBtn.style.display = 'inline-block';
    downloadBtn.onclick = function() {
      window.location.href = '/recording/' + msg.RecordingSid;
    };

    document.getElementById('recordingIndicator').style.display = 'none';
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
  aiAgentControls.style.display = 'none';
  waitingCard.style.display = 'none';
  contactForm.style.display = 'none';
  document.getElementById('aiAgentStatus').innerHTML = '';

  // Reset recording state
  _recording = false;
  _recording_sid = null;
  document.getElementById('recordingControls').style.display = 'none';
  document.getElementById('startRecordingBtn').style.display = 'inline-block';
  document.getElementById('recordingIndicator').style.display = 'none';
  document.getElementById('downloadRecordingBtn').style.display = 'none';
  document.getElementById('recordingStatus').innerHTML = '';
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
        aiAgentControls.style.display = 'block';
        document.getElementById('recordingControls').style.display = 'block';
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

    if (msg.type === 'recording') {
      handleRecordingEvent(msg);
    }
  });
});