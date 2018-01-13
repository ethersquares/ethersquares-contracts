const Splitter = artifacts.require('Splitter');
const getBalance = require('./util/getBalance');

contract('Splitter', ([ owner, ...accounts ]) => {
  let splitter;

  before(async () => {
    splitter = await Splitter.deployed();
  });

  it('is deployed', () => {
    assert.strictEqual(typeof splitter.address, 'string');
  });

  it('can be paid', async () => {
    const balanceBefore = await getBalance(splitter.address);
    // TODO: figure out why this reverts
    await splitter.sendTransaction({ value: 10 });
    const balanceAfter = await getBalance(splitter.address);

    assert.strictEqual(balanceAfter.sub(balanceBefore).valueOf(), '10');
  });

  describe('#payout', () => {
    it('splits it evenly with any number of payees');
    it('always ends up with 0 balance, regardless of the leftover');
  });

});