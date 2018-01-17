const AcceptedScoreOracle = artifacts.require('AcceptedScoreOracle');
const Squares = artifacts.require('Squares');
const MockedTimeAcceptedScoreOracle = artifacts.require('MockedTimeAcceptedScoreOracle');
const MockKnowsVoterStakes = artifacts.require('MockKnowsVoterStakes');
const expectThrow = require('./util/expectThrow');
const getBalance = require('./util/getBalance');

const GAME_TIME = 1517787000;
const ONE_DAY = 86400;
const VOTING_PERIOD_DURATION = ONE_DAY * 7;

contract('AcceptedScoreOracle', ([ owner, better1, better2, better3, better4, ...others ]) => {
  let acceptedScoreOracle, mockVoterStakes;

  before(async () => {
    acceptedScoreOracle = await AcceptedScoreOracle.deployed();
    mockVoterStakes = await MockKnowsVoterStakes.new([ better1, better2, better3, better4 ], [ 1, 2, 3, 4 ], { from: owner });
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

  it('voting period duration is 7 days', async () => {
    assert.strictEqual((await acceptedScoreOracle.VOTING_PERIOD_DURATION()).valueOf(), '' + VOTING_PERIOD_DURATION);
  });

  describe('#setVoterStakesContract', async () => {
    let aso;

    beforeEach(async () => {
      aso = await AcceptedScoreOracle.new({ from: owner });
    });

    it('may only be called once', async () => {
      await aso.setVoterStakesContract(others[ 0 ], { from: owner });
      await expectThrow(aso.setVoterStakesContract(others[ 0 ], { from: owner }));
    });

    it('may not be called by anyone other than the owner', async () => {
      await expectThrow(aso.setVoterStakesContract(others[ 0 ], { from: others[ 0 ] }));
      await expectThrow(aso.setVoterStakesContract(others[ 0 ], { from: others[ 1 ] }));
    });
  });

  describe('#finalize', async () => {
    let aso;

    beforeEach(async () => {
      aso = await MockedTimeAcceptedScoreOracle.new({ from: owner });
      aso.setTime(GAME_TIME + ONE_DAY);
      await aso.setSquareWins(1, 1, 1, { from: owner });
      await aso.setSquareWins(2, 2, 1, { from: owner });
      await aso.setSquareWins(3, 3, 1, { from: owner });
      await aso.setSquareWins(4, 4, 1, { from: owner });
      await aso.setVoterStakesContract(mockVoterStakes.address, { from: owner });
    });

    it('sets finalized to true', async () => {
      assert.strictEqual(await aso.finalized(), false);
      await aso.finalize({ from: owner });
      assert.strictEqual(await aso.finalized(), true);
    });

    it('may not be called twice in a row', async () => {
      await aso.finalize({ from: owner });
      await expectThrow(aso.finalize({ from: owner }));
    });

    it('may only be called by owner', async () => {
      await expectThrow(aso.finalize({ from: others[ 0 ] }));
      await expectThrow(aso.finalize({ from: others[ 1 ] }));
      await aso.finalize({ from: owner });
    });


    it('sets votingPeriodStartTime to current time', async () => {
      await aso.setTime(GAME_TIME + ONE_DAY * 2);
      await aso.finalize({ from: owner });
      assert.strictEqual((await aso.votingPeriodStartTime()).valueOf(), '' + (GAME_TIME + (ONE_DAY * 2)));
    });


    it('sets votingPeriodBlockNumber to transaction block number', async () => {
      assert.strictEqual((await aso.votingPeriodBlockNumber()).valueOf(), '0');
      const tx = await aso.finalize({ from: owner });
      assert.strictEqual((await aso.votingPeriodBlockNumber()).valueOf(), '' + tx.receipt.blockNumber);
    });

    it('resets totalVotes & affirmations to 0', async () => {
      // starts at 0
      assert.strictEqual((await aso.affirmations()).valueOf(), '0');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '0');

      // finalize and then vote
      await aso.finalize({ from: owner });

      // still 0
      assert.strictEqual((await aso.affirmations()).valueOf(), '0');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '0');

      // now it's 1 + 2 out of 6, which is not enough
      await aso.vote(true, { from: better1 });
      await aso.vote(true, { from: better2 });
      await aso.vote(false, { from: better3 });
      assert.strictEqual((await aso.affirmations()).valueOf(), '3');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '6');

      // times up, unfinalized
      const time = (await aso.time());
      await aso.setTime(time.plus(VOTING_PERIOD_DURATION).plus(1));
      await expectThrow(aso.accept({ from: others[ 1 ] }));
      await aso.unfinalize({ from: others[ 2 ] });

      // still 3
      assert.strictEqual((await aso.affirmations()).valueOf(), '3');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '6');

      await aso.finalize({ from: owner });
      assert.strictEqual((await aso.affirmations()).valueOf(), '0');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '0');
    });
  });

  describe.only('#vote', async () => {
    let aso;

    beforeEach(async () => {
      aso = await MockedTimeAcceptedScoreOracle.new({ from: owner });
      aso.setTime(GAME_TIME + ONE_DAY);
      await aso.setSquareWins(1, 1, 1, { from: owner });
      await aso.setSquareWins(2, 2, 1, { from: owner });
      await aso.setSquareWins(3, 3, 1, { from: owner });
      await aso.setSquareWins(4, 4, 1, { from: owner });
      await aso.setVoterStakesContract(mockVoterStakes.address, { from: owner });
      await aso.finalize({ from: owner });
    });

    it('requires the address to have stake', async () => {
      await expectThrow(aso.vote(true, { from: others[ 0 ] }));
    });

    it('increments affirmations by user\'s stake if affirm === true', async () => {
      assert.strictEqual((await aso.affirmations()).valueOf(), '0');

      await aso.vote(true, { from: better2 });
      assert.strictEqual((await aso.affirmations()).valueOf(), '2');

      await aso.vote(false, { from: better3 });
      assert.strictEqual((await aso.affirmations()).valueOf(), '2');

      await aso.vote(true, { from: better4 });
      assert.strictEqual((await aso.affirmations()).valueOf(), '6');
    });

    it('increments totalVotes by user\'s stake always', async () => {
      assert.strictEqual((await aso.totalVotes()).valueOf(), '0');

      await aso.vote(true, { from: better2 });
      assert.strictEqual((await aso.totalVotes()).valueOf(), '2');

      await aso.vote(true, { from: better3 });
      assert.strictEqual((await aso.totalVotes()).valueOf(), '5');
    });

    it('is allowed even after the voting period duration has lapsed', async () => {
      await aso.setTime(GAME_TIME + VOTING_PERIOD_DURATION + ONE_DAY);
      await aso.vote(true, { from: better1 });
    });

    it('allows a user to change their vote and counts it correctly', async () => {
      await aso.vote(true, { from: better1 });
      assert.strictEqual((await aso.affirmations()).valueOf(), '1');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '1');

      await aso.vote(false, { from: better1 });
      assert.strictEqual((await aso.affirmations()).valueOf(), '0');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '1');

      await aso.vote(false, { from: better2 });
      assert.strictEqual((await aso.affirmations()).valueOf(), '0');
      assert.strictEqual((await aso.totalVotes()).valueOf(), '3');
    });
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

  describe('#isFinalized', () => {
    it('is not true until the score has been finalized by the owner and accepted by voters');
  });
});