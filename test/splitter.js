const Splitter = artifacts.require('Splitter');
const getBalance = require('./util/getBalance');
const expectThrow = require('./util/expectThrow');

contract('Splitter', ([ funder, ...payees ]) => {
  let splitter;

  before(async () => {
    splitter = await Splitter.deployed();
  });

  it('is deployed', () => {
    assert.strictEqual(typeof splitter.address, 'string');
  });

  it('is payable', async () => {
    const balanceBefore = await getBalance(splitter.address);
    await splitter.sendTransaction({ from: funder, value: 10 });
    const balanceAfter = await getBalance(splitter.address);

    assert.strictEqual(balanceAfter.sub(balanceBefore).valueOf(), '10');
  });

  it('must have at least 1 payee to be deployed', async () => {
    expectThrow(Splitter.new([], { from: payees }));
  });

  describe('#payout', () => {
    for (let numPayees = 1; numPayees < payees.length; numPayees++) {
      for (let amt = 1; amt < 1000; amt *= 2) {
        describe(`splits ${amt} correctly between ${numPayees} payees`, () => {
          let s;

          before('create funded splitter', async () => {
            s = await Splitter.new(payees.slice(0, numPayees), { from: funder });

            const sBal = await getBalance(s.address);
            assert.strictEqual(sBal.valueOf(), '0');

            await s.sendTransaction({ from: funder, value: amt });

            const sBalAfter = await getBalance(s.address);
            assert.strictEqual(sBalAfter.sub(sBal).valueOf(), '' + amt);
          });

          it(`sends correct amounts`, async () => {
            const balancesBefore = [];
            for (let i = 0; i < numPayees; i++) {
              balancesBefore.push(await getBalance(payees[ i ]));
            }

            // do the payout
            await s.payout();

            const payout = Math.floor(amt / numPayees);
            const remainder = amt % numPayees;

            for (let i = 0; i < numPayees; i++) {
              const balanceAfter = await getBalance(payees[ i ]);

              assert.strictEqual(
                balanceAfter.sub(balancesBefore[ i ]).valueOf(),
                '' + (payout + (i === 0 ? remainder : 0))
              );
            }
          });

          it('ends up with 0 balance', async () => {
            await s.payout();
            const bal = await getBalance(s.address);
            assert.strictEqual(bal.valueOf(), '0');
          });
        });

      }
    }
  });

});