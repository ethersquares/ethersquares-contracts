pragma solidity 0.4.18;

import '../Squares.sol';
import './MockKnowsTime.sol';

contract MockedTimeSquares is Squares, MockKnowsTime {
    function MockedTimeSquares(IScoreOracle _oracle, address _developer) Squares(_oracle, _developer) public {}
}
