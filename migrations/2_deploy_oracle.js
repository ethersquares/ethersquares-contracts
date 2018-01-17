const AcceptedScoreOracle = artifacts.require('AcceptedScoreOracle');

module.exports = function (deployer) {
  deployer.deploy(AcceptedScoreOracle);
};
