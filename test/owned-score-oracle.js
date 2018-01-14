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

  describe('#reportWinner', () => {
    let oracle;

    beforeEach(async () => {
      oracle = await MockedTimeOwnedScoreOracle.new(owner, { from: owner });
    });

    it('may only be called by the owner', async () => {
      await oracle.setTime(GAME_TIME + ONE_DAY);
      await expectThrow(oracle.reportWinner(1, 5, { from: account1 }));
    });

    it('may only be called after the game', async () => {
      await oracle.setTime(GAME_TIME - ONE_DAY);
      await expectThrow(oracle.reportWinner(1, 5, { from: owner }));
    });

    it('may only be called 4 times', async () => {
      await oracle.setTime(GAME_TIME + ONE_DAY);

      for (let i = 0; i < 4; i++) {
        await oracle.reportWinner(1, 5, { from: owner });
      }

      await expectThrow(oracle.reportWinner(1, 5, { from: owner }));
    });

    it('accounts boxQuartersWon correctly', async () => {
      await oracle.setTime(GAME_TIME + ONE_DAY);

      const before = await oracle.boxQuartersWon(1, 5);
      assert.strictEqual(before.valueOf(), '0');

      await oracle.reportWinner(1, 5, { from: owner });
      const after = await oracle.boxQuartersWon(1, 5);
      assert.strictEqual(after.valueOf(), '1');


      assert.strictEqual((await oracle.boxQuartersWon(4, 2)).valueOf(), '0');
      await oracle.reportWinner(4, 2, { from: owner });
      assert.strictEqual((await oracle.boxQuartersWon(4, 2)).valueOf(), '1');

      await oracle.reportWinner(4, 2, { from: owner });
      assert.strictEqual((await oracle.boxQuartersWon(4, 2)).valueOf(), '2');
    });


    it('must be called on a valid box', async () => {
      await oracle.setTime(GAME_TIME + ONE_DAY);

      await expectThrow(oracle.reportWinner(0, 11, { from: owner }));
      await expectThrow(oracle.reportWinner(5, 12, { from: owner }));
      await expectThrow(oracle.reportWinner(12, 0, { from: owner }));
      await expectThrow(oracle.reportWinner(10, 4, { from: owner }));
      await expectThrow(oracle.reportWinner(3, 10, { from: owner }));
    });
  });

});