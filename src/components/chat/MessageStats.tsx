import React from 'react';
import { ChatMessageStats } from '../../types/chat';

interface MessageStatsProps {
  stats: ChatMessageStats;
}

const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`);

/**
 * What the answer above cost, in two numbers.
 *
 * Decode rate and cache coverage, and nothing else — everything else that
 * matters is derivable from those two and is available on hover. The chat's
 * whole claim is that a real language model is running on the visitor's own
 * machine, and that claim lands better as a glanceable pair than as a row of
 * five figures competing with the answer.
 *
 * Cache coverage is a percentage of the prompt rather than a token count,
 * because the useful question is "how much of the work was skipped", and
 * 975 tokens means nothing without knowing the prompt was 1,587.
 */
const MessageStats: React.FC<MessageStatsProps> = ({ stats }) => {
  const total = stats.retrievalMs + (stats.prefillMs ?? 0) + stats.decodeMs;
  const tps = stats.decodeMs
    ? Math.round((stats.outputTokens / stats.decodeMs) * 1000)
    : null;
  const cachePct =
    stats.systemKvHit && stats.promptTokens
      ? Math.round((stats.systemKvCovered / stats.promptTokens) * 100)
      : 0;

  const breakdown =
    `${stats.outputTokens} tokens in ${ms(total)} — ` +
    `search ${ms(stats.retrievalMs)}, ` +
    `prompt ${stats.prefillMs === null ? 'fully cached' : ms(stats.prefillMs)}, ` +
    `answer ${ms(stats.decodeMs)}, on ${stats.device}`;

  return (
    <div className="message-stats" aria-label="how this answer was produced">
      <span className="stat" title={breakdown}>
        {tps ? `${tps} tok/s` : `${stats.outputTokens} tok`}
      </span>
      <span className="stat-sep" aria-hidden="true">
        ·
      </span>
      <span
        className={`stat stat-cache ${stats.systemKvHit ? 'is-hit' : 'is-miss'}`}
        title={
          stats.systemKvHit
            ? `${cachePct}% of the ${stats.promptTokens}-token prompt was already computed — only the rest had to be read`
            : `Cache miss — all ${stats.promptTokens} prompt tokens had to be read from scratch`
        }
      >
        {stats.systemKvHit ? `${cachePct}% cached` : 'no cache'}
      </span>
    </div>
  );
};

export default MessageStats;
