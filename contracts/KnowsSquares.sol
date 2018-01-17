pragma solidity 0.4.18;

// knows what a valid box is
contract KnowsSquares {
    modifier isValidSquare(uint home, uint away) {
        require(home >= 0 && home < 10);
        require(away >= 0 && away < 10);
        _;
    }
}
