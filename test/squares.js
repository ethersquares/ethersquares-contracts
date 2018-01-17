const Squares = artifacts.require('Squares');
const MockedTimeSquares = artifacts.require('MockedTimeSquares');
const MockedTimeOwnedScoreOracle = artifacts.require('MockedTimeOwnedScoreOracle');
const expectThrow = require('./util/expectThrow');
const getBalance = require('./util/getBalance');

const GAME_TIME = 1517787000;
const ONE_DAY = 86400;

contract('Squares', ([ owner, ...betters ]) => {
  const [ better1, better2, better3, better4 ] = betters;

  let squares;

  before(async () => {
    squares = await Squares.deployed();
  });

  it('is deployed', async () => {
    assert.strictEqual(typeof squares.address, 'string');
  });

  async function createOracle(time = GAME_TIME + ONE_DAY) {
    const oracle = await MockedTimeOwnedScoreOracle.new({ from: owner });
    await oracle.setTime(time);
    return oracle;
  }

  describe('#bet', () => {
    let b, oracle;

    beforeEach(
      async () => {
        oracle = await createOracle();

        b = await MockedTimeSquares.new(oracle.address, { from: owner });

        // betting is on
        await b.setTime(GAME_TIME - ONE_DAY);
      }
    );

    it('allows betting on all valid squares', async () => {
      for (let home = 0; home < 10; home++) {
        for (let away = 0; away < 10; away++) {
          // we alternate betters just for the sake of more test coverage
          await b.bet(home, away, { value: 100, from: betters[ (home + away) % betters.length ] });
        }
      }
    });

    it('disallows betting on invalid squares', async () => {
      await expectThrow(b.bet(0, 10, { value: 100, from: better1 }));
      await expectThrow(b.bet(10, 2, { value: 100, from: better1 }));
      await expectThrow(b.bet(11, 6, { value: 100, from: better1 }));
      await expectThrow(b.bet(11, 0, { value: 100, from: better1 }));
      await expectThrow(b.bet(1500, 2, { value: 100, from: better1 }));
    });

    it('accounts boxStakesByUser correctly', async () => {
      await b.bet(3, 4, { value: 100, from: better1 });

      const boxStakeByUser = await b.boxStakesByUser(better1, 3, 4);
      assert.strictEqual(boxStakeByUser.valueOf(), '100');
    });

    it('emits a correct event', async () => {
      const { logs: [ { event, args: { better, home, away, stake } } ] } = await b.bet(0, 7, {
        value: 10,
        from: better1
      });

      assert.strictEqual(event, 'LogBet');
      assert.strictEqual(better, better1);
      assert.strictEqual(home.valueOf(), '0');
      assert.strictEqual(away.valueOf(), '7');
      assert.strictEqual(stake.valueOf(), '10');
    });

    it('doesnt allow betting after game time', async () => {
      await b.setTime(GAME_TIME);
      await expectThrow(b.bet(0, 7, { value: 10, from: better1 }));

      await b.setTime(GAME_TIME + ONE_DAY);
      await expectThrow(b.bet(0, 7, { value: 10, from: better1 }));

      await b.setTime(GAME_TIME - 1);
      await b.bet(0, 7, { value: 10, from: better1 });
    });

    it('errors with 0 value', async () => {
      await expectThrow(b.bet(5, 2, { value: 0, from: better1 }));
    });

    it('accounts total user stakes properly', async () => {
      await b.bet(1, 2, { value: 100, from: better1 });
      await b.bet(5, 8, { value: 200, from: better1 });
      await b.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await b.totalUserStakes(better1)).valueOf(), '' + (300));
      assert.strictEqual((await b.totalUserStakes(better3)).valueOf(), '' + (90));
    });

    it('accounts the totalStakes properly', async () => {
      await b.bet(1, 2, { value: 100, from: better1 });
      await b.bet(2, 6, { value: 40, from: better2 });
      await b.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await b.totalStakes()).valueOf(), '' + (100 + 40 + 90));
    });

    it('accounts the boxStakesByUser properly', async () => {
      await b.bet(1, 2, { value: 100, from: better2 });
      await b.bet(2, 6, { value: 40, from: better2 });
      await b.bet(1, 2, { value: 90, from: better2 });
      // different better on 1,2
      await b.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await b.boxStakesByUser(better2, 1, 2)).valueOf(), '' + (100 + 90));
      assert.strictEqual((await b.boxStakesByUser(better2, 2, 6)).valueOf(), '' + (40));
      assert.strictEqual((await b.boxStakesByUser(better3, 1, 2)).valueOf(), '' + (90));
      assert.strictEqual((await b.boxStakesByUser(better3, 2, 6)).valueOf(), '0');
    });

    it('accounts the totalBoxStakes properly', async () => {
      await b.bet(1, 2, { value: 100, from: better2 });
      await b.bet(2, 6, { value: 40, from: better2 });
      await b.bet(1, 2, { value: 90, from: better2 });
      // different better on 1,2
      await b.bet(1, 2, { value: 40, from: better3 });

      assert.strictEqual((await b.totalBoxStakes(1, 2)).valueOf(), '' + (100 + 90 + 40));
      assert.strictEqual((await b.totalBoxStakes(2, 6)).valueOf(), '' + (40));
    });
  });

  describe('#collectWinnings', () => {
    let sq, oracle;

    beforeEach(async () => {
      oracle = await createOracle();
      sq = await MockedTimeSquares.new(oracle.address, { from: owner });
      await sq.setTime(GAME_TIME - ONE_DAY);

      // set up some bets for our tests
      await sq.bet(1, 6, { from: better1, value: 200 });
      await sq.bet(1, 6, { from: better1, value: 100 });
      await sq.bet(4, 9, { from: better2, value: 300 });
      await sq.bet(3, 7, { from: better3, value: 100 });
      await sq.bet(2, 9, { from: better3, value: 250 });
      await sq.bet(4, 9, { from: better4, value: 400 });

      await sq.setTime(GAME_TIME + ONE_DAY);
    });

    it('can only be called if all quarters are reported', async () => {
      // none reported
      await expectThrow(sq.collectWinnings(1, 6, { from: better1 }));

      // 1 reported
      await oracle.reportWinner(1, 6, { from: owner });
      await expectThrow(sq.collectWinnings(1, 6, { from: better1 }));

      // 2 reported
      await oracle.reportWinner(2, 4, { from: owner });
      await expectThrow(sq.collectWinnings(1, 6, { from: better1 }));

      // 3 reported
      await oracle.reportWinner(3, 9, { from: owner });
      await expectThrow(sq.collectWinnings(1, 6, { from: better1 }));

      // 4 reported, now they can collect
      await oracle.reportWinner(1, 8, { from: owner });
      await sq.collectWinnings(1, 6, { from: better1 });
    });

    describe('after all quarters reported', async () => {
      beforeEach(async () => {
        // no winners
        await oracle.reportWinner(3, 8, { from: owner });
        // 1 winner, whole stake
        await oracle.reportWinner(1, 6, { from: owner });
        // two wins & two betters
        await oracle.reportWinner(4, 9, { from: owner });
        await oracle.reportWinner(4, 9, { from: owner });
      });

      it('can only be called on a valid box', async () => {
        await expectThrow(sq.collectWinnings(1, 10, { from: better1 }));
        await expectThrow(sq.collectWinnings(10, 3, { from: better1 }));
        await expectThrow(sq.collectWinnings(16, 4, { from: better1 }));
      });

      it('can only be called on squares that are won', async () => {
        // no winners
        await expectThrow(sq.collectWinnings(3, 8, { from: better1 }));
        // didn't win
        await expectThrow(sq.collectWinnings(4, 9, { from: better1 }));
      });

      it('can only be called once per address and winning box', async () => {
        await sq.collectWinnings(1, 6, { from: better1 });

        await expectThrow(sq.collectWinnings(1, 6, { from: better1 }));
      });

      it('can be called on behalf of someone else', async () => {
        await sq.sendWinningsTo(better1, 1, 6, { from: owner });
      });


      describe('payout calculation', () => {
        it('works for single winner payout', async () => {
          const { logs: [ { event, args: { winner, winnings } } ] } = await sq.collectWinnings(1, 6, { from: better1 });

          assert.strictEqual(event, 'LogPayout');
          assert.strictEqual(winner, better1);
          // 1 quarter of the take, total 1350
          assert.strictEqual(winnings.valueOf(), '337');
        });

        it('works for multiple winner payout', async () => {
          {
            const { logs: [ { event, args: { winner, winnings } } ] } = await sq.collectWinnings(4, 9, { from: better2 });

            assert.strictEqual(event, 'LogPayout');
            assert.strictEqual(winner, better2);
            // 1 quarter of the take * 3/7 of the take, total 1350, 2 quarters won
            assert.strictEqual(winnings.valueOf(), '289');
          }

          {
            const { logs: [ { event, args: { winner, winnings } } ] } = await sq.collectWinnings(4, 9, { from: better4 });

            assert.strictEqual(event, 'LogPayout');
            assert.strictEqual(winner, better4);
            // 1 quarter of the take * 4/7 of the take, total 1350, 2 quarters won
            assert.strictEqual(winnings.valueOf(), '385');
          }
        });

      });
    });

  });
});