const Boxes = artifacts.require('Boxes');
const MockedTimeBoxes = artifacts.require('MockedTimeBoxes');

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

  describe('mock instance', () => {
    let b;

    beforeEach(
      async () => {
        b = await MockedTimeBoxes.new({ from: owner });

        // betting is on
        await b.setTime(GAME_TIME - ONE_DAY);
      }
    );

    it('allows betting', async () => {
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
  });
});