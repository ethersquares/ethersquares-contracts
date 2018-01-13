pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/ReentrancyGuard.sol';

contract Splitter is ReentrancyGuard {
    // addresses to split payouts to
    address[] public between;

    function Splitter(address[] _between) public {
        require(_between.length > 0);
        between = _between;
    }

    modifier whenHasBalance {
        if (this.balance > 0) {
            _;
        }
    }

    // payout the balance to the addresses with whom it should be split
    function payout() nonReentrant whenHasBalance public {
        uint split = this.balance / between.length;
        uint leftover = this.balance % between.length;

        for (uint i = 0; i < between.length; i++) {
            between[i].transfer(split + (i == 0 ? leftover : 0));
        }
    }
}
