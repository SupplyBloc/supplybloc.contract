pragma solidity ^0.4.18;


import "../PrivateSale.sol";


contract TestPrivateSale is PrivateSale {

    function TestPrivateSale(
        address _token,
        address _etherHolder,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _etherPriceInUSD,
        uint256 _maxTokenSupply
    ) public PrivateSale(
        _token,
        _etherHolder,
        _startTime,
        _endTime,
        _etherPriceInUSD,
        _maxTokenSupply
    ) {}

    function testChangeICOPeriod(uint256 _start, uint256 _end) public {
        startTime = _start;
        endTime = _end;
    }

    function testChangeSoldTokens(uint256 _sold) public {
        soldTokens = _sold;
    }

    function testChangeCollectedUSD(uint256 _amount) public {
        collectedUSD = _amount;
    }

}
