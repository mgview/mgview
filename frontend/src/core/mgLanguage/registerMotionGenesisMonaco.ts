import type { Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import mgHelpIndexJson from './mgHelpIndex.data.json' with { type: 'json' };
import type { MgHelpIndex, MgHelpTopic } from './mgHelpTypes.ts';
import { getMgHelpPageUrl } from './mgHelpDocUrl.ts';
import { getCompletionPrefix } from './mgCompletionPrefix.ts';
import { buildTopicIdByLowerCase, findTopicForWord as lookupTopicForWord } from './mgHelpLookup.ts';

const LANGUAGE_ID = 'motiongenesis';
const index = mgHelpIndexJson as MgHelpIndex;
const topicIdByLowerCase = buildTopicIdByLowerCase(index);

let registered = false;

function buildHoverContents(topic: MgHelpTopic): MonacoEditor.IMarkdownString[] {
  const contents: MonacoEditor.IMarkdownString[] = [
    { value: `**${topic.title}**` },
  ];

  if (topic.purpose) {
    contents.push({ value: topic.purpose });
  }

  if (topic.syntax.length > 0) {
    contents.push({
      value: ['```mg', ...topic.syntax, '```'].join('\n'),
    });
  }

  contents.push({
    value: `[Open in Motion Genesis help](${getMgHelpPageUrl(topic.id)})`,
  });

  return contents;
}

function buildMonarchLanguage(): MonacoEditor.languages.IMonarchLanguage {
  return {
    defaultToken: '',
    ignoreCase: true,
    tokenPostfix: '.mg',
    keywords: index.keywords,

    brackets: [
      { open: '(', close: ')', token: 'delimiter.parenthesis' },
      { open: '[', close: ']', token: 'delimiter.square' },
    ],

    tokenizer: {
      root: [
        [/%.*/, 'comment'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
        [/\b(?:true|false)\b/i, 'constant.language'],
        [/\bpi\b/i, 'constant.language'],
        [/:=/, 'operator'],
        [/%%/, 'comment'],
        [/\b0>{1,3}\b/, 'type.identifier'],
        [/\b1>{1,3}\b/, 'type.identifier'],
        [/>>>/, 'type.identifier'],
        [/>>/, 'type.identifier'],
        [/>/, 'type.identifier'],
        [/\b[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\b/, 'number'],
        [
          /[A-Za-z_][A-Za-z0-9_]*/,
          {
            cases: {
              '@keywords': 'keyword.mg',
              '@default': 'identifier',
            },
          },
        ],
        [/\s+/, 'white'],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/"/, 'string', '@pop'],
      ],
    },
  };
}

export function registerMotionGenesisMonaco(monaco: Monaco): void {
  if (registered) {
    return;
  }
  registered = true;

  monaco.languages.register({ id: LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, buildMonarchLanguage());

  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    comments: {
      lineComment: '%',
    },
    brackets: [
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
  });

  monaco.editor.defineTheme('mgview-motiongenesis-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword.mg', foreground: '0550ae', fontStyle: 'bold' },
      { token: 'type.identifier', foreground: '8250df' },
      { token: 'constant.language', foreground: '0550ae' },
    ],
    colors: {},
  });

  monaco.editor.defineTheme('mgview-motiongenesis-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword.mg', foreground: '79c0ff', fontStyle: 'bold' },
      { token: 'type.identifier', foreground: 'd2a8ff' },
      { token: 'constant.language', foreground: '79c0ff' },
    ],
    colors: {},
  });

  monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) {
        return null;
      }

      const topic = lookupTopicForWord(index, topicIdByLowerCase, word.word);
      if (!topic) {
        return null;
      }

      return {
        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
        contents: buildHoverContents(topic),
      };
    },
  });

  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: ['.', '%'],
    provideCompletionItems(model, position) {
      const { prefix, startColumn } = getCompletionPrefix(
        model.getLineContent(position.lineNumber),
        position.column,
      );
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn,
        endColumn: position.column,
      };
      const prefixLower = prefix.toLowerCase();

      const seen = new Set<string>();
      const suggestions = [];
      for (const keyword of index.keywords) {
        if (!keyword.toLowerCase().startsWith(prefixLower)) {
          continue;
        }
        const topicId = topicIdByLowerCase.get(keyword.toLowerCase());
        if (!topicId || seen.has(topicId)) {
          continue;
        }
        seen.add(topicId);
        const topic = index.topics[topicId];
        const label = topic?.title ?? keyword;
        const detail = topic?.purpose ? truncateCompletionDetail(topic.purpose) : undefined;
        suggestions.push({
          label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: label,
          filterText: label.toLowerCase(),
          range,
          detail,
        });
        if (suggestions.length >= 40) {
          break;
        }
      }

      // Re-query on each keystroke while the widget is open. Without this, a trigger on "."
      // returns a stale capped list that Monaco only fuzzy-filters client-side.
      return { suggestions, incomplete: true };
    },
  });
}

function truncateCompletionDetail(text: string): string {
  if (text.length <= 80) {
    return text;
  }
  return `${text.slice(0, 79)}…`;
}

export function getMotionGenesisEditorTheme(appTheme: 'light' | 'dark'): string {
  return appTheme === 'dark' ? 'mgview-motiongenesis-dark' : 'mgview-motiongenesis-light';
}

export const motionGenesisLanguageId = LANGUAGE_ID;
