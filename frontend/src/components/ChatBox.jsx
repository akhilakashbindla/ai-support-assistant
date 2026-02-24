import { useState } from 'react';
import { sendMessage } from '../api';

function ChatBox({ sessionId, setMessages, isLoading, setIsLoading }) {
  const [input, setInput] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    // Optimistically update UI with user message
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await sendMessage(sessionId, userMsg);
      // Append assistant reply
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="chat-box" onSubmit={handleSend}>
      <input 
        type="text" 
        value={input} 
        onChange={(e) => setInput(e.target.value)} 
        placeholder="Ask a question about our docs..." 
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading || !input.trim()}>
        {isLoading ? 'Thinking...' : 'Send'}
      </button>
    </form>
  );
}

export default ChatBox;