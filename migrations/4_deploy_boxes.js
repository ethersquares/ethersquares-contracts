const Boxes = artifacts.require('Boxes');
const Splitter = artifacts.require('Splitter');
const OwnedScoreOracle = artifacts.require('OwnedScoreOracle');

module.exports = function (deployer) {
  deployer.deploy(Boxes, Splitter.address, OwnedScoreOracle.address);
};
