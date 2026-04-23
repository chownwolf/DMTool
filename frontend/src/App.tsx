import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatInput } from './components/chat/ChatInput';
import { ChatWindow } from './components/chat/ChatWindow';
import { DiceStrip } from './components/chat/DiceStrip';
import { Sidebar } from './components/sidebar/Sidebar';
import { useChat } from './hooks/useChat';
import { useSessions } from './hooks/useSessions';
import type { SearchResult } from './types';

export default function App() {
  const [collection, setCollection] = useState<string | null>(null);

  const { sessions, activeSessionId, startSession, loadSession, removeSession, clearActive, refresh } =
    useSessions();

  const { messages, isStreaming, sendMessage, pushMessage, loadMessages, clearMessages } = useChat({
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

  function handleSearchResults(query: string, mode: 'hybrid' | 'fts' | 'vector', results: SearchResult[]) {
    pushMessage({
      id: uuidv4(),
      role: 'user',
      content: `🔍 "${query}" · ${mode}`,
      contentType: 'rules_text',
      citations: [],
    });
    pushMessage({
      id: uuidv4(),
      role: 'assistant',
      content: query,
      contentType: 'search_results',
      citations: [],
      searchResults: results,
    });
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
        onSearchResults={handleSearchResults}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#1a0f0a' }}>
        <ChatWindow messages={messages} />
        <DiceStrip onRoll={(notation) => sendMessage(`/roll ${notation}`)} />
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}
