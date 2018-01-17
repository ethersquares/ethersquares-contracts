const OwnedScoreOracle = artifacts.require('OwnedScoreOracle');
const MockedTimeOwnedScoreOracle = artifacts.require('MockedTimeOwnedScoreOracle');
const expectThrow = require('./util/expectThrow');
const getBalance = require('./util/getBalance');

const GAME_TIME = 1517787000;
const ONE_DAY = 86400;

contract('OwnedScoreOracle', ([ owner, ...others ]) => {
  const [ account1, account2, account3, account4 ] = others;

  let ownedScoreOracle;

  before(async () => {
    ownedScoreOracle = await OwnedScoreOracle.deployed();
  });

  it('is deployed', async () => {
    assert.strictEqual(typeof ownedScoreOracle.address, 'string');
  });

  it('is owned by the owner', async () => {
    const ownedBy = await ownedScoreOracle.owner();
    assert.strictEqual(ownedBy, owner);
  });

  describe('#SCORE_REPORT_START_TIME', () => {
    let scoreReportStartTime, gameTime;

    beforeEach(async () => {
      let oracle = await MockedTimeOwnedScoreOracle.new({ from: owner });
      scoreReportStartTime = await oracle.SCORE_REPORT_START_TIME();
      gameTime = await oracle.GAME_START_TIME();
    });

    it('is 1 day after the game', async () => {
      assert.strictEqual(scoreReportStartTime.sub(gameTime).valueOf(), '86400');
    });
  });

  describe('#getSquareWins', () => {
    let oracle;

    beforeEach(async () => {
      oracle = await MockedTimeOwnedScoreOracle.new({ from: owner });
      await oracle.setTime(GAME_TIME + ONE_DAY, { from: owner });

      await oracle.setSquareWins(1, 5, 2, { from: owner });
      await oracle.setSquareWins(5, 8, 1, { from: owner });
      await oracle.setSquareWins(9, 1, 1, { from: owner });
    });

    it('returns 4 for total', async () => {
      const [ squareWins, totalWins ] = await oracle.getSquareWins(1, 5);
      assert.strictEqual(squareWins.valueOf(), '2');
      assert.strictEqual(totalWins.valueOf(), '4');
    });

    it('returns the number of wins in that square', async () => {
      const [ squareWins, totalWins ] = await oracle.getSquareWins(5, 8);
      assert.strictEqual(squareWins.valueOf(), '1');
      assert.strictEqual(totalWins.valueOf(), '4');
    });

    it('returns 0 for other squares', async () => {
      const [ squareWins, totalWins ] = await oracle.getSquareWins(1, 2);
      assert.strictEqual(squareWins.valueOf(), '0');
      assert.strictEqual(totalWins.valueOf(), '4');
    });
  });

  describe('#finalize', () => {
    let oracle;

    beforeEach(async () => {
      oracle = await MockedTimeOwnedScoreOracle.new({ from: owner });
      await oracle.setTime(GAME_TIME + ONE_DAY, { from: owner });

      await oracle.setSquareWins(1, 5, 2, { from: owner });
      await oracle.setSquareWins(5, 8, 1, { from: owner });
      await oracle.setSquareWins(9, 1, 1, { from: owner });
    });

    it('fails if not exactly 4 wins reported', async () => {
      assert.strictEqual((await oracle.finalized()), false);
    });

    it('can be called only by the owner', async () => {
      await expectThrow(oracle.finalize({ from: account1 }));
    });

    it('succeeds if 4 wins reported', async () => {
      assert.strictEqual((await oracle.finalized()), false);
      assert.strictEqual((await oracle.isFinalized()), false);

      await oracle.finalize({ from: owner });

      assert.strictEqual((await oracle.finalized()), true);
      assert.strictEqual((await oracle.isFinalized()), true);
    });

    it('fires an event', async () => {
      const { logs: [ { args: { time }, event } ] } = await oracle.finalize({ from: owner });
      assert.strictEqual(event, 'LogFinalized');
      assert.strictEqual(time.valueOf(), '' + (GAME_TIME + ONE_DAY));
    });
  });

  describe('#setSquareWins', () => {
    let oracle;

    beforeEach(async () => {
      oracle = await MockedTimeOwnedScoreOracle.new({ from: owner });
      await oracle.setTime(GAME_TIME + ONE_DAY + 1);
    });

    it('may only be called by the owner', async () => {
      await expectThrow(oracle.setSquareWins(1, 5, 1, { from: account1 }));
    });

    it('may only be called one day after the game', async () => {
      await oracle.setTime(GAME_TIME - ONE_DAY);
      await expectThrow(oracle.setSquareWins(1, 5, 1, { from: owner }));

      await oracle.setTime(GAME_TIME);
      await expectThrow(oracle.setSquareWins(1, 5, 1, { from: owner }));

      await oracle.setTime(GAME_TIME + ONE_DAY - 1);
      await expectThrow(oracle.setSquareWins(1, 5, 1, { from: owner }));
    });

    it('accounts squareWins correctly', async () => {
      const before = await oracle.squareWins(1, 5);
      assert.strictEqual(before.valueOf(), '0');

      await oracle.setSquareWins(1, 5, 1, { from: owner });
      const after = await oracle.squareWins(1, 5);
      assert.strictEqual(after.valueOf(), '1');
      assert.strictEqual((await oracle.winsReported()).valueOf(), '1');


      assert.strictEqual((await oracle.squareWins(4, 2)).valueOf(), '0');
      await oracle.setSquareWins(4, 2, 1, { from: owner });
      assert.strictEqual((await oracle.squareWins(4, 2)).valueOf(), '1');
      assert.strictEqual((await oracle.winsReported()).valueOf(), '2');

      await oracle.setSquareWins(4, 2, 2, { from: owner });
      assert.strictEqual((await oracle.squareWins(4, 2)).valueOf(), '2');
      assert.strictEqual((await oracle.winsReported()).valueOf(), '3');
    });

    it('logs events', async () => {
      let { logs: [ { event, args: { home, away, wins } } ] } = await oracle.setSquareWins(2, 3, 1, { from: owner });

      assert.strictEqual(event, 'LogSquareWinsUpdated');
      assert.strictEqual(home.valueOf(), '2');
      assert.strictEqual(away.valueOf(), '3');
      assert.strictEqual(wins.valueOf(), '1');

      ({ logs: [ { event, args: { home, away, wins } } ] } = await oracle.setSquareWins(6, 1, 3, { from: owner }));

      assert.strictEqual(event, 'LogSquareWinsUpdated');
      assert.strictEqual(home.valueOf(), '6');
      assert.strictEqual(away.valueOf(), '1');
      assert.strictEqual(wins.valueOf(), '3');
    });

    it('must be called on a valid square', async () => {
      await expectThrow(oracle.setSquareWins(0, 11, 1, { from: owner }));
      await expectThrow(oracle.setSquareWins(5, 12, 1, { from: owner }));
      await expectThrow(oracle.setSquareWins(12, 0, 1, { from: owner }));
      await expectThrow(oracle.setSquareWins(10, 4, 1, { from: owner }));
      await expectThrow(oracle.setSquareWins(3, 10, 1, { from: owner }));
    });
  });

});