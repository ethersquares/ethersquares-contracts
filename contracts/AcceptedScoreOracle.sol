pragma solidity ^0.4.0;

contract AcceptedScoreOracle {
    function AcceptedScoreOracle(address _oracle) public {
        oracle = _oracle;
    }

    address public oracle;
}
