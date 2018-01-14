pragma solidity 0.4.18;

import './interfaces/IKnowsTime.sol';

// knows what time it is
contract KnowsTime is IKnowsTime {
    function currentTime() public view returns (uint) {
        return now;
    }
}
