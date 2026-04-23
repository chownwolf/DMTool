import { useState } from 'react';
import { ChatInput } from './components/chat/ChatInput';
import { ChatWindow } from './components/chat/ChatWindow';
import { DiceStrip } from './components/chat/DiceStrip';
import { Sidebar } from './components/sidebar/Sidebar';
import { useChat } from './hooks/useChat';
import { useSessions } from './hooks/useSessions';

export default function App() {
  const [collection, setCollection] = useState<string | null>(null);

  const { sessions, activeSessionId, startSession, loadSession, removeSession, clearActive, refresh } =
    useSessions();

  const { messages, isStreaming, sendMessage, loadMessages, clearMessages } = useChat({
    collection,
    sessionId: activeSessionId,
    onNeedSession: (firstMessage) => startSession(firstMessage, collection),
    onSessionUpdated: refresh,
  });

  async function handleLoadSession(id: string) {
    const msgs = await loadSession(id);
    loadMessages(msgs);
  }

  function handleNewSession() {
    clearActive();
    clearMessages();
  }

  function handleClearChat() {
    clearActive();
    clearMessages();
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <Sidebar
        selectedCollection={collection}
        onCollectionChange={setCollection}
        onClearChat={handleClearChat}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onLoadSession={handleLoadSession}
        onDeleteSession={removeSession}
        onNewSession={handleNewSession}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#1a0f0a' }}>
        <ChatWindow messages={messages} />
        <DiceStrip onRoll={(notation) => sendMessage(`/roll ${notation}`)} />
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}
