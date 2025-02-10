import { apiRequest } from './api.js';
import SignalWire from '@signalwire/js';

async function initializeChat() {
  const { token } = await apiRequest('/api/fabric/subscribers/tokens', { reference: 'chatserver' });

  const client = await SignalWire.SignalWire({
    token: token
  });
  await client.conversation.subscribe(async (newMsg) => {
      console.log('New message received!', newMsg)
      

    if (newMsg.text == 'Hello') {
      const payload = {
        addressId: newMsg.from_address_id,
        text: "Hello back: " + newMsg.text,
      }
      console.log('Sending message to', payload);
      await client.conversation.sendMessage(payload);
    }
  });

  console.log('Chat initialized');


}

export { initializeChat };