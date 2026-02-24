import ReactMarkdown from 'react-markdown';

function MessageList({ messages }) {
  if (messages.length === 0) {
    return <div className="empty-state">Hi there! How can I help you today?</div>;
  }

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.role}`}>
          <div className="message-content">
            {msg.role === 'assistant' ? (
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;