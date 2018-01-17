const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    kovan: {
      provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC_KOVAN, `https://kovan.infura.io/${process.env.INFURA_API_KEY}`);
      },
      network_id: '42', // Match any network id
      gasPrice: 20
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC_MAINNET, `https://mainnet.infura.io/${process.env.INFURA_API_KEY}`);
      },
      network_id: '1', // Match any network id
      gasPrice: 51
    }
  }
};
