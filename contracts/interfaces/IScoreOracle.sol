pragma solidity 0.4.18;

interface IScoreOracle {
    function getBoxWins(uint home, uint away) public view returns (uint numBoxWins, uint totalWins);
    function isFinalized() public view returns (bool);
}
