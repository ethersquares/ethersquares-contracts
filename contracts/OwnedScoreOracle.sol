pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './KnowsSquares.sol';
import './KnowsTime.sol';
import './KnowsConstants.sol';
import './interfaces/IScoreOracle.sol';

contract OwnedScoreOracle is KnowsConstants, KnowsSquares, KnowsTime, Ownable, IScoreOracle {
    using SafeMath for uint;

    // score can be reported 1 day after the game
    uint public constant SCORE_REPORT_START_TIME = GAME_START_TIME + 1 days;

    // the number of quarters is the total number of wins
    uint public constant TOTAL_WINS = 4;

    // number of wins that have been reported
    uint public winsReported = 0;

    // the grid of how much each box won
    uint[10][10] public squareWins;

    // whether the score is finalized
    bool public finalized;

    event LogSquareWinsUpdated(uint home, uint away, uint wins);

    function setSquareWins(uint home, uint away, uint wins) public onlyOwner isValidSquare(home, away) {
        require(currentTime() >= SCORE_REPORT_START_TIME);
        require(wins <= TOTAL_WINS);
        require(!isFinalized());

        uint currentSquareWins = squareWins[home][away];

        // account the number of quarters reported
        if (currentSquareWins > wins) {
            winsReported = winsReported.sub(currentSquareWins.sub(wins));
        } else if (currentSquareWins < wins) {
            winsReported = winsReported.add(wins.sub(currentSquareWins));
        }

        // mark the number of wins in that square
        squareWins[home][away] = wins;

        LogSquareWinsUpdated(home, away, wins);
    }

    event LogFinalized(uint time);

    // finalize the score after it's been reported
    function finalize() public onlyOwner {
        require(winsReported == TOTAL_WINS);
        require(!finalized);

        finalized = true;

        LogFinalized(currentTime());
    }

    function getSquareWins(uint home, uint away) public view returns (uint numSquareWins, uint totalWins) {
        return (squareWins[home][away], TOTAL_WINS);
    }

    function isFinalized() public view returns (bool) {
        return finalized;
    }
}
