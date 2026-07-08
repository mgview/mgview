/**
 * Parse MotionGenesisHelp.html into a compact index for Monaco syntax + hovers.
 *
 * Usage:
 *   node scripts/buildMgHelpIndex.mjs [path/to/MotionGenesisHelp.html | MotionGenesis folder] [--version <mg-version>]
 *
 * Help file resolution (first match wins):
 *   1. First CLI argument (help HTML file or MotionGenesis install folder)
 *   2. MG_HELP_HTML (path to MotionGenesisHelp.html)
 *   3. MG_HOME or MOTION_GENESIS_HOME (MotionGenesis install folder)
 *   4. Platform default, then ~/MotionGenesis
 *
 * Default source version metadata comes from frontend/package.json.
 * Override source version metadata with MG_HELP_VERSION or --version.
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const HELP_RELATIVE_SEGMENTS = ['MGToolbox', 'MotionGenesisHelp.html'];

export function helpPathFromInstallDir(installDir) {
  return path.join(installDir, ...HELP_RELATIVE_SEGMENTS);
}

export function getMotionGenesisInstallCandidates() {
  const candidates = [];

  if (process.platform === 'win32') {
    candidates.push('C:\\MotionGenesis');
  } else {
    candidates.push('/Applications/MotionGenesis');
  }

  candidates.push(path.join(os.homedir(), 'MotionGenesis'));

  return candidates;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveHelpPathFromArg(argPath) {
  const resolved = path.resolve(argPath);
  if (resolved.toLowerCase().endsWith('.html')) {
    return resolved;
  }

  const helpPath = helpPathFromInstallDir(resolved);
  if (await pathExists(helpPath)) {
    return helpPath;
  }

  return resolved;
}

export async function resolveMotionGenesisHelpPath(options = {}) {
  const env = options.env ?? process.env;
  const cliPath = options.helpPath;

  if (cliPath) {
    return resolveHelpPathFromArg(cliPath);
  }

  if (typeof env.MG_HELP_HTML === 'string' && env.MG_HELP_HTML.trim().length > 0) {
    return path.resolve(env.MG_HELP_HTML.trim());
  }

  const installDirOverride = env.MG_HOME || env.MOTION_GENESIS_HOME;
  if (typeof installDirOverride === 'string' && installDirOverride.trim().length > 0) {
    const helpPath = helpPathFromInstallDir(path.resolve(installDirOverride.trim()));
    if (await pathExists(helpPath)) {
      return helpPath;
    }
  }

  const candidates = options.installCandidates ?? getMotionGenesisInstallCandidates();
  for (const installDir of candidates) {
    const helpPath = helpPathFromInstallDir(installDir);
    if (await pathExists(helpPath)) {
      return helpPath;
    }
  }

  return helpPathFromInstallDir(candidates[0]);
}

const MAX_PURPOSE_CHARS = 320;
const MAX_SYNTAX_LINES = 6;
const MAX_SYNTAX_LINE_CHARS = 120;

function parseCliArgs(argv) {
  let helpPath;
  let sourceVersion;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--version') {
      sourceVersion = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg.startsWith('--version=')) {
      sourceVersion = arg.slice('--version='.length);
      continue;
    }
    if (!helpPath) {
      helpPath = arg;
    }
  }

  return {
    helpPath,
    sourceVersion,
  };
}

async function readPackageSourceVersion() {
  const packageJsonPath = path.resolve(scriptDir, '../package.json');
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    return typeof packageJson.motionGenesisHelpVersion === 'string'
      ? packageJson.motionGenesisHelpVersion
      : null;
  } catch {
    return null;
  }
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/a>/gi, '')
    .replace(/<a[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, '').replace(/^\s+/g, (match) => (match.length > 0 ? ' ' : '')))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function isExampleLine(line) {
  const trimmed = line.trim();
  return (
    /^\(\d+\)\s/.test(trimmed) ||
    /^->\s*\(\d+\)/.test(trimmed) ||
    /^%\s*-{3,}/.test(trimmed) ||
    /^%\s*Example:/i.test(trimmed)
  );
}

function extractPurpose(bodyLines) {
  const start = bodyLines.findIndex((line) => /^Purpose:/i.test(line.trim()));
  if (start < 0) {
    return '';
  }

  const parts = [];
  const first = bodyLines[start].replace(/^Purpose:\s*/i, '').trim();
  if (first) {
    parts.push(first);
  }

  for (let index = start + 1; index < bodyLines.length; index += 1) {
    const line = bodyLines[index].trim();
    if (!line) {
      if (parts.length > 0) {
        break;
      }
      continue;
    }
    if (/^(Syntax|Related|Input|Output|Remark)\b/i.test(line)) {
      break;
    }
    if (isExampleLine(line)) {
      break;
    }
    parts.push(line);
  }

  return truncate(normalizeWhitespace(parts.join(' ')), MAX_PURPOSE_CHARS);
}

function extractSyntax(bodyLines) {
  const syntax = [];
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (!/^Syntax\b/i.test(trimmed)) {
      continue;
    }
    if (isExampleLine(trimmed)) {
      continue;
    }
    syntax.push(truncate(trimmed, MAX_SYNTAX_LINE_CHARS));
    if (syntax.length >= MAX_SYNTAX_LINES) {
      break;
    }
  }
  return syntax;
}

function addCaseInsensitiveAliases(aliasToId) {
  for (const [alias, topicId] of [...aliasToId.entries()]) {
    const lower = alias.toLowerCase();
    if (!aliasToId.has(lower)) {
      aliasToId.set(lower, topicId);
    }
  }
}

function extractTitle(bodyText, id) {
  const firstLine = bodyText.split('\n').find((line) => line.trim().length > 0)?.trim() ?? '';
  if (firstLine && !/^Purpose:/i.test(firstLine)) {
    return firstLine.split(/\s{2,}/)[0] ?? id;
  }
  return id;
}

function parseSections(html) {
  const sectionPattern = /<a\s+ID="([^"]+)">/gi;
  const matches = [...html.matchAll(sectionPattern)];
  const sections = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const id = match[1];
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : html.length;
    const chunk = html.slice(bodyStart, bodyEnd);
    const preMatch = chunk.match(/<PRE>([\s\S]*?)<\/PRE>/i);
    if (!preMatch) {
      continue;
    }

    const bodyText = normalizeWhitespace(stripHtml(preMatch[1]));
    const bodyLines = bodyText.split('\n');
    const exampleStart = bodyLines.findIndex((line) => isExampleLine(line));
    const docLines = exampleStart >= 0 ? bodyLines.slice(0, exampleStart) : bodyLines;

    sections.push({
      id,
      title: extractTitle(bodyText, id),
      purpose: extractPurpose(docLines),
      syntax: extractSyntax(docLines),
    });
  }

  return sections;
}

/**
 * The keyword catalog is the PRE block after the Help heading's blue rule, ending at
 * "Type  HELP NAME  for help with NAME".
 */
export function extractKeywordIndexHtml(html) {
  const helpMatch = html.match(/<a\s+ID="Help">/i);
  if (!helpMatch || helpMatch.index === undefined) {
    return '';
  }

  const afterHelp = html.slice(helpMatch.index);
  const firstBlueRule = afterHelp.search(/<hr[^>]*border:\s*0\.1875em\s+solid\s+darkBlue/i);
  if (firstBlueRule < 0) {
    return '';
  }

  const afterRule = afterHelp.slice(firstBlueRule);
  const indexPre = afterRule.match(/<PRE>([\s\S]*?)<\/PRE>/i);
  if (!indexPre || !/Type\s+HELP\s+NAME/i.test(indexPre[1])) {
    return '';
  }

  return indexPre[1];
}

function parseIndexAliases(indexHtml) {
  const aliasToId = new Map();
  const linkPattern = /<a\s+href="#([^"]+)">\s*<b>([^<]+)<\/b>\s*<\/a>/gi;
  for (const match of indexHtml.matchAll(linkPattern)) {
    const id = match[1];
    const alias = match[2].trim();
    if (!alias || alias === '...') {
      continue;
    }
    if (!aliasToId.has(alias)) {
      aliasToId.set(alias, id);
    }
  }
  return aliasToId;
}

export function buildMgHelpIndex(html, options = {}) {
  const sourceVersion = typeof options.sourceVersion === 'string' ? options.sourceVersion : null;
  const indexHtml = extractKeywordIndexHtml(html);
  const aliasToId = parseIndexAliases(indexHtml);
  const topics = {};
  const keywords = new Set();

  for (const section of parseSections(html)) {
    const aliases = [];
    for (const [alias, topicId] of aliasToId.entries()) {
      if (topicId === section.id && alias !== section.id && !aliases.includes(alias)) {
        aliases.push(alias);
      }
    }
    aliases.sort((left, right) => right.length - left.length || left.localeCompare(right));

    topics[section.id] = {
      id: section.id,
      title: section.title,
      aliases,
      purpose: section.purpose,
      syntax: section.syntax,
    };
  }

  addCaseInsensitiveAliases(aliasToId);

  for (const [alias, topicId] of aliasToId.entries()) {
    if (alias === '...') {
      continue;
    }
    keywords.add(alias);
    const topic = topics[topicId];
    if (topic) {
      keywords.add(topic.title);
    }
  }

  const sortedKeywords = [...keywords]
    .filter((keyword) => keyword.length > 0)
    .sort((left, right) => right.length - left.length || left.localeCompare(right));

  return {
    version: 1,
    sourceVersion,
    topicCount: Object.keys(topics).length,
    topics,
    aliasToId: Object.fromEntries(aliasToId.entries()),
    keywords: sortedKeywords,
  };
}

async function main() {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  const helpPath = await resolveMotionGenesisHelpPath({ helpPath: cliArgs.helpPath });
  const packageSourceVersion = await readPackageSourceVersion();
  const sourceVersion = cliArgs.sourceVersion || process.env.MG_HELP_VERSION || packageSourceVersion || null;
  const outputPath = path.resolve(scriptDir, '../src/core/mgLanguage/mgHelpIndex.data.json');
  const publicHelpPath = path.resolve(scriptDir, '../public/mg-help/MotionGenesisHelp.html');

  let html;
  try {
    html = await fs.readFile(helpPath, 'utf8');
  } catch (error) {
    try {
      await fs.access(outputPath);
      console.warn(
        `Motion Genesis help not found at ${helpPath}; keeping existing ${path.relative(process.cwd(), outputPath)}.`
      );
      return;
    } catch {
      throw new Error(
        `Motion Genesis help not found at ${helpPath}. Install Motion Genesis or pass a path to MotionGenesisHelp.html.`,
        { cause: error }
      );
    }
  }

  const index = buildMgHelpIndex(html, { sourceVersion });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await fs.mkdir(path.dirname(publicHelpPath), { recursive: true });
  await fs.copyFile(helpPath, publicHelpPath);
  console.log(`Wrote ${index.topicCount} topics to ${outputPath}`);
  console.log(`Copied help HTML to ${publicHelpPath}`);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
