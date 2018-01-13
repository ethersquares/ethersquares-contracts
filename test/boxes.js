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
      expectThrow(b.bet(0, 10, { value: 100, from: better1 }));
      expectThrow(b.bet(11, 6, { value: 100, from: better1 }));
      expectThrow(b.bet(11, 0, { value: 100, from: better1 }));
      expectThrow(b.bet(1500, 2, { value: 100, from: better1 }));
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
      expectThrow(b.bet(0, 7, { value: 10, from: better1 }));

      await b.setTime(GAME_TIME + ONE_DAY);
      expectThrow(b.bet(0, 7, { value: 10, from: better1 }));

      await b.setTime(GAME_TIME - 1);
      await b.bet(0, 7, { value: 10, from: better1 });
    });

    it('errors with 0 value', async () => {
      expectThrow(b.bet(5, 2, { value: 0, from: better1 }));
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
    it('may only be called by the owner');
    it('may only be called 4 times');
    it('accounts boxQuartersWon correctly');
    it('must be called on a valid box');
  });


  describe('#collectWinnings', () => {
    it('can only be called if all quarters are reported');
    it('can only be called on a valid box');
    it('can only be called once per address and winning box');
    it('can be called on behalf of any winner');

    describe('payout calculation', () => {
      it('calculates the correct payouts');
    });
  });
});