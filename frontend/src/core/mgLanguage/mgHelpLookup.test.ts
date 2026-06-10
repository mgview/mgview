import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMgHelpIndex } from '../../../scripts/buildMgHelpIndex.mjs';
import { buildTopicIdByLowerCase, findTopicForWord } from './mgHelpLookup.ts';

const sampleHtml = `<!DOCTYPE html><html><body>
<a href="#SetMass"><b>SetMass</b></a>
<a ID="SetMass"><span><b>SetMass</b></span></a><hr><PRE>
SetMass

 Purpose:  Sets mass.

Syntax 1:  SetMass( mass )

</PRE></body></html>`;

test('findTopicForWord resolves case-insensitive command names', () => {
  const index = buildMgHelpIndex(sampleHtml);
  const lookup = buildTopicIdByLowerCase(index);

  assert.equal(findTopicForWord(index, lookup, 'setmass')?.id, 'SetMass');
  assert.equal(findTopicForWord(index, lookup, 'SETMASS')?.id, 'SetMass');
  assert.equal(findTopicForWord(index, lookup, 'SetMass')?.id, 'SetMass');
});
