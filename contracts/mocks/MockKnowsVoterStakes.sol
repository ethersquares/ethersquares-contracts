pragma solidity 0.4.18;

import '../interfaces/IKnowsVoterStakes.sol';

contract MockKnowsVoterStakes is IKnowsVoterStakes {
    mapping(address => uint) public stakes;

    function MockKnowsVoterStakes(address[] _stakers, uint[] _stakes) public {
        require(_stakers.length == _stakes.length);

        for (uint i = 0; i < _stakers.length; i++) {
            stakes[_stakers[i]] = _stakes[i];
        }
    }

    function getVoterStakes(address voter, uint asOfBlock) public view returns (uint) {
        return stakes[voter];
    }
}
