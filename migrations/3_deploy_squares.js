const Squares = artifacts.require('Squares');
const OwnedScoreOracle = artifacts.require('OwnedScoreOracle');

module.exports = function (deployer) {
  deployer.deploy(Squares, OwnedScoreOracle.address);
};
