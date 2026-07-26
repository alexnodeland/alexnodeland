import React from 'react';
import { ChatMessageStats } from '../../types/chat';

interface MessageStatsProps {
  stats: ChatMessageStats;
}

const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`);

/**
 * What the answer above cost, in one quiet row.
 *
 * The chat's whole claim is that a real language model is running on the
 * visitor's own machine, and that claim is more interesting when you can watch
 * the numbers. It doubles as the fastest way to notice a regression in normal
 * use: a cache that stops hitting shows up here as prefill tripling, which is
 * exactly how the reset-path cache bug was caught.
 */
const MessageStats: React.FC<MessageStatsProps> = ({ stats }) => {
  const total = stats.retrievalMs + (stats.prefillMs ?? 0) + stats.decodeMs;
  const tps = stats.decodeMs
    ? Math.round((stats.outputTokens / stats.decodeMs) * 1000)
    : null;

  return (
    <div className="message-stats" aria-label="how this answer was produced">
      <span
        className="stat"
        title="Total time from question to finished answer"
      >
        {ms(total)}
      </span>
      <span className="stat-sep" aria-hidden="true">
        ·
      </span>
      <span
        className="stat"
        title={`${stats.outputTokens} tokens written${tps ? ` at ~${tps}/s` : ''}`}
      >
        {stats.outputTokens} tok{tps ? ` · ${tps}/s` : ''}
      </span>
      <span className="stat-sep" aria-hidden="true">
        ·
      </span>
      <span
        className={`stat stat-cache ${stats.systemKvHit ? 'is-hit' : 'is-miss'}`}
        title={
          stats.systemKvHit
            ? `Cache hit — ${stats.systemKvCovered} tokens of the prompt were already computed, so only the rest had to be read`
            : 'Cache miss — the whole prompt had to be read from scratch'
        }
      >
        {stats.systemKvHit
          ? `cache ${stats.systemKvCovered} tok`
          : 'cache miss'}
      </span>
      <span className="stat-sep" aria-hidden="true">
        ·
      </span>
      <span
        className="stat"
        title={`Searching Alex's site took ${ms(stats.retrievalMs)}; reading the prompt ${stats.prefillMs === null ? 'was fully cached' : `took ${ms(stats.prefillMs)}`}; writing the answer took ${ms(stats.decodeMs)}`}
      >
        {stats.device}
      </span>
    </div>
  );
};

export default MessageStats;
