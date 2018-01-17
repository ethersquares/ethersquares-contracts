pragma solidity 0.4.18;

contract MockKnowsTime {
    uint public time;

    function currentTime() public view returns (uint) {
        return time;
    }

    event LogTimeSet(uint time);

    function setTime(uint _time) public {
        time = _time;
        LogTimeSet(_time);
    }
}
