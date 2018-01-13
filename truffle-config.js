const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    kovan: {
      provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC, 'wss://mainnet.infura.io/ws');
      },
      network_id: '42' // Match any network id
    }
  }
};
