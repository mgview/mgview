import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMotionGenesisOutput } from './parseMotionGenesisOutput.ts';

test('parseMotionGenesisOutput groups long ODE output into collapsible blocks', () => {
  const output = [
    '   (10) NewtonianFrame N',
    '   (11) ODE() mydata',
    '% time data',
    '0.000E+00  1.000E+00',
    '1.000E-01  9.900E-01',
    '2.000E-01  9.800E-01',
    '3.000E-01  9.700E-01',
    '4.000E-01  9.600E-01',
    '5.000E-01  9.500E-01',
    '6.000E-01  9.400E-01',
    '7.000E-01  9.300E-01',
    '8.000E-01  9.200E-01',
    'ODE completed in 0.12 seconds.',
    '   (12) QUIT',
  ].join('\n');

  const segments = parseMotionGenesisOutput(output);
  const odeBlock = segments.find((segment) => segment.type === 'ode-block');

  assert.ok(odeBlock);
  assert.equal(odeBlock.type, 'ode-block');
  assert.equal(odeBlock.lines.length, 10);
  assert.equal(odeBlock.collapsedByDefault, true);
  assert.match(odeBlock.commandLine, /ODE\(\)/);
  assert.equal(segments.filter((segment) => segment.type === 'line').length, 3);
});

test('parseMotionGenesisOutput leaves short ODE blocks expanded by default', () => {
  const output = ['   (11) ODE() mydata', '% header', '0.000E+00  1.000E+00', 'ODE completed.'].join('\n');
  const odeBlock = parseMotionGenesisOutput(output).find((segment) => segment.type === 'ode-block');

  assert.ok(odeBlock);
  assert.equal(odeBlock.lines.length, 2);
  assert.equal(odeBlock.collapsedByDefault, false);
});
