const Boxes = artifacts.require('Boxes');
const Splitter = artifacts.require('Splitter');

module.exports = function (deployer) {
  deployer.deploy(Boxes, Splitter.address);
};
