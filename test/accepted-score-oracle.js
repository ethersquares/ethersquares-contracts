const AcceptedScoreOracle = artifacts.require('AcceptedScoreOracle');
const Squares = artifacts.require('Squares');
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

  it('points at the squares contract', async () => {
    const voterStakes = await acceptedScoreOracle.voterStakes();
    const squares = await Squares.deployed();
    assert.strictEqual(voterStakes, squares.address);
  });

  describe('#setVoterStakeContract', async () => {
    it('may only be called once');
  });

  describe('#finalize', async () => {
    it('sets finalized to true');
    it('may not be called twice in a row');
    it('sets votingPeriodStartTime to current time');
    it('sets affirmations to 0');
    it('sets totalVotes to 0');
  });

  describe('#accept', async () => {
    it('requires the score to be finalized');
    it('requires the voting period duration to have been met');
    it('requires the score to not have already been accepted');
    it('fires a log event LogAccepted(uint time)');
  });

  describe('#unfinalize', async () => {
    it('requires that the score is finalized');
    it('requires that the score is not accepted');
    it('requires that the voting period has been waited');
    it('requires that a majority was not reached');
    it('sets finalized to false, allowing the score to be edited once again');
    it('fires a log event LogUnfinalized(uint time)');
  });

  describe('#vote', async () => {
    it('requires the address to have stake');
    it('increments affirmations by user stake');
    it('increments totalVotes by user stake');
    it('only is allowed if the voting period is started');
    it('is allowed even after the voting period duration has lapsed');
  });

  describe('#isFinalized', () => {
    it('is not true until the score has been finalized by the owner and accepted by voters');
  });
});