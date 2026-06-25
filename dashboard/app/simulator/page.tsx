'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  mediaUrl?: string;
}

export default function SimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'bot',
    text: 'Welcome to the Bot Simulator! Type "hi" to start testing your bot.'
  }]);
  const [input, setInput] = useState('');
  const [phone, setPhone] = useState('919999999999');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // Send the request exactly like Twilio does, but add Simulator=true
      const params = new URLSearchParams();
      params.append('From', `whatsapp:+${phone.replace(/^\+/, '')}`);
      params.append('Body', userMsg);
      params.append('NumMedia', '0');
      params.append('Simulator', 'true');

      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: data.msg,
        mediaUrl: data.mediaUrl 
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'bot', text: `[SIMULATOR ERROR]: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="bg-[#25D366] p-4 text-white shadow-md">
          <h1 className="text-xl font-bold">WhatsApp Simulator</h1>
          <p className="text-sm opacity-90">Test your bot without Twilio Limits!</p>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-xs font-semibold">Test Phone Number:</span>
            <Input 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              className="h-7 text-black text-xs px-2 w-32"
              placeholder="919999999999"
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#efeae2] flex flex-col space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-lg p-3 shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-[#d9fdd3] text-black' : 'bg-white text-black'
                }`}
              >
                {msg.text}
                {msg.mediaUrl && (
                  <img src={msg.mediaUrl} alt="media" className="mt-2 rounded-md max-w-full h-auto" />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-3 shadow-sm text-gray-500 italic text-sm">
                Bot is typing...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-[#f0f2f5] flex items-center space-x-2 border-t">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-none focus-visible:ring-0 shadow-sm px-4"
          />
          <Button 
            onClick={sendMessage}
            disabled={loading}
            className="rounded-full w-10 h-10 p-0 bg-[#00a884] hover:bg-[#008f6f]"
          >
            ➤
          </Button>
        </div>
        
      </div>
    </div>
  );
}
