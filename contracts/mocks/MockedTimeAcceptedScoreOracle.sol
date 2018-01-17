pragma solidity 0.4.18;

import '../AcceptedScoreOracle.sol';
import './MockKnowsTime.sol';

contract MockedTimeAcceptedScoreOracle is AcceptedScoreOracle, MockKnowsTime {
}
