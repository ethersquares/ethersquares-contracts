pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './interfaces/IScoreOracle.sol';
import './interfaces/IKnowsVoterStakes.sol';
import './KnowsSquares.sol';
import './KnowsConstants.sol';
import './KnowsTime.sol';

contract Squares is KnowsConstants, KnowsTime, KnowsSquares, IKnowsVoterStakes {
    using SafeMath for uint;

    function Squares(IScoreOracle _oracle, address _developer) public {
        oracle = _oracle;
        developer = _developer;
    }

    // the oracle for the scores
    IScoreOracle public oracle;

    // the developer of the smart contract
    address public developer;

    // staked ether for each player and each box
    mapping(address => uint[10][10]) public totalSquareStakesByUser;

    // total stakes for each box
    uint[10][10] public totalSquareStakes;

    // the total stakes for each user
    mapping(address => uint) public totalUserStakes;

    // the overall total of money stakes in the grid
    uint public totalStakes;

    event LogBet(address indexed better, uint indexed home, uint indexed away, uint stake);

    function bet(uint home, uint away) public payable isValidSquare(home, away) {
        require(msg.value > 0);
        require(currentTime() < GAME_START_TIME);

        // the stake is the message value
        uint stake = msg.value;

        // add the stake amount to the overall total
        totalStakes = totalStakes.add(stake);

        // add their stake to the total user stakes
        totalUserStakes[msg.sender] = totalUserStakes[msg.sender].add(stake);

        // add their stake to their own accounting
        totalSquareStakesByUser[msg.sender][home][away] = totalSquareStakesByUser[msg.sender][home][away].add(stake);

        // add it to the total stakes as well
        totalSquareStakes[home][away] = totalSquareStakes[home][away].add(stake);

        LogBet(msg.sender, home, away, stake);
    }

    event LogPayout(address indexed winner, uint payout, uint donation);

    // called by the winners to collect winnings for a box
    function collectWinnings(uint home, uint away, uint donationPercentage) public isValidSquare(home, away) {
        // score must be finalized
        require(oracle.isFinalized());

        // optional donation
        require(donationPercentage <= 100);

        // the square wins and the total wins are used to calculate the percentage of the total stake that the square is worth
        var (numSquareWins, totalWins) = oracle.getSquareWins(home, away);

        uint userStake = totalSquareStakesByUser[msg.sender][home][away];
        uint squareStake = totalSquareStakes[home][away];

        uint winnings = userStake.mul(totalStakes).mul(numSquareWins).div(totalWins).div(squareStake);

        require(winnings > 0);

        // the donation amount
        uint donation = winnings.mul(donationPercentage).div(100);

        uint payout = winnings.sub(donation);

        // clear their stakes - can only collect once
        totalSquareStakesByUser[msg.sender][home][away] = 0;

        msg.sender.transfer(payout);
        developer.transfer(donation);

        LogPayout(msg.sender, payout, donation);
    }

    function getVoterStakes(address voter, uint asOfBlock) public view returns (uint) {
        return totalUserStakes[voter];
    }
}
