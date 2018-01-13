const Boxes = artifacts.require('Boxes');
const MockedTimeBoxes = artifacts.require('MockedTimeBoxes');
const expectThrow = require('./util/expectThrow');
const getBalance = require('./util/getBalance');

const GAME_TIME = 1517743800;
const ONE_DAY = 86400;

contract('Boxes', ([ owner, ...betters ]) => {
  const [ better1, better2, better3, better4 ] = betters;

  let boxes;

  before(async () => {
    boxes = await Boxes.deployed();
  });

  it('is deployed', async () => {
    assert.strictEqual(typeof boxes.address, 'string');
  });
  it('is owned by the owner', async () => {
    const ownedBy = await boxes.owner();
    assert.strictEqual(ownedBy, owner);
  });

  describe('#bet', () => {
    let b;

    beforeEach(
      async () => {
        b = await MockedTimeBoxes.new(owner, { from: owner });

        // betting is on
        await b.setTime(GAME_TIME - ONE_DAY);
      }
    );

    it('has the correct GAME_START_TIME', async () => {
      const time = await b.GAME_START_TIME();
      assert.strictEqual(time.valueOf(), '1517743800');
    });

    it('allows betting on all valid boxes', async () => {
      for (let home = 0; home < 10; home++) {
        for (let away = 0; away < 10; away++) {
          // we alternate betters just for the sake of more test coverage
          await b.bet(home, away, { value: 100, from: betters[ (home + away) % betters.length ] });
        }
      }
    });

    it('disallows betting on invalid boxes', async () => {
      await expectThrow(b.bet(0, 10, { value: 100, from: better1 }));
      await expectThrow(b.bet(10, 2, { value: 100, from: better1 }));
      await expectThrow(b.bet(11, 6, { value: 100, from: better1 }));
      await expectThrow(b.bet(11, 0, { value: 100, from: better1 }));
      await expectThrow(b.bet(1500, 2, { value: 100, from: better1 }));
    });

    it('accounts boxStakesByUser correctly', async () => {
      await b.bet(3, 4, { value: 100, from: better1 });

      const boxStakeByUser = await b.boxStakesByUser(better1, 3, 4);
      assert.strictEqual(boxStakeByUser.valueOf(), '95');
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

    it('calculates fees correctly', async () => {
      for (let bet = 100; bet < 100 * Math.pow(2, 10); bet *= 2) {
        const { logs: [ { args: { better, home, away, stake, fee } } ] } =
          await b.bet(4, 4, { value: bet, from: better1 });

        // the bet fee is 5%
        assert.strictEqual(fee.valueOf(), '' + (bet * 0.05));
        // the amount bet is 95%
        assert.strictEqual(stake.valueOf(), '' + bet * 0.95);
      }
    });

    it('accounts the totalStakes properly', async () => {
      await b.bet(1, 2, { value: 100, from: better1 });
      await b.bet(2, 6, { value: 40, from: better2 });
      await b.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await b.totalStakes()).valueOf(), '' + (95 + 38 + 86));
    });

    it('accounts the boxStakesByUser properly', async () => {
      await b.bet(1, 2, { value: 100, from: better2 });
      await b.bet(2, 6, { value: 40, from: better2 });
      await b.bet(1, 2, { value: 90, from: better2 });
      // different better on 1,2
      await b.bet(1, 2, { value: 90, from: better3 });

      assert.strictEqual((await b.boxStakesByUser(better2, 1, 2)).valueOf(), '' + (95 + 86));
      assert.strictEqual((await b.boxStakesByUser(better2, 2, 6)).valueOf(), '' + (38));
      assert.strictEqual((await b.boxStakesByUser(better3, 1, 2)).valueOf(), '' + (86));
      assert.strictEqual((await b.boxStakesByUser(better3, 2, 6)).valueOf(), '0');
    });

    it('accounts the totalBoxStakes properly', async () => {
      await b.bet(1, 2, { value: 100, from: better2 });
      await b.bet(2, 6, { value: 40, from: better2 });
      await b.bet(1, 2, { value: 90, from: better2 });
      // different better on 1,2
      await b.bet(1, 2, { value: 40, from: better3 });

      assert.strictEqual((await b.totalBoxStakes(1, 2)).valueOf(), '' + (95 + 86 + 38));
      assert.strictEqual((await b.totalBoxStakes(2, 6)).valueOf(), '' + (38));
    });

    it('transfers collected fees to the owner', async () => {
      const balBefore = await getBalance(owner);

      const { logs: [ { args: { fee } } ] } = await b.bet(1, 2, { value: 100, from: better1 });

      const balAfter = await getBalance(owner);

      const feesCollected = balAfter.sub(balBefore);

      assert.strictEqual(feesCollected.valueOf(), '5');
      assert.strictEqual(feesCollected.valueOf(), fee.valueOf());
    });

  });

  describe('#reportWinner', () => {
    let b;

    beforeEach(async () => {
      b = await MockedTimeBoxes.new(owner, { from: owner });
    });

    it('may only be called by the owner', async () => {
      await b.setTime(GAME_TIME + ONE_DAY);
      await expectThrow(b.reportWinner(1, 5, { from: better1 }));
    });

    it('may only be called after the game', async () => {
      await b.setTime(GAME_TIME - ONE_DAY);
      await expectThrow(b.reportWinner(1, 5, { from: owner }));
    });

    it('may only be called 4 times', async () => {
      await b.setTime(GAME_TIME + ONE_DAY);

      for (let i = 0; i < 4; i++) {
        await b.reportWinner(1, 5, { from: owner });
      }

      await expectThrow(b.reportWinner(1, 5, { from: owner }));
    });

    it('accounts boxQuartersWon correctly', async () => {
      await b.setTime(GAME_TIME + ONE_DAY);

      const before = await b.boxQuartersWon(1, 5);
      assert.strictEqual(before.valueOf(), '0');

      await b.reportWinner(1, 5, { from: owner });
      const after = await b.boxQuartersWon(1, 5);
      assert.strictEqual(after.valueOf(), '1');


      assert.strictEqual((await b.boxQuartersWon(4, 2)).valueOf(), '0');
      await b.reportWinner(4, 2, { from: owner });
      assert.strictEqual((await b.boxQuartersWon(4, 2)).valueOf(), '1');

      await b.reportWinner(4, 2, { from: owner });
      assert.strictEqual((await b.boxQuartersWon(4, 2)).valueOf(), '2');
    });


    it('must be called on a valid box', async () => {
      await b.setTime(GAME_TIME + ONE_DAY);

      await expectThrow(b.reportWinner(0, 11, { from: owner }));
      await expectThrow(b.reportWinner(5, 12, { from: owner }));
      await expectThrow(b.reportWinner(12, 0, { from: owner }));
      await expectThrow(b.reportWinner(10, 4, { from: owner }));
      await expectThrow(b.reportWinner(3, 10, { from: owner }));
    });
  });


  describe('#collectWinnings', () => {
    let b;

    beforeEach(async () => {
      b = await MockedTimeBoxes.new(owner, { from: owner });
      await b.setTime(GAME_TIME - ONE_DAY);

      // set up some bets for our tests
      await b.bet(1, 6, { from: better1, value: 200 });
      await b.bet(1, 6, { from: better1, value: 100 });
      await b.bet(4, 9, { from: better2, value: 300 });
      await b.bet(3, 7, { from: better3, value: 100 });
      await b.bet(2, 9, { from: better3, value: 250 });
      await b.bet(4, 9, { from: better4, value: 400 });

      await b.setTime(GAME_TIME + ONE_DAY);
    });

    it('can only be called if all quarters are reported', async () => {
      // none reported
      await expectThrow(b.collectWinnings(1, 6, { from: better1 }));

      // 1 reported
      await b.reportWinner(1, 6, { from: owner });
      await expectThrow(b.collectWinnings(1, 6, { from: better1 }));

      // 2 reported
      await b.reportWinner(2, 4, { from: owner });
      await expectThrow(b.collectWinnings(1, 6, { from: better1 }));

      // 3 reported
      await b.reportWinner(3, 9, { from: owner });
      await expectThrow(b.collectWinnings(1, 6, { from: better1 }));

      // 4 reported, now they can collect
      await b.reportWinner(1, 8, { from: owner });
      await b.collectWinnings(1, 6, { from: better1 });
    });

    describe('after all quarters reported', async () => {
      beforeEach(async () => {
        // no winners
        await b.reportWinner(3, 8, { from: owner });
        // 1 winner, whole stake
        await b.reportWinner(1, 6, { from: owner });
        // two wins & two betters
        await b.reportWinner(4, 9, { from: owner });
        await b.reportWinner(4, 9, { from: owner });
      });

      it('can only be called on a valid box', async () => {
        await expectThrow(b.collectWinnings(1, 10, { from: better1 }));
        await expectThrow(b.collectWinnings(10, 3, { from: better1 }));
        await expectThrow(b.collectWinnings(16, 4, { from: better1 }));
      });

      it('can only be called on boxes that are won', async () => {
        // no winners
        await expectThrow(b.collectWinnings(3, 8, { from: better1 }));
        // didn't win
        await expectThrow(b.collectWinnings(4, 9, { from: better1 }));
      });

      it('can only be called once per address and winning box', async () => {
        await b.collectWinnings(1, 6, { from: better1 });

        await expectThrow(b.collectWinnings(1, 6, { from: better1 }));
      });

      it('can be called on behalf of someone else', async () => {
        await b.sendWinningsTo(better1, 1, 6, { from: owner });
      });


      describe('payout calculation', () => {
        it('works for single winner payout', async () => {
          const { logs: [ { args: { winner, winnings } } ] } = await b.collectWinnings(1, 6, { from: better1 });

          assert.strictEqual(winner, better1);
          // 1 quarter of the take, total 1350, minus fees, 5%
          assert.strictEqual(winnings.valueOf(), '320');
        });

        it('works for multiple winner payout', async () => {
          {
            const { logs: [ { args: { winner, winnings } } ] } = await b.collectWinnings(4, 9, { from: better2 });

            assert.strictEqual(winner, better2);
            // 1 quarter of the take * 3/7 of the take, total 1350, minus fees, 5%, 2 quarters won
            assert.strictEqual(winnings.valueOf(), '274');
          }

          {
            const { logs: [ { args: { winner, winnings } } ] } = await b.collectWinnings(4, 9, { from: better4 });

            assert.strictEqual(winner, better4);
            // 1 quarter of the take * 4/7 of the take, total 1350, minus fees, 5%, 2 quarters won
            assert.strictEqual(winnings.valueOf(), '366');
          }
        });

      });
    });

  });
});