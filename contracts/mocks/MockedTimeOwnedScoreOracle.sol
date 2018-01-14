pragma solidity 0.4.18;

import '../OwnedScoreOracle.sol';
import './MockKnowsTime.sol';

contract MockedTimeOwnedScoreOracle is OwnedScoreOracle, MockKnowsTime {
}
