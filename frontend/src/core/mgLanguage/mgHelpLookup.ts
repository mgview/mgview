import type { MgHelpIndex, MgHelpTopic } from './mgHelpTypes.ts';

export function buildTopicIdByLowerCase(index: MgHelpIndex): Map<string, string> {
  const lookup = new Map<string, string>();

  const register = (alias: string, topicId: string) => {
    const key = alias.toLowerCase();
    if (key.length === 0 || lookup.has(key)) {
      return;
    }
    lookup.set(key, topicId);
  };

  for (const [alias, topicId] of Object.entries(index.aliasToId)) {
    register(alias, topicId);
  }

  for (const [topicId, topic] of Object.entries(index.topics)) {
    register(topicId, topicId);
    register(topic.title, topicId);
    for (const alias of topic.aliases) {
      register(alias, topicId);
    }
  }

  return lookup;
}

export function findTopicForWord(index: MgHelpIndex, lookup: Map<string, string>, word: string): MgHelpTopic | null {
  const trimmed = word.trim();
  if (!trimmed) {
    return null;
  }

  const topicId = lookup.get(trimmed.toLowerCase());
  if (!topicId) {
    return null;
  }

  return index.topics[topicId] ?? null;
}
