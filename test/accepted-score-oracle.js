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
  let deployedAso, mockVoterStakes;

  before(async () => {
    deployedAso = await AcceptedScoreOracle.deployed();
    mockVoterStakes = await MockKnowsVoterStakes.new([ better1, better2, better3, better4 ], [ 1, 2, 3, 4 ], { from: owner });
  });

  it('is deployed', async () => {
    assert.strictEqual(typeof deployedAso.address, 'string');
  });

  it('is owned by the owner', async () => {
    const ownedBy = await deployedAso.owner();
    assert.strictEqual(ownedBy, owner);
  });

  it('points at the squares contract', async () => {
    const voterStakes = await deployedAso.voterStakes();
    const squares = await Squares.deployed();
    assert.strictEqual(voterStakes, squares.address);
  });

  it('voting period duration is 7 days', async () => {
    assert.strictEqual((await deployedAso.VOTING_PERIOD_DURATION()).valueOf(), '' + VOTING_PERIOD_DURATION);
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

  describe('#vote', async () => {
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

    it('requires the score to be finalized', async () => {
      await expectThrow(aso.accept());
    });

    describe('post-finalize', () => {
      let votingPeriodStartTime;
      beforeEach(async () => {
        // finalize the score
        await aso.finalize({ from: owner });
        votingPeriodStartTime = await aso.votingPeriodStartTime();

        const time = await aso.time();
        assert.strictEqual(votingPeriodStartTime.valueOf(), time.valueOf());
      });

      it('requires voters to have voted', async () => {
        await aso.setTime(votingPeriodStartTime.plus(VOTING_PERIOD_DURATION).plus(1));
        await expectThrow(aso.accept({ from: others[ 1 ] }));

        await aso.vote(true, { from: better1 });
        assert.strictEqual((await aso.totalVotes()).valueOf(), '1');
        assert.strictEqual((await aso.affirmations()).valueOf(), '1');

        await aso.accept({ from: others[ 1 ] });
      });

      it('requires the voting period duration to have been met', async () => {
        await aso.vote(true, { from: better1 });
        await expectThrow(aso.accept({ from: others[ 1 ] }));

        await aso.setTime(votingPeriodStartTime.plus(VOTING_PERIOD_DURATION).sub(1));
        await expectThrow(aso.accept({ from: others[ 1 ] }));

        await aso.setTime(votingPeriodStartTime.plus(VOTING_PERIOD_DURATION).plus(1));
        await aso.accept({ from: others[ 1 ] });
      });

      describe('requires a 2/3rds majority of voters', () => {
        beforeEach(async () => {
          await aso.setTime(votingPeriodStartTime.plus(VOTING_PERIOD_DURATION).plus(1));
        });

        it('fails for 1/3', async () => {
          await aso.vote(true, { from: better1 });
          await aso.vote(false, { from: better2 });
          await expectThrow(aso.accept({ from: others[ 0 ] }));
        });

        it('fails for 3/5', async () => {
          await aso.vote(false, { from: better1 });
          await aso.vote(false, { from: better2 });
          await aso.vote(true, { from: better3 });
          await expectThrow(aso.accept({ from: others[ 0 ] }));
        });

        it('fails for 4/7', async () => {
          await aso.vote(false, { from: better1 });
          await aso.vote(false, { from: better2 });
          await aso.vote(true, { from: better4 });
          await expectThrow(aso.accept({ from: others[ 0 ] }));
        });

        it('succeeds for 2/3', async () => {
          await aso.vote(false, { from: better1 });
          await aso.vote(true, { from: better2 });
          await aso.accept({ from: others[ 0 ] });
        });

        it('succeeds for 3/4', async () => {
          await aso.vote(false, { from: better1 });
          await aso.vote(true, { from: better3 });
          await aso.accept({ from: others[ 0 ] });
        });

        it('succeeds if unaninmous', async () => {
          await aso.vote(true, { from: better1 });
          await aso.vote(true, { from: better3 });
          await aso.accept({ from: others[ 0 ] });
        });
      });

      it('cannot be called twice', async () => {
        await aso.vote(true, { from: better1 });
        await aso.setTime(votingPeriodStartTime.plus(VOTING_PERIOD_DURATION).plus(1));

        await aso.accept({ from: others[ 1 ] });
        await expectThrow(aso.accept({ from: others[ 1 ] }));
      });

      it('fires a log event LogAccepted(uint time)', async () => {
        await aso.vote(true, { from: better1 });
        await aso.setTime(votingPeriodStartTime.plus(VOTING_PERIOD_DURATION).plus(1));

        const { logs: [ { args: { time } } ] } = await aso.accept({ from: others[ 1 ] });
        assert.strictEqual(time.valueOf(), votingPeriodStartTime.plus(VOTING_PERIOD_DURATION).plus(1).valueOf());
      });
    });
  });

  describe('#unfinalize', async () => {
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

    it('requires that the score is finalized', async () => {
      await expectThrow(aso.unfinalize());
    });

    it('requires that the score is not accepted', async () => {
      await aso.finalize({ from: owner });
      await aso.vote(true, { from: better1 });
      await aso.setTime(GAME_TIME + ONE_DAY + VOTING_PERIOD_DURATION);
      await aso.accept({ from: others[ 0 ] });
      await expectThrow(aso.unfinalize());
    });

    it('requires that the voting period has been waited', async () => {
      await aso.finalize({ from: owner });
      await aso.vote(true, { from: better1 });
      await expectThrow(aso.unfinalize());
    });

    it('requires that a majority was not reached', async () => {
      await aso.finalize({ from: owner });
      await aso.vote(true, { from: better1 });
      await aso.setTime(GAME_TIME + ONE_DAY + VOTING_PERIOD_DURATION);
      await expectThrow(aso.unfinalize());
    });

    it('sets finalized to false, allowing the score to be edited once again', async () => {
      await aso.finalize({ from: owner });
      await aso.vote(false, { from: better1 });
      await aso.setTime(GAME_TIME + ONE_DAY + VOTING_PERIOD_DURATION);
      await aso.unfinalize();

      assert.strictEqual((await aso.finalized()), false);
      await aso.setSquareWins(2, 2, 2, { from: owner });
    });

    it('fires a log event LogUnfinalized(uint time)', async () => {
      await aso.finalize({ from: owner });
      await aso.vote(false, { from: better1 });
      await aso.setTime(GAME_TIME + ONE_DAY + VOTING_PERIOD_DURATION);
      const { logs: [ { event, args: { time } } ] } = await aso.unfinalize();

      assert.strictEqual(event, 'LogUnfinalized');
      assert.strictEqual(time.valueOf(), '' + (GAME_TIME + ONE_DAY + VOTING_PERIOD_DURATION));
    });
  });

  describe('#isFinalized', () => {

    it('is not true until the score has been finalized by the owner and accepted by voters', async () => {
      const aso = await MockedTimeAcceptedScoreOracle.new({ from: owner });
      await aso.setVoterStakesContract(mockVoterStakes.address, { from: owner });

      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      aso.setTime(GAME_TIME + ONE_DAY);
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      await aso.setSquareWins(1, 1, 1, { from: owner });
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      await aso.setSquareWins(2, 2, 1, { from: owner });
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      await aso.setSquareWins(3, 3, 1, { from: owner });
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      await aso.setSquareWins(4, 4, 1, { from: owner });
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      await aso.finalize({ from: owner });

      // still not finalized, because the score is not accepted
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.finalized(), true);
      assert.strictEqual(await aso.isFinalized(), false);

      await aso.vote(true, { from: better1 });
      await aso.vote(true, { from: better2 });
      await aso.vote(true, { from: better3 });
      await aso.vote(false, { from: better4 });

      // not finalized yet
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      // cannot accept because need 66% majority and onyl have 60%
      await expectThrow(aso.accept({ from: better4 }));

      // vote is changed
      await aso.vote(true, { from: better4 });

      // now we have majority but time is not advanced enough
      await expectThrow(aso.accept({ from: better4 }));

      // advance time
      await aso.setTime(GAME_TIME + ONE_DAY + VOTING_PERIOD_DURATION + ONE_DAY);
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      // but not enough votes
      await aso.vote(false, { from: better4 });
      await expectThrow(aso.accept({ from: better4 }));
      assert.strictEqual(await aso.accepted(), false);
      assert.strictEqual(await aso.isFinalized(), false);

      // change vote back
      await aso.vote(true, { from: better4 });

      assert.strictEqual((await aso.totalVotes()).valueOf(), '10');
      assert.strictEqual((await aso.affirmations()).valueOf(), '10');

      await aso.accept({ from: others[ 0 ] });

      // score is accepted, we are now finalized
      assert.strictEqual(await aso.accepted(), true);
      assert.strictEqual(await aso.isFinalized(), true);
    });

  });
});