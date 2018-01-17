const Squares = artifacts.require('Squares');
const MockedTimeSquares = artifacts.require('MockedTimeSquares');
const MockedTimeOwnedScoreOracle = artifacts.require('MockedTimeOwnedScoreOracle');
const expectThrow = require('./util/expectThrow');
const getBalance = require('./util/getBalance');

const GAME_TIME = 1517787000;
const ONE_DAY = 86400;

contract('Squares', ([ owner, developer, ...betters ]) => {
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

  describe('#getVoterStakes', () => {
    let sq, oracle;
    beforeEach(
      async () => {
        oracle = await createOracle();

        sq = await MockedTimeSquares.new(oracle.address, developer, { from: owner });

        // betting is on
        await sq.setTime(GAME_TIME - ONE_DAY);
      }
    );

    it('returns the total amount of wei a person has always', async () => {
      assert.strictEqual((await sq.getVoterStakes(better1, 0)).valueOf(), '0');

      await sq.bet(5, 0, { value: 100, from: better1 });
      assert.strictEqual((await sq.getVoterStakes(better1, 0)).valueOf(), '100');

      await sq.bet(2, 6, { value: 200, from: better1 });
      assert.strictEqual((await sq.getVoterStakes(better1, 0)).valueOf(), '300');

      await sq.bet(6, 9, { value: 300, from: better2 });
      assert.strictEqual((await sq.getVoterStakes(better1, 0)).valueOf(), '300');
      assert.strictEqual((await sq.getVoterStakes(better2, 0)).valueOf(), '300');
    });
  });

  describe('#bet', () => {
    let sq, oracle;

    beforeEach(
      async () => {
        oracle = await createOracle();

        sq = await MockedTimeSquares.new(oracle.address, developer, { from: owner });

        // betting is on
        await sq.setTime(GAME_TIME - ONE_DAY);
      }
    );

    it('allows betting on all valid squares', async () => {
      for (let home = 0; home < 10; home++) {
        for (let away = 0; away < 10; away++) {
          // we alternate betters just for the sake of more test coverage
          await sq.bet(home, away, { value: 100, from: betters[ (home + away) % betters.length ] });
        }
      }
    });

    it('disallows betting on invalid squares', async () => {
      await expectThrow(sq.bet(0, 10, { value: 100, from: better1 }));
      await expectThrow(sq.bet(10, 2, { value: 100, from: better1 }));
      await expectThrow(sq.bet(11, 6, { value: 100, from: better1 }));
      await expectThrow(sq.bet(11, 0, { value: 100, from: better1 }));
      await expectThrow(sq.bet(1500, 2, { value: 100, from: better1 }));
    });

    it('accounts totalSquareStakesByUser correctly', async () => {
      await sq.bet(3, 4, { value: 100, from: better1 });

      const stakes = await sq.totalSquareStakesByUser(better1, 3, 4);
      assert.strictEqual(stakes.valueOf(), '100');
    });

    it('emits a correct event', async () => {
      const { logs: [ { event, args: { better, home, away, stake } } ] } = await sq.bet(0, 7, {
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
      await sq.setTime(GAME_TIME);
      await expectThrow(sq.bet(0, 7, { value: 10, from: better1 }));

      await sq.setTime(GAME_TIME + ONE_DAY);
      await expectThrow(sq.bet(0, 7, { value: 10, from: better1 }));

      await sq.setTime(GAME_TIME - 1);
      await sq.bet(0, 7, { value: 10, from: better1 });
    });

    it('errors with 0 value', async () => {
      await expectThrow(sq.bet(5, 2, { value: 0, from: better1 }));
    });

    it('accounts total user stakes properly', async () => {
      await sq.bet(1, 2, { value: 100, from: better1 });
      await sq.bet(5, 8, { value: 200, from: better1 });
      await sq.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await sq.totalUserStakes(better1)).valueOf(), '' + (300));
      assert.strictEqual((await sq.totalUserStakes(better3)).valueOf(), '' + (90));
    });

    it('accounts the totalStakes properly', async () => {
      await sq.bet(1, 2, { value: 100, from: better1 });
      await sq.bet(2, 6, { value: 40, from: better2 });
      await sq.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await sq.totalStakes()).valueOf(), '' + (100 + 40 + 90));
    });

    it('accounts the totalSquareStakesByUser properly', async () => {
      await sq.bet(1, 2, { value: 100, from: better2 });
      await sq.bet(2, 6, { value: 40, from: better2 });
      await sq.bet(1, 2, { value: 90, from: better2 });
      // different better on 1,2
      await sq.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await sq.totalSquareStakesByUser(better2, 1, 2)).valueOf(), '' + (100 + 90));
      assert.strictEqual((await sq.totalSquareStakesByUser(better2, 2, 6)).valueOf(), '' + (40));
      assert.strictEqual((await sq.totalSquareStakesByUser(better3, 1, 2)).valueOf(), '' + (90));
      assert.strictEqual((await sq.totalSquareStakesByUser(better3, 2, 6)).valueOf(), '0');
    });

    it('accounts the totalSquareStakes properly', async () => {
      await sq.bet(1, 2, { value: 100, from: better2 });
      await sq.bet(2, 6, { value: 40, from: better2 });
      await sq.bet(1, 2, { value: 90, from: better2 });
      // different better on 1,2
      await sq.bet(1, 2, { value: 40, from: better3 });

      assert.strictEqual((await sq.totalSquareStakes(1, 2)).valueOf(), '' + (100 + 90 + 40));
      assert.strictEqual((await sq.totalSquareStakes(2, 6)).valueOf(), '' + (40));
    });
  });

  describe('#collectWinnings', () => {
    let sq, oracle;

    beforeEach(async () => {
      oracle = await createOracle();
      sq = await MockedTimeSquares.new(oracle.address, developer, { from: owner });
      await sq.setTime(GAME_TIME - ONE_DAY);

      // set up some bets for our tests
      await sq.bet(1, 6, { from: better1, value: 200 });
      await sq.bet(1, 6, { from: better1, value: 100 });
      await sq.bet(4, 9, { from: better2, value: 300 });
      await sq.bet(3, 7, { from: better3, value: 100 });
      await sq.bet(2, 9, { from: better3, value: 250 });
      await sq.bet(4, 9, { from: better4, value: 400 });
      await sq.bet(3, 8, { from: better1, value: 1 });

      await sq.setTime(GAME_TIME + ONE_DAY);
    });

    it('can only be called if oracle score is finalized', async () => {
      // none reported
      await expectThrow(sq.collectWinnings(1, 6, 0, { from: better1 }));

      await oracle.setSquareWins(1, 6, 1, { from: owner });
      await oracle.setSquareWins(2, 4, 1, { from: owner });
      await oracle.setSquareWins(3, 9, 1, { from: owner });
      await oracle.setSquareWins(1, 8, 1, { from: owner });

      // all reported
      await expectThrow(sq.collectWinnings(1, 6, 0, { from: better1 }));

      await oracle.finalize({ from: owner });

      // finalized
      await sq.collectWinnings(1, 6, 0, { from: better1 });
    });

    describe('after all quarters reported', async () => {
      beforeEach(async () => {
        // no winners
        await oracle.setSquareWins(3, 8, 1, { from: owner });
        // 1 winner, whole stake
        await oracle.setSquareWins(1, 6, 1, { from: owner });
        // two wins & two betters
        await oracle.setSquareWins(4, 9, 2, { from: owner });
        await oracle.finalize({ from: owner });
      });

      it('everyone can collect their all winnings and balance just has ether dust', async () => {
        const balBefore = await getBalance(sq.address);
        assert.strictEqual(balBefore.valueOf(), '1351');

        await sq.collectWinnings(1, 6, 0, { from: better1 });
        await sq.collectWinnings(4, 9, 2, { from: better2 });
        await sq.collectWinnings(4, 9, 5, { from: better4 });
        await sq.collectWinnings(3, 8, 7, { from: better1 });

        const balAfter = await getBalance(sq.address);
        assert.strictEqual(balAfter.valueOf(), '2');
      });

      it('sends the payout to the winner, donation to developer', async () => {
        const balSender = await getBalance(better1);
        const balDeveloper = await getBalance(developer);

        const { receipt: { gasUsed }, logs: [ { args: { payout, donation } } ] } =
          await sq.collectWinnings(1, 6, 5, { gasPrice: 1, from: better1 });

        const balSenderAfter = await getBalance(better1);
        const balDeveloperAfter = await getBalance(developer);

        assert.strictEqual(balSenderAfter.sub(balSender).abs().valueOf(), payout.sub(gasUsed).abs().valueOf());
        assert.strictEqual(balDeveloperAfter.sub(balDeveloper).valueOf(), donation.valueOf());
      });

      it('can only be called on a valid box', async () => {
        await expectThrow(sq.collectWinnings(1, 10, 0, { from: better1 }));
        await expectThrow(sq.collectWinnings(10, 3, 0, { from: better1 }));
        await expectThrow(sq.collectWinnings(16, 4, 0, { from: better1 }));
      });

      it('can only be called on squares that are won', async () => {
        // no winners
        await expectThrow(sq.collectWinnings(3, 9, 0, { from: better1 }));
        // didn't win
        await expectThrow(sq.collectWinnings(4, 9, 0, { from: better1 }));
      });

      it('can only be called once per address and winning box', async () => {
        await sq.collectWinnings(1, 6, 0, { from: better1 });

        await expectThrow(sq.collectWinnings(1, 6, 0, { from: better1 }));
      });

      describe('payout calculation', () => {
        it('works for single winner payout', async () => {
          const { logs: [ { event, args: { winner, payout } } ] } = await sq.collectWinnings(1, 6, 0, { from: better1 });

          assert.strictEqual(event, 'LogPayout');
          assert.strictEqual(winner, better1);
          // 1 quarter of the take, total 1351
          assert.strictEqual(payout.valueOf(), '337');
        });

        it('works for multiple winner payout', async () => {
          {
            const { logs: [ { event, args: { winner, payout } } ] } = await sq.collectWinnings(4, 9, 0, { from: better2 });

            assert.strictEqual(event, 'LogPayout');
            assert.strictEqual(winner, better2);
            // 1 quarter of the take * 3/7 of the take, total 1351, 2 quarters won
            assert.strictEqual(payout.valueOf(), '289');
          }

          {
            const { logs: [ { event, args: { winner, payout } } ] } = await sq.collectWinnings(4, 9, 0, { from: better4 });

            assert.strictEqual(event, 'LogPayout');
            assert.strictEqual(winner, better4);
            // 1 quarter of the take * 4/7 of the take, total 1351, 2 quarters won
            assert.strictEqual(payout.valueOf(), '386');
          }
        });

        describe('donationPercentage', () => {
          it('donation percentage is limited to 100', async () => {
            await expectThrow(sq.collectWinnings(1, 6, 101, { from: better1 }));
            const { logs: [ { event, args: { winner, payout, donation } } ] } = await sq.collectWinnings(1, 6, 100, { from: better1 });

            assert.strictEqual(event, 'LogPayout');
            assert.strictEqual(winner, better1);
            assert.strictEqual(payout.valueOf(), '0');
            assert.strictEqual(donation.valueOf(), '337');
          });

          it('sends the donation to the developer', async () => {
            const balBefore = await getBalance(developer);

            const { logs: [ { event, args: { winner, payout, donation } } ] } =
              await sq.collectWinnings(1, 6, 30, { from: better1 });

            assert.strictEqual(event, 'LogPayout');
            assert.strictEqual(winner, better1);
            assert.strictEqual(donation.valueOf(), '' + Math.floor(337 * .3));
            assert.strictEqual(payout.valueOf(), '' + (337 - Math.floor(337 * .3)));

            const balAfter = await getBalance(developer);

            assert.strictEqual(balAfter.sub(balBefore).valueOf(), donation.valueOf());
          });
        });

      });
    });

  });
});