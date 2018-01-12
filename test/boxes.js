const Boxes = artifacts.require('Boxes');

contract('Boxes', ([ owner ]) => {
  let boxes;

  before(async () => {
    boxes = await Boxes.deployed();
  });

  it('is deployed', async () => {
    assert.strictEqual(typeof boxes.address, 'string');
  });

  describe('demo instance', () => {


  });
});