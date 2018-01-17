const OwnedScoreOracle = artifacts.require('OwnedScoreOracle');

module.exports = function (deployer) {
  deployer.deploy(OwnedScoreOracle);
};
