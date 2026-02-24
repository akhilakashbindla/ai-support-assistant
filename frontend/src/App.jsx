import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatBox from './components/ChatBox';
import MessageList from './components/MessageList';
import { fetchConversation } from './api';
import './App.css';

function App() {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session on load
  useEffect(() => {
    let currentSession = localStorage.getItem('chatSessionId');
    if (!currentSession) {
      currentSession = uuidv4();
      localStorage.setItem('chatSessionId', currentSession);
    }
    setSessionId(currentSession);
    loadHistory(currentSession);
  }, []);

  const loadHistory = async (id) => {
    try {
      const history = await fetchConversation(id);
      setMessages(history);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const handleNewChat = () => {
    const newSession = uuidv4();
    localStorage.setItem('chatSessionId', newSession);
    setSessionId(newSession);
    setMessages([]); // Clear screen for new chat
  };

  return (
    <div className="app-container">
      <header>
        <h1>🤖 AI Support Assistant</h1>
        <button onClick={handleNewChat} className="new-chat-btn">+ New Chat</button>
      </header>
      <main>
        <MessageList messages={messages} />
        <ChatBox 
          sessionId={sessionId} 
          setMessages={setMessages} 
          isLoading={isLoading} 
          setIsLoading={setIsLoading} 
        />
      </main>
    </div>
  );
}

export default App;