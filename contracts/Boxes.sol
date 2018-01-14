pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './interfaces/IScoreOracle.sol';
import './KnowsBoxes.sol';
import './KnowsConstants.sol';
import './KnowsTime.sol';

contract Boxes is KnowsConstants, KnowsTime, KnowsBoxes {
    using SafeMath for uint;

    // the percentage fee collected on each bet
    uint public constant FEE_PERCENTAGE = 5;

    function Boxes(IScoreOracle _oracle, address _payee) public {
        payee = _payee;
        oracle = _oracle;
    }

    // the oracle for the scores
    IScoreOracle public oracle;

    // the recipient of collected fees
    address public payee;

    // staked ether for each player and each box
    mapping(address => uint[10][10]) public boxStakesByUser;

    // total stakes for each box
    uint[10][10] public totalBoxStakes;

    // the overall total of money stakes in the grid
    uint public totalStakes;

    event LogBet(address indexed better, uint indexed home, uint indexed away, uint stake, uint fee);

    function bet(uint home, uint away) public payable isValidBox(home, away) {
        require(msg.value > 0);
        require(currentTime() < GAME_START_TIME);

        // collect the fee
        uint fee = msg.value.mul(FEE_PERCENTAGE).div(100);
        payee.transfer(fee);

        // the amount staked is what's left over
        uint stake = msg.value.sub(fee);

        // add the stake amount to the overall total
        totalStakes = totalStakes.add(stake);

        // add their stake to their own accounting
        boxStakesByUser[msg.sender][home][away] = boxStakesByUser[msg.sender][home][away].add(stake);

        // add it to the total stakes as well
        totalBoxStakes[home][away] = totalBoxStakes[home][away].add(stake);

        LogBet(msg.sender, home, away, stake, fee);
    }

    event LogPayout(address indexed winner, uint winnings);

    // called by the winners to collect winnings for a box
    function collectWinnings(uint home, uint away) public isValidBox(home, away) {
        sendWinningsTo(msg.sender, home, away);
    }

    // called by anyone to send winnings for a address box, only after all the quarters are reported
    function sendWinningsTo(address winner, uint home, uint away) public isValidBox(home, away) {
        // score must be finalized
        require(oracle.isFinalized());

        // the box wins and the total wins are used to calculate the percentage of the total stake that the box is worth
        var (boxWins, totalWins) = oracle.getBoxWins(home, away);

        uint userStake = boxStakesByUser[winner][home][away];
        uint boxStake = totalBoxStakes[home][away];

        uint winnings = userStake.mul(totalStakes).mul(boxWins).div(totalWins).div(boxStake);

        require(winnings > 0);

        // clear their stakes - can only collect once
        boxStakesByUser[winner][home][away] = 0;

        winner.transfer(winnings);

        LogPayout(winner, winnings);
    }
}
