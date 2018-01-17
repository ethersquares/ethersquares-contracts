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
    // the block number when the voting period started
    uint public votingPeriodBlockNumber;

    // whether the voters have accepted the score as true
    bool public accepted;

    uint public affirmations;
    uint public totalVotes;

    struct Vote {
        bool affirmed;
        bool counted;
    }

    // for the voting period blcok number, these are the votes counted from each address
    mapping(uint => mapping(address => Vote)) votes;

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
        affirmations = 0;
        totalVotes = 0;
        votingPeriodStartTime = currentTime();
        votingPeriodBlockNumber = block.number;
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

    // called when the voting period ends with a minority
    function unfinalize() public {
        // score is finalized
        require(finalized);

        // however it's not accepted
        require(!accepted);

        // and the voting period for the score has ended
        require(currentTime() > votingPeriodStartTime + VOTING_PERIOD_DURATION);

        // require people to have
        require(affirmations.mul(10000).div(totalVotes) < 6666);

        // score is no longer finalized
        finalized = false;

        LogUnfinalized(currentTime());
    }

    event LogVote(address indexed voter, bool indexed affirm, uint stake);

    // vote to affirm or unaffirm the score called by a user that has some stake
    function vote(bool affirm) public {
        // the voting period has started
        require(votingPeriodStartTime != 0);

        // the score is finalized
        require(finalized);

        // the score is not accepted
        require(!accepted);

        uint stake = voterStakes.getVoterStakes(msg.sender, votingPeriodBlockNumber);

        // user has some stake
        require(stake > 0);

        Vote storage userVote = votes[votingPeriodBlockNumber][msg.sender];

        // vote has not been counted, so
        if (!userVote.counted) {
            userVote.counted = true;
            userVote.affirmed = affirm;

            totalVotes = totalVotes.add(stake);
            if (affirm) {
                affirmations = affirmations.add(stake);
            }
        } else {
            // changing their vote to an affirmation
            if (affirm && !userVote.affirmed) {
                affirmations = affirmations.add(stake);
            } else if (!affirm && userVote.affirmed) {
                // changing their vote to a disaffirmation
                affirmations = affirmations.sub(stake);
            }
            userVote.affirmed = affirm;
        }

        LogVote(msg.sender, affirm, stake);
    }

    function isFinalized() public view returns (bool) {
        return finalized && accepted;
    }
}
