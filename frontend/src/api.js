import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const sendMessage = async (sessionId, message) => {
  const response = await axios.post(`${API_URL}/chat`, { sessionId, message });
  return response.data; // { reply, tokensUsed }
};

export const fetchConversation = async (sessionId) => {
  const response = await axios.get(`${API_URL}/conversations/${sessionId}`);
  return response.data; // Array of messages
};