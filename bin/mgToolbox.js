const path = require('path');
const { resolveMotionGenesisCommand } = require('./motionGenesisRunner.js');

function resolveMotionGenesisToolboxDir(sceneDirectory, workspaceRoot, environment, platform) {
  const { command } = resolveMotionGenesisCommand(sceneDirectory, workspaceRoot, environment, platform);
  return path.join(path.dirname(command), 'MGToolbox');
}

function resolveMotionGenesisHelpPath(sceneDirectory, workspaceRoot, environment, platform) {
  return path.join(
    resolveMotionGenesisToolboxDir(sceneDirectory, workspaceRoot, environment, platform),
    'MotionGenesisHelp.html'
  );
}

module.exports = {
  resolveMotionGenesisToolboxDir,
  resolveMotionGenesisHelpPath,
};
