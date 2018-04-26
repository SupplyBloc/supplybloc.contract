pragma solidity ^0.4.18;


import "../ICO.sol";


contract TestICO is ICO {

    function TestICO(
        address _token,
        address _etherHolder,
        uint256 _startTimePreICO,
        uint256 _endTimePreICO,
        uint256 _maxTokenSupplyPreICO,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _etherPriceInUSD,
        uint256 _maxTokenSupply
    ) public ICO(
        _token,
        _etherHolder,
        _startTimePreICO,
        _endTimePreICO,
        _maxTokenSupplyPreICO,
        _startTime,
        _endTime,
        _etherPriceInUSD,
        _maxTokenSupply
    ) {}

    function testChangeICOPeriod(uint256 _start, uint256 _end) public {
        for (uint8 i = 0; i < tiers.length; i++) {
            tiers[i].startTime = _start;
            tiers[i].endTime = _end;
        }

        startTime = _start;
        endTime = _end;
    }

    function testChangeSoldTokens(uint256 _sold) public {
        soldTokens = _sold;
    }

    function testChangeCollectedUSD(uint256 _amount) public {
        collectedUSD = _amount;
    }

    function getPreICOStats() public view returns (
        uint256,
        uint256,
        uint256,
        bool
    ) {
        return (
            preICOStats.soldTokens,
            preICOStats.collectedUSD,
            preICOStats.collectedEthers,
            preICOStats.burned
        );
    }

    function testCalculateTokensAmount(uint256 _value, uint256 _soldTokens) public returns (uint256, uint256) {
        soldTokens = _soldTokens;

        return calculateTokensAmount(_value);
    }

    function testSetICOBalance(address _address, uint256 _value) public {
        icoBalances[_address] = _value;
    }

}
