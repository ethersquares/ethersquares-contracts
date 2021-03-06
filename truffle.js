const HDWalletProvider = require('truffle-hdwallet-provider');

const ONE_GWEI = Math.pow(10, 9);

module.exports = {
  networks: {
    kovan: {
      provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC_KOVAN, `https://kovan.infura.io/${process.env.INFURA_API_KEY}`);
      },
      network_id: '42',
      gasPrice: 20 * ONE_GWEI
    },
    ropsten: {
      provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC_ROPSTEN, `https://ropsten.infura.io/${process.env.INFURA_API_KEY}`);
      },
      network_id: '3',
      gasPrice: 60 * ONE_GWEI,
      gas: 3000000
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC_MAINNET, `https://mainnet.infura.io/${process.env.INFURA_API_KEY}`);
      },
      network_id: '1',
      gas: 2000000,
      gasPrice: 7 * ONE_GWEI
    }
  }
};
