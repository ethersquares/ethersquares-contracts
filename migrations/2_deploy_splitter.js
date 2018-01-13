const Splitter = artifacts.require('Splitter');

const MOODY_WALLET = '0x9A404278CfD489d9B175E4cF18dfAC7eb6770BB9';
const NOAH_WALLET = '0xFecF1a41ae6209243fA63C707B6A91CB8c36A338';

// TODO: REPLACE THESE
const JOSH_WALLET = '0x0000000000000000000000000000000000000000';

module.exports = function (deployer) {
  deployer.deploy(Splitter, [ MOODY_WALLET, NOAH_WALLET, JOSH_WALLET ]);
};
