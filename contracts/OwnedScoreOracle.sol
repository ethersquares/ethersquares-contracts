pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './KnowsBoxes.sol';
import './KnowsTime.sol';
import './KnowsConstants.sol';

contract OwnedScoreOracle is KnowsConstants, KnowsBoxes, KnowsTime, Ownable {
    // the number of quarters is the total number of wins
    uint public constant NUM_QUARTERS = 4;

    // number of quarters that have been reported
    uint public quartersReported = 0;

    uint[10][10] public boxQuartersWon;

    function reportWinner(uint home, uint away) public onlyOwner isValidBox(home, away) {
        // can only report 4 quarters
        require(quartersReported < NUM_QUARTERS);
        require(currentTime() > GAME_START_TIME);

        // count a quarter reported
        quartersReported++;

        // that box won
        boxQuartersWon[home][away]++;
    }


    function getBoxWins(uint home, uint away) public view returns (uint numBoxWins, uint totalWins) {
        return (boxQuartersWon[home][away], NUM_QUARTERS);
    }

    function isFinalized() public view returns (bool) {
        return quartersReported == NUM_QUARTERS;
    }
}
