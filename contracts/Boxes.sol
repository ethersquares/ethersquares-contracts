pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract Boxes is Ownable {
    using SafeMath for uint;

    // 2/4/18 @ 6:30 PM EST, the deadline for bets
    uint public constant GAME_START_TIME = 1517743800;

    // the number of quarters
    uint public constant NUM_QUARTERS = 4;

    // the percentage fee collected on each bet
    uint public constant FEE_PERCENTAGE = 5;

    // staked ether for each player and each box
    mapping(address => uint[10][10]) public boxStakesByUser;

    // total stakes for each box
    uint[10][10] public totalBoxStakes;

    // the overall total of money stakes in the grid
    uint public totalStakes;

    // how many times each box wins
    uint[10][10] public boxQuartersWon;

    // whether all quarters have been reported
    uint quartersReported = 0;

    modifier isValidBox(uint home, uint away) {
        require(home >= 0 && home < 10);
        require(away >= 0 && away < 10);
        _;
    }

    function currentTime() view public returns (uint) {
        return now;
    }

    function reportWinner(uint home, uint away) public onlyOwner isValidBox(home, away) {
        // can only report 4 quarters
        require(quartersReported < NUM_QUARTERS);

        // count a quarter reported
        quartersReported++;

        // that box won
        boxQuartersWon[home][away]++;
    }

    event LogBet(address indexed better, uint indexed home, uint indexed away, uint stake, uint fee);

    function bet(uint home, uint away) public payable isValidBox(home, away) {
        require(msg.value > 0);
        require(currentTime() < GAME_START_TIME);

        // collect the fee
        uint fee = msg.value.mul(FEE_PERCENTAGE).div(100);
        owner.transfer(fee);

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

    event LogPayout(address indexed winner, uint amount);

    // called by the winners to collect winnings for a box, only after the game is over
    function collectWinnings(uint home, uint away) public isValidBox(home, away) {
        require(quartersReported == NUM_QUARTERS);

        uint stake = boxStakesByUser[msg.sender][home][away];
        uint boxStake = totalBoxStakes[home][away];

        uint winnings = stake.mul(totalStakes).mul(boxQuartersWon[home][away]).div(NUM_QUARTERS).div(boxStake);

        // clear their stakes - can only collect once
        boxStakesByUser[msg.sender][home][away] = 0;

        msg.sender.transfer(winnings);

        LogPayout(msg.sender, winnings);
    }
}
