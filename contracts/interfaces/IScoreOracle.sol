pragma solidity 0.4.18;

interface IScoreOracle {
    function getSquareWins(uint home, uint away) public view returns (uint numSquareWins, uint totalWins);
    function isFinalized() public view returns (bool);
}
