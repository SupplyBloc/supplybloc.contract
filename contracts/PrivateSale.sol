pragma solidity 0.4.19;


import "./SellableToken.sol";


contract PrivateSale is SellableToken {

    function PrivateSale(
        address _token,
        address _etherHolder,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _etherPriceInUSD,
        uint256 _maxTokenSupply
    ) public SellableToken(
        _token,
        _etherHolder,
        _startTime,
        _endTime,
        _etherPriceInUSD,
        _maxTokenSupply
    ) {
        price = 10000;//0.1 * 10 ^ 5
    }

    function changeSalePeriod(uint256 _start, uint256 _end) public onlyOwner {
        if (_start != 0 && _start < _end) {
            startTime = _start;
            endTime = _end;
        }
    }

    function isActive() public view returns (bool) {
        if (soldTokens == maxTokenSupply) {
            return false;
        }

        return withinPeriod();
    }

    function withinPeriod() public view returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime;
    }

    function calculateTokensAmount(uint256 _value) public view returns (uint256 tokenAmount, uint256 usdAmount) {
        if (_value == 0) {
            return (0, 0);
        }

        usdAmount = _value.mul(etherPriceInUSD);
        tokenAmount = usdAmount.div(price);
        if (tokenAmount < minPurchase) {
            return (0, 0);
        }
        usdAmount = usdAmount.div(uint256(10) ** 18);
        tokenAmount = tokenAmount.mul(uint256(3)).div(uint256(2));//50%
    }

    function calculateEthersAmount(uint256 _tokens) public view returns (uint256 ethers, uint256 bonus) {
        if (_tokens == 0 || _tokens < minPurchase) {
            return (0, 0);
        }

        ethers = _tokens.mul(price).div(etherPriceInUSD);
        bonus = _tokens.div(2);//50%
    }

    function getStats(uint256 _ethPerBtc, uint256 _ethPerLtc) public view returns (
        uint256 start,
        uint256 end,
        uint256 sold,
        uint256 maxSupply,
        uint256 min,
        uint256 tokensPerEth,
        uint256 tokensPerBtc,
        uint256 tokensPerLtc
    ) {
        start = startTime;
        end = endTime;
        sold = soldTokens;
        maxSupply = maxTokenSupply;
        min = minPurchase;
        uint256 usd;
        (tokensPerEth, usd) = calculateTokensAmount(1 ether);
        (tokensPerBtc, usd) = calculateTokensAmount(_ethPerBtc);
        (tokensPerLtc, usd) = calculateTokensAmount(_ethPerLtc);
    }

    function burnUnsoldTokens() public onlyOwner {
        if (block.timestamp >= endTime && maxTokenSupply > soldTokens) {
            token.burnUnsoldTokens(maxTokenSupply.sub(soldTokens));
            maxTokenSupply = soldTokens;
        }
    }

    function buy(address _address, uint256 _value) internal returns (bool) {
        if (_value == 0 || _address == address(0)) {
            return false;
        }

        if (priceUpdateAt.add(1 hours) < block.timestamp) {
            update();
            priceUpdateAt = block.timestamp;
        }

        uint256 tokenAmount;
        uint256 usdAmount;

        (tokenAmount, usdAmount) = calculateTokensAmount(_value);
        require(usdAmount > 0 && tokenAmount > 0);

        mintInternal(_address, tokenAmount);
        collectedUSD = collectedUSD.add(usdAmount);
        collectedEthers = collectedEthers.add(_value);

        etherHolder.transfer(this.balance);

        Contribution(_address, _value, tokenAmount);

        lockupContract.log(_address, tokenAmount, block.timestamp);

        return true;
    }

}
