pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './interfaces/IKnowsVoterStakes.sol';
import './OwnedScoreOracle.sol';

contract AcceptedScoreOracle is OwnedScoreOracle {
    using SafeMath for uint;

    // how long voters are given to affirm the score
    uint public constant VOTING_PERIOD_DURATION = 1 weeks;

    // when the voting period started
    uint public votingPeriodStartTime;

    // whether the voters have accepted the score as true
    bool public accepted;

    uint public affirmations;
    uint public totalVotes;

    IKnowsVoterStakes public voterStakes;

    // only once, the voter stakes can be set by the owner, to allow us to deploy a circular dependency
    function setVoterStakesContract(IKnowsVoterStakes _voterStakes) public onlyOwner {
        require(address(voterStakes) == address(0));
        voterStakes = _voterStakes;
    }

    // start the acceptance period
    function finalize() public onlyOwner {
        super.finalize();

        // start the voting period immediately
        votingPeriodStartTime = currentTime();
        affirmations = 0;
        totalVotes = 0;
    }

    event LogAccepted(uint time);

    // anyone can call this if the score is finalized and not accepted
    function accept() public {
        // score is finalized
        require(finalized);

        // voting period is over
        require(currentTime() > votingPeriodStartTime + VOTING_PERIOD_DURATION);

        // score is not already accepted as truth
        require(!accepted);

        // require 66.66% majority of voters affirmed the score
        require(affirmations.mul(10000).div(totalVotes) >= 6666);

        // score is accepted as truth
        accepted = true;

        LogAccepted(currentTime());
    }

    event LogUnfinalized(uint time);

    // called when the score is finalized but the public does not accept it
    function unfinalize() public {
        // score is finalized
        require(finalized);

        // however it's not accepted
        require(!accepted);

        // and the voting period for the score has ended
        require(currentTime() > votingPeriodStartTime + VOTING_PERIOD_DURATION);

        // require 66.66% majority of voters affirmed the score
        require(affirmations.mul(10000).div(totalVotes) < 6666);

        // score is no longer finalized
        finalized = false;

        LogUnfinalized(currentTime());
    }

    function isFinalized() public view returns (bool) {
        return finalized && accepted;
    }
}
