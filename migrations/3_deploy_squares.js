const Squares = artifacts.require('Squares');
const AcceptedScoreOracle = artifacts.require('AcceptedScoreOracle');

module.exports = function (deployer) {
  deployer.deploy(Squares, AcceptedScoreOracle.address);
};
