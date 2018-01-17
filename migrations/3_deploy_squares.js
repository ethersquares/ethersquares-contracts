const Squares = artifacts.require('Squares');
const AcceptedScoreOracle = artifacts.require('AcceptedScoreOracle');

const MOODY_WALLET = '0x03A23E66D9B3BdC6186253F9677fBb0212c38a69';

module.exports = function (deployer) {
  deployer.deploy(Squares, AcceptedScoreOracle.address, MOODY_WALLET);
};
