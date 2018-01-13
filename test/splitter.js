const Splitter = artifacts.require('Splitter');

contract('Splitter', ([ owner, ...accounts ]) => {
  let splitter;

  before(async () => {
    splitter = await Splitter.deployed();
  });

  it('is deployed', () => {
    assert.strictEqual(typeof splitter.address, 'string');
  });

});