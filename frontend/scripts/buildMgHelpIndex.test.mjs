import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMgHelpIndex, extractKeywordIndexHtml } from './buildMgHelpIndex.mjs';

const sampleHtml = `<!DOCTYPE html><html><body>
<a ID="Help"><b>Help</b></a>
<hr style="border: 0.1875em solid darkBlue">
<PRE>
<a href="#NewtonianFrame"><b>NewtonianFrame</b></a>
<a href="#NewtonianFrame"><b>Newtonian</b></a>
<a href="#pi"><b>pi</b></a>
Type  HELP NAME  for help with NAME
</PRE>
<a ID="NewtonianFrame"><span><b>NewtonianFrame</b></span></a><hr><PRE>
NewtonianFrame

 Purpose:  Declares a Newtonian (inertial) reference frame.

Syntax 1:  NewtonianFrame N
Syntax 2:  NewtonianFrame

 Related:  <a href="#RigidFrame"><b>RigidFrame</b></a>

   (1) %--------------------------------------------------------------------
   (2) % Example: NewtonianFrame
   (4) NewtonianFrame N
--> (8) v_Q_N> = 2*Nx> + 4*Ny>

</PRE><a ID="pi"><span><b>pi</b></span></a><hr><PRE>
pi

 Purpose:  The ratio of a circle's circumference to its diameter.

Syntax 1:  pi

</PRE></body></html>`;

test('buildMgHelpIndex extracts purpose and syntax without examples', () => {
  const index = buildMgHelpIndex(sampleHtml, 'sample.html');
  const topic = index.topics.NewtonianFrame;
  assert.ok(topic);
  assert.equal(topic.title, 'NewtonianFrame');
  assert.match(topic.purpose, /Newtonian \(inertial\)/);
  assert.equal(topic.syntax.length, 2);
  assert.equal(topic.syntax[0], 'Syntax 1:  NewtonianFrame N');
  assert.ok(index.aliasToId.Newtonian === 'NewtonianFrame');
  assert.ok(index.keywords.includes('NewtonianFrame'));
});

test('buildMgHelpIndex includes pi topics', () => {
  const index = buildMgHelpIndex(sampleHtml, 'sample.html');
  assert.equal(index.topics.pi.purpose.includes('circumference'), true);
});

test('buildMgHelpIndex adds lowercase aliases for case-insensitive lookup', () => {
  const index = buildMgHelpIndex(sampleHtml, 'sample.html');
  assert.equal(index.aliasToId.newtonianframe, 'NewtonianFrame');
  assert.equal(index.aliasToId.newtonian, 'NewtonianFrame');
});

test('extractKeywordIndexHtml bounds the catalog between Help and Type HELP NAME', () => {
  const catalogHtml = `<html><body>
<a ID="Help"><b>Help</b></a>
<hr style="border: 0.1875em solid darkBlue">
<PRE>
<a href="#Solve"><b>Solve</b></a>
Type  HELP NAME  for help with NAME
</PRE>
<a ID="Solve"><b>Solve</b></a><hr><PRE>
Syntax:  QB.TranslateAcrossJoint( fromPoint, positionVector )
</PRE></body></html>`;
  const indexHtml = extractKeywordIndexHtml(catalogHtml);
  assert.match(indexHtml, /Solve/);
  assert.doesNotMatch(indexHtml, /TranslateAcrossJoint/);

  const index = buildMgHelpIndex(catalogHtml, 'sample.html');
  assert.equal(index.aliasToId.QB, undefined);
  assert.equal(index.aliasToId.qb, undefined);
  assert.equal(index.aliasToId.Solve, 'Solve');
});
