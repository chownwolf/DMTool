import { useState } from 'react';
import { ChatInput } from './components/chat/ChatInput';
import { ChatWindow } from './components/chat/ChatWindow';
import { Sidebar } from './components/sidebar/Sidebar';
import { useChat } from './hooks/useChat';

export default function App() {
  const [collection, setCollection] = useState<string | null>(null);
  const { messages, isStreaming, sendMessage, clearChat } = useChat(collection);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <Sidebar
        selectedCollection={collection}
        onCollectionChange={setCollection}
        onClearChat={clearChat}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#1a0f0a' }}>
        <ChatWindow messages={messages} />
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}
