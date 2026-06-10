export interface MgHelpTopic {
  id: string;
  title: string;
  aliases: string[];
  purpose: string;
  syntax: string[];
}

export interface MgHelpIndex {
  version: number;
  sourceVersion: string | null;
  topicCount: number;
  topics: Record<string, MgHelpTopic>;
  aliasToId: Record<string, string>;
  keywords: string[];
}
