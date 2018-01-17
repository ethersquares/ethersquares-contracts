pragma solidity 0.4.18;

interface IKnowsVoterStakes {
    function getVoterStakes(address voter) public view returns (uint);
}
