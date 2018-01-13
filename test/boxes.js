const Boxes = artifacts.require('Boxes');
const MockedTimeBoxes = artifacts.require('MockedTimeBoxes');
const expectThrow = require('./util/expectThrow');

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

  describe('#bet', () => {
    let b;

    beforeEach(
      async () => {
        b = await MockedTimeBoxes.new({ from: owner });

        // betting is on
        await b.setTime(GAME_TIME - ONE_DAY);
      }
    );

    it('has the correct GAME_START_TIME', async () => {
      const time = await b.GAME_START_TIME();
      assert.strictEqual(time.valueOf(), '1517743800');
    });

    it('accounts boxStakesByUser correctly', async () => {
      const bet = await b.bet(3, 4, { value: 100, from: better1 });

      const boxStakeByUser = await b.boxStakesByUser(better1, 3, 4);
      assert.strictEqual(boxStakeByUser.valueOf(), '95');
    });

    it('fires a correct event', async () => {
      const { logs: [ { event, args: { better, home, away, amount } } ] } = await b.bet(0, 7, {
        value: 10,
        from: better1
      });

      assert.strictEqual(event, 'LogBet');
      assert.strictEqual(better, better1);
      assert.strictEqual(home.valueOf(), '0');
      assert.strictEqual(away.valueOf(), '7');
      assert.strictEqual(amount.valueOf(), '10');
    });

    it('doesnt allow betting after game time', async () => {
      await b.setTime(GAME_TIME);
      expectThrow(b.bet(0, 7, { value: 10, from: better1 }));

      await b.setTime(GAME_TIME + ONE_DAY);
      expectThrow(b.bet(0, 7, { value: 10, from: better1 }));

      await b.setTime(GAME_TIME - 1);
      await b.bet(0, 7, { value: 10, from: better1 });
    });


  });
});