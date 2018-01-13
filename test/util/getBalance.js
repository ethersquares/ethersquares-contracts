module.exports = function (address) {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(address, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};