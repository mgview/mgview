export interface MgHelpTopic {
  id: string;
  title: string;
  aliases: string[];
  purpose: string;
  syntax: string[];
}

export interface MgHelpIndex {
  version: number;
  sourcePath: string;
  topicCount: number;
  topics: Record<string, MgHelpTopic>;
  aliasToId: Record<string, string>;
  keywords: string[];
}
