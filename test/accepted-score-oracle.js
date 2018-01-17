const AcceptedScoreOracle = artifacts.require('AcceptedScoreOracle');
const MockedTimeAcceptedScoreOracle = artifacts.require('MockedTimeAcceptedScoreOracle');
const expectThrow = require('./util/expectThrow');
const getBalance = require('./util/getBalance');

const GAME_TIME = 1517787000;
const ONE_DAY = 86400;
const VOTING_PERIOD_DURATION = ONE_DAY * 7;

contract('AcceptedScoreOracle', ([ owner, ...others ]) => {
  let acceptedScoreOracle;

  before(async () => {
    acceptedScoreOracle = await AcceptedScoreOracle.deployed();
  });

  it('is deployed', async () => {
    assert.strictEqual(typeof acceptedScoreOracle.address, 'string');
  });

  it('is owned by the owner', async () => {
    const ownedBy = await acceptedScoreOracle.owner();
    assert.strictEqual(ownedBy, owner);
  });
});