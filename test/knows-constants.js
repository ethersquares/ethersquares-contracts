const KnowsConstants = artifacts.require('KnowsConstants');
const getBalance = require('./util/getBalance');
const expectThrow = require('./util/expectThrow');

contract('KnowsConstants', (accounts) => {
  let knowsConstants;

  beforeEach(async () => {
    knowsConstants = await KnowsConstants.new();
  });

  it('is deployed', () => {
    assert.strictEqual(typeof knowsConstants.address, 'string');
  });

  it('has the correct GAME_START_TIME of 2/4/18 @ 6:30pm eastern time', async () => {
    const gameStartTime = await knowsConstants.GAME_START_TIME();
    assert.strictEqual(gameStartTime.valueOf(), '1517787000');
    const date = new Date(1000 * gameStartTime.valueOf());
    const str = date.toISOString();
    assert.strictEqual(str, '2018-02-04T23:30:00.000Z');
  });
});