pragma solidity 0.4.18;

import './Boxes.sol';

contract MockedTimeBoxes is Boxes {
    function MockedTimeBoxes(address _payee) Boxes(_payee) public {}

    uint public time;

    function currentTime() view public returns (uint) {
        return time;
    }

    function setTime(uint _time) public {
        time = _time;
    }
}
