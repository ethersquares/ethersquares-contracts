pragma solidity 0.4.18;

import '../Boxes.sol';
import './MockKnowsTime.sol';

contract MockedTimeBoxes is Boxes, MockKnowsTime {
    function MockedTimeBoxes(IScoreOracle _oracle, address _payee) Boxes(_oracle, _payee) public {}
}
