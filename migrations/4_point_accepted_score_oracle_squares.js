const Squares = artifacts.require('Squares');
const AcceptedScoreOracle = artifacts.require('AcceptedScoreOracle');

module.exports = function (deployer) {
  deployer.then(async () => {
    const acceptedScoreOracle = await AcceptedScoreOracle.deployed();
    await acceptedScoreOracle.setVoterStakesContract(Squares.address);
  })
};
