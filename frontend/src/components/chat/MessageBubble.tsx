import type { Message } from '../../types';
import { DiceRenderer } from '../renderers/DiceRenderer';
import { FeatRenderer } from '../renderers/FeatRenderer';
import { PlainTextRenderer } from '../renderers/PlainTextRenderer';
import { SearchResultsRenderer } from '../renderers/SearchResultsRenderer';
import { SpellRenderer } from '../renderers/SpellRenderer';
import { StatBlockRenderer } from '../renderers/StatBlockRenderer';
import { CitationList } from './CitationList';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="message-appear" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div
          style={{
            background: '#3d2a14',
            border: '1px solid #5a3a1a',
            borderRadius: '12px 12px 4px 12px',
            padding: '8px 14px',
            maxWidth: '70%',
            color: '#f5d5a0',
            fontSize: '0.9rem',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="message-appear" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#7b1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          ⚔
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {message.isStreaming && !message.content && (
            <div style={{ color: '#a08060', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Consulting the tomes…
            </div>
          )}
          <ContentRenderer message={message} />
          {!message.isStreaming && <CitationList citations={message.citations} />}
        </div>
      </div>
    </div>
  );
}

function ContentRenderer({ message }: { message: Message }) {
  const { content, contentType, diceRoll, searchResults } = message;

  if (contentType === 'dice_roll' && diceRoll) {
    return <DiceRenderer result={diceRoll} />;
  }
  if (contentType === 'search_results') {
    return <SearchResultsRenderer query={content} results={searchResults ?? []} />;
  }
  if (!content) return null;

  switch (contentType) {
    case 'stat_block':
      return <StatBlockRenderer content={content} />;
    case 'spell':
      return <SpellRenderer content={content} />;
    case 'feat':
      return <FeatRenderer content={content} />;
    default:
      return <PlainTextRenderer content={content} />;
  }
}
