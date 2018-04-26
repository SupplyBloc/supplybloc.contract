pragma solidity 0.4.19;

import "./SellableToken.sol";


contract ICO is SellableToken {

    uint8 public constant PRE_ICO_TIER = 0;
    uint8 public constant ICO_TIER_FIRST = 1;
    uint8 public constant ICO_TIER_LAST = 5;

    mapping(address => uint256) public icoBalances;

    Stats public preICOStats;

    struct Stats {
        uint256 soldTokens;
        uint256 collectedUSD;
        uint256 collectedEthers;
        bool burned;
    }

    function ICO(
        address _token,
        address _etherHolder,
        uint256 _startTimePreICO,
        uint256 _endTimePreICO,
        uint256 _maxTokenSupplyPreICO,
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
        softCap = 100000000000;
        hardCap = 4000000000000;

        //preICO
        tiers.push(
            Tier(
                uint256(_maxTokenSupplyPreICO),
                uint256(15000),//0.15 * 10 ^ 5
                _startTimePreICO,
                _endTimePreICO,
                35
            )
        );
        //ICO Round-1
        tiers.push(
            Tier(
                _maxTokenSupply,
                uint256(18000),//0.18 * 10 ^ 5
                _startTime,
                _startTime.add(1 days),
                25
            )
        );
        //ICO Round-2
        tiers.push(
            Tier(
                _maxTokenSupply,
                uint256(21000),//0.21 * 10 ^ 5
                _startTime.add(1 days),
                _startTime.add(8 days),
                20
            )
        );
        //ICO Round-3
        tiers.push(
            Tier(
                _maxTokenSupply,
                uint256(24000),//0.24 * 10 ^ 5
                _startTime.add(8 days),
                _startTime.add(15 days),
                10
            )
        );
        //ICO Round-4
        tiers.push(
            Tier(
                _maxTokenSupply,
                uint256(27000),//0.27 * 10 ^ 5
                _startTime.add(15 days),
                _startTime.add(22 days),
                5
            )
        );
        //ICO Round-5
        tiers.push(
            Tier(
                _maxTokenSupply,
                uint256(30000),//0.30 * 10 ^ 5
                _startTime.add(22 days),
                _endTime,
                0
            )
        );
    }

    function isTransferAllowed(address _from, uint256 _value) public view returns (bool){
        if (collectedUSD < softCap) {
            if (token.balanceOf(_from) >= icoBalances[_from] && token.balanceOf(_from) - icoBalances[_from] > _value) {
                return true;
            }
            return false;
        }
        return true;
    }

    function changeICODates(uint8 _tierId, uint256 _start, uint256 _end) public onlyOwner {
        if (_start != 0 && _start < _end && _tierId < tiers.length) {
            Tier storage icoTier = tiers[_tierId];
            icoTier.startTime = _start;
            icoTier.endTime = _end;
            if (_tierId == ICO_TIER_FIRST) {
                startTime = _start;
            } else if (_tierId == ICO_TIER_LAST) {
                endTime = _end;
            }
        }
    }

    function isActive() public view returns (bool) {
        if (hardCap == collectedUSD) {
            return false;
        }
        if (soldTokens == maxTokenSupply) {
            return false;
        }

        return withinPeriod();
    }

    function withinPeriod() public view returns (bool) {
        return getActiveTier() != tiers.length;
    }

    function getActiveTier() public view returns (uint8) {
        for (uint8 i = 0; i < tiers.length; i++) {
            if (block.timestamp >= tiers[i].startTime && block.timestamp <= tiers[i].endTime) {
                return i;
            }
        }

        return uint8(tiers.length);
    }

    function calculateTokensAmount(uint256 _value) public view returns (uint256 tokenAmount, uint256 usdAmount) {
        if (_value == 0) {
            return (0, 0);
        }
        uint8 activeTier = getActiveTier();

        if (activeTier == tiers.length) {
            if (endTime < block.timestamp) {
                return (0, 0);
            }
            if (startTime > block.timestamp) {
                activeTier = PRE_ICO_TIER;
            }
        }
        usdAmount = _value.mul(etherPriceInUSD);
        tokenAmount = usdAmount.div(tiers[activeTier].price);
        if (tokenAmount < minPurchase) {
            return (0, 0);
        }
        usdAmount = usdAmount.div(uint256(10) ** 18);
        tokenAmount = tokenAmount.mul(uint256(100).add(tiers[activeTier].bonus)).div(uint256(100));
    }

    function calculateEthersAmount(uint256 _tokens) public view returns (uint256 ethers, uint256 bonus) {
        if (_tokens == 0 || _tokens < minPurchase) {
            return (0, 0);
        }

        uint8 activeTier = getActiveTier();

        if (activeTier == tiers.length) {
            if (endTime < block.timestamp) {
                return (0, 0);
            }
            if (startTime > block.timestamp) {
                activeTier = PRE_ICO_TIER;
            }
        }

        ethers = _tokens.mul(tiers[activeTier].price).div(etherPriceInUSD);
        bonus = _tokens.mul(tiers[activeTier].bonus).div(100);
    }

    function getStats(uint256 _ethPerBtc, uint256 _ethPerLtc) public view returns (
        uint256 sold,
        uint256 maxSupply,
        uint256 min,
        uint256 soft,
        uint256 hard,
        uint256 tokensPerEth,
        uint256 tokensPerBtc,
        uint256 tokensPerLtc,
        uint256[30] tiersData
    ) {
        sold = soldTokens;
        maxSupply = maxTokenSupply;
        min = minPurchase;
        soft = softCap;
        hard = hardCap;
        uint256 usd;
        (tokensPerEth, usd) = calculateTokensAmount(1 ether);
        (tokensPerBtc, usd) = calculateTokensAmount(_ethPerBtc);
        (tokensPerLtc, usd) = calculateTokensAmount(_ethPerLtc);
        uint256 j = 0;
        for (uint256 i = 0; i < tiers.length; i++) {
            tiersData[j++] = uint256(tiers[i].maxAmount);
            tiersData[j++] = uint256(tiers[i].price);
            tiersData[j++] = uint256(tiers[i].startTime);
            tiersData[j++] = uint256(tiers[i].endTime);
            tiersData[j++] = uint256(tiers[i].bonus);
        }
    }

    function burnUnsoldTokens() public onlyOwner {
        if (block.timestamp >= tiers[PRE_ICO_TIER].endTime && preICOStats.burned == false) {
            token.burnUnsoldTokens(tiers[PRE_ICO_TIER].maxAmount.sub(preICOStats.soldTokens));
            preICOStats.burned = true;
        }
        if (block.timestamp >= endTime && maxTokenSupply > soldTokens) {
            token.burnUnsoldTokens(maxTokenSupply.sub(soldTokens));
            maxTokenSupply = soldTokens;
        }
    }

    function isRefundPossible() public view returns (bool) {
        if (isActive() || block.timestamp < startTime || collectedUSD >= softCap) {
            return false;
        }
        return true;
    }

    function refund() public returns (bool) {
        if (!isRefundPossible() || etherBalances[msg.sender] == 0) {
            return false;
        }

        uint256 balance = etherBalances[msg.sender];
        etherBalances[msg.sender] = 0;

        uint256 burnedAmount = token.burnInvestorTokens(msg.sender);

        require(burnedAmount > 0);

        msg.sender.transfer(balance);
        Refund(msg.sender, balance, burnedAmount);

        return true;
    }

    function transferEthers() internal {
        if (collectedUSD >= softCap) {
            etherHolder.transfer(this.balance);
        }
    }

    function mintPreICO(address _address, uint256 _tokenAmount, uint256 _ethAmount, uint256 _usdAmount) internal returns (uint256) {
        uint256 mintedAmount = token.mint(_address, _tokenAmount);

        require(mintedAmount == _tokenAmount);

        preICOStats.soldTokens = preICOStats.soldTokens.add(_tokenAmount);
        preICOStats.collectedEthers = preICOStats.collectedEthers.add(_ethAmount);
        preICOStats.collectedUSD = preICOStats.collectedUSD.add(_usdAmount);

        require(tiers[PRE_ICO_TIER].maxAmount >= preICOStats.soldTokens);

        return _tokenAmount;
    }

    function buy(address _address, uint256 _value) internal returns (bool) {
        if (_value == 0 || _address == address(0)) {
            return false;
        }

        uint8 activeTier = getActiveTier();
        if (activeTier == tiers.length) {
            return false;
        }

        if (priceUpdateAt.add(1 hours) < block.timestamp) {
            update();
            priceUpdateAt = block.timestamp;
        }

        uint256 tokenAmount;
        uint256 usdAmount;
        uint256 mintedAmount;

        (tokenAmount, usdAmount) = calculateTokensAmount(_value);
        require(usdAmount > 0 && tokenAmount > 0);

        if (activeTier == PRE_ICO_TIER) {
            mintedAmount = mintPreICO(_address, tokenAmount, _value, usdAmount);

            etherHolder.transfer(this.balance);
        } else {
            mintedAmount = mintInternal(_address, tokenAmount);
            collectedUSD = collectedUSD.add(usdAmount);
            require(hardCap >= collectedUSD);

            collectedEthers = collectedEthers.add(_value);
            etherBalances[_address] = etherBalances[_address].add(_value);
            icoBalances[_address] = icoBalances[_address].add(tokenAmount);
            transferEthers();
        }

        Contribution(_address, _value, tokenAmount);

        lockupContract.log(_address, tokenAmount, block.timestamp);

        return true;
    }

}