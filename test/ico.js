var
    PrivateSale = artifacts.require("./PrivateSale.sol"),
    ICO = artifacts.require("./test/TestICO.sol"),
    SupplyBloc = artifacts.require("./test/TestSupplyBloc.sol"),
    SupplyBlocAllocation = artifacts.require("./SupplyBlocAllocation.sol"),
    LockupContract = artifacts.require("./LockupContract.sol"),

    Utils = require("./utils"),
    BigNumber = require('BigNumber.js'),

    precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600,
    signAddress = web3.eth.accounts[0],
    etherHolder = web3.eth.accounts[5],
    wrongSigAddress = web3.eth.accounts[7],
    rewardsAddress = web3.eth.accounts[8];

var abi = require('ethereumjs-abi'),
    BN = require('bn.js');

function makeTransactionKYC(instance, sign, address, value) {
    'use strict';
    var h = abi.soliditySHA3(['address'], [new BN(address.substr(2), 16)]),
        sig = web3.eth.sign(sign, h.toString('hex')).slice(2),
        r = `0x${sig.slice(0, 64)}`,
        s = `0x${sig.slice(64, 128)}`,
        v = web3.toDecimal(sig.slice(128, 130)) + 27;

    var data = abi.simpleEncode('multivestBuy(address,uint8,bytes32,bytes32)', address, v, r, s);

    return instance.sendTransaction({value: value, from: address, data: data.toString('hex')});
}

async function deploy() {
    const token = await SupplyBloc.new(rewardsAddress, false);

    const ico = await ICO.new(
        token.address, //_token
        etherHolder, //_etherHolder
        icoSince, //_startTime
        icoTill,//_endTime
        new BigNumber('40000000').mul(precision).valueOf(),//_maxTokenSupply
        icoTill + 3600, //_startTime
        icoTill + 3600 * 2,//_endTime
        new BigNumber('1500').mul(usdPrecision).valueOf(), //_etherPriceInUSD
        new BigNumber('250000000').mul(precision).valueOf()//_maxTokenSupply
    );
    // const allocations = await SupplyBlocAllocation.new(token.address, ico.addrests);
    const lockupContract = await LockupContract.new(token.address, ico.address, ico.address);

    await token.addMinter(ico.address);
    await token.setICO(ico.address);
    await ico.setAllowedMultivest(signAddress);
    await token.setLockupContract(lockupContract.address);
    await ico.setLockupContract(lockupContract.address);

    return {token, ico, ico, ico, ico};
}

contract('ICO', function (accounts) {

    it("check calculateTokensAmount & minInvest & changeICODates & isActive & getActiveTier", async function () {
        const {token, privateico, preico, ico, allocations} = await deploy();

        await Utils.checkState({ico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: 0},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");

        //check preICO
        let amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('1').mul(precision).valueOf(),
            new BigNumber('0').valueOf()
        );
        //token = 1 ether * etherInUsd / price
        //10 ^ 18 * 150000000 / 15000 = 10000000000000000000000
        //10000000000000000000000 * 135/100 = 13500000000000000000000
        assert.equal(amount[0], new BigNumber('13500').mul(precision).valueOf(), "tokensAmount is not equal");
        assert.equal(amount[1], new BigNumber('150000000').valueOf(), "usdAmount is not equal");
        //check minInvest
        //999 tokens = val * etherInUsd / price
        //999 * 10 ^ 18 * 15000 / 150000000 = 99900000000000000
        amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('99900000000000000').valueOf(),
            new BigNumber('0').valueOf()
        );
        assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "tokensAmount is not equal");
        assert.equal(amount[1], new BigNumber('0').valueOf(), "usdAmount is not equal");
        //250000 * 10 ^ 18 * 15000 / 150000000 = 25000000000000000000
        amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('25000000000000000000').valueOf(),
            new BigNumber('0').valueOf()
        );
        assert.equal(amount[0], new BigNumber('337500000000000000000000').valueOf(), "tokensAmount is not equal");
        //250000 * 0.15 = 37500
        assert.equal(amount[1], new BigNumber('37500').mul(usdPrecision).valueOf(), "usdAmount is not equal");


        await ico.changeICODates(0, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        assert.equal(await ico.isActive.call(), false, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 6, "getActiveTier is not equal");

        await ico.changeICODates(1, new BigNumber(icoSince), new BigNumber(icoTill));
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 1, "getActiveTier is not equal");

        //check ICO 1
        //250000 * 10 ^ 18 * 18000 / 150000000 = 30000000000000000000
        amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('30000000000000000000').valueOf(),
            new BigNumber('0').valueOf()
        );
        assert.equal(amount[0], new BigNumber('312500').mul(precision).valueOf(), "tokensAmount is not equal");
        //250000 * 0.18 = 45000
        assert.equal(amount[1], new BigNumber('45000').mul(usdPrecision).valueOf(), "usdAmount is not equal");

        await ico.changeICODates(1, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        await ico.changeICODates(2, new BigNumber(icoSince), new BigNumber(icoTill));
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 2, "getActiveTier is not equal");
        //check ICO 2
        //250000 * 10 ^ 18 * 21000 / 150000000 = 35000000000000000000
        amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('35000000000000000000').valueOf(),
            new BigNumber('0').valueOf()
        );
        assert.equal(amount[0], new BigNumber('300000').mul(precision).valueOf(), "tokensAmount is not equal");
        //250000 * 0.21 = 52500
        assert.equal(amount[1], new BigNumber('52500').mul(usdPrecision).valueOf(), "usdAmount is not equal");

        await ico.changeICODates(2, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        await ico.changeICODates(3, new BigNumber(icoSince), new BigNumber(icoTill));
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 3, "getActiveTier is not equal");
        //check ICO 3
        //250000 * 10 ^ 18 * 24000 / 150000000 = 40000000000000000000
        amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('40000000000000000000').valueOf(),
            new BigNumber('0').valueOf()
        );
        assert.equal(amount[0], new BigNumber('275000').mul(precision).valueOf(), "tokensAmount is not equal");
        //250000 * 0.24 = 60000
        assert.equal(amount[1], new BigNumber('60000').mul(usdPrecision).valueOf(), "usdAmount is not equal");

        await ico.changeICODates(3, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        await ico.changeICODates(4, new BigNumber(icoSince), new BigNumber(icoTill));
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 4, "getActiveTier is not equal");
        //check ICO 4
        //250000 * 10 ^ 18 * 27000 / 150000000 = 45000000000000000000
        amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('45000000000000000000').valueOf(),
            new BigNumber('0').valueOf()
        );
        assert.equal(amount[0], new BigNumber('262500').mul(precision).valueOf(), "tokensAmount is not equal");
        //250000 * 0.27 = 67500
        assert.equal(amount[1], new BigNumber('67500').mul(usdPrecision).valueOf(), "usdAmount is not equal");

        await ico.changeICODates(4, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        await ico.changeICODates(5, new BigNumber(icoSince), new BigNumber(icoTill));
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 5, "getActiveTier is not equal");
        //check ICO 5
        //250000 * 10 ^ 18 * 30000 / 150000000 = 50000000000000000000
        amount = await ico.testCalculateTokensAmount.call(
            new BigNumber('50000000000000000000').valueOf(),
            new BigNumber('0').valueOf()
        );
        assert.equal(amount[0], new BigNumber('250000').mul(precision).valueOf(), "tokensAmount is not equal");
        //250000 * 0.30 = 75000
        assert.equal(amount[1], new BigNumber('75000').mul(usdPrecision).valueOf(), "usdAmount is not equal");





    });

    it("check calculateEthersAmount & minInvest", async function () {
        const {token, privateico, preico, ico, allocations} = await deploy();

        await Utils.checkState({ico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: 0},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");

        //check preICO
        let amount = await ico.calculateEthersAmount.call(new BigNumber('10000').mul(precision).valueOf());
        //token = 1 ether * etherInUsd / price
        //10 ^ 18 * 150000000 / 15000 = 10000000000000000000000
        //10000000000000000000000 * 135/100 = 13500000000000000000000
        assert.equal(amount[0], new BigNumber('1').mul(precision).valueOf(), "ethersAmount is not equal");
        assert.equal(amount[1], new BigNumber('3500').mul(precision).valueOf(), "bonusAmount is not equal");

        //check minInvest
        //999 tokens = val * etherInUsd / price
        //999 * 10 ^ 18 * 15000 / 150000000 = 99900000000000000
        amount = await ico.calculateEthersAmount.call(new BigNumber('999').mul(precision).valueOf());
        assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "ethersAmount is not equal");
        assert.equal(amount[1], new BigNumber('0').valueOf(), "bonusAmount is not equal");

        await ico.changeICODates(0, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        assert.equal(await ico.isActive.call(), false, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 6, "getActiveTier is not equal");

        await ico.changeICODates(1, new BigNumber(icoSince), new BigNumber(icoTill));
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 1, "getActiveTier is not equal");

        //check ICO 1
        //250000 * 10 ^ 18 * 18000 / 150000000 = 30000000000000000000
        amount = await ico.calculateEthersAmount.call(new BigNumber('250000').mul(precision).valueOf());
        assert.equal(amount[0], new BigNumber('30').mul(precision).valueOf(), "ethersAmount is not equal");
        //250000 * 0.18 = 45000
        assert.equal(amount[1], new BigNumber('62500').mul(precision).valueOf(), "bonusAmount is not equal");

    });

    it("check buy & ether transfers", async function () {
        const {token, privateico, preico, ico, allocations} = await deploy();

        await Utils.checkState({ico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: 0},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        let etherHolderBalance = await Utils.getEtherBalance(etherHolder);

        let preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('0').valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('0').valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('0').valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");


        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");

        await makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        //10 ^ 18 * 150000000 / 15000 * 135/100 = 13500
        await makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({ico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: new BigNumber('13500').mul(precision).valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: new BigNumber('0').mul(precision).valueOf(),
                collectedEthers: new BigNumber('0').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('13500').mul(precision).valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('1500').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('1').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");

        console.log('etherholder balance after transaction is       :', new BigNumber(await Utils.getEtherBalance(etherHolder)).valueOf());
        console.log('etherholder balance after transaction should be:', new BigNumber('1').mul(precision).add(etherHolderBalance).valueOf());

        await ico.changeICODates(0, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        await ico.changeICODates(1, new BigNumber(icoSince), new BigNumber(icoTill));

        await makeTransactionKYC(ico, signAddress, accounts[1], new BigNumber('2').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        await makeTransactionKYC(ico, signAddress, accounts[2], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        console.log('etherholder balance after transaction is       :', new BigNumber(await Utils.getEtherBalance(etherHolder)).valueOf());
        console.log('etherholder balance after transaction should be:', new BigNumber('1').mul(precision).add(etherHolderBalance).valueOf());

        await ico.testChangeCollectedUSD(new BigNumber('100000000000').valueOf());

        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        console.log('etherholder balance after transaction is       :', new BigNumber(await Utils.getEtherBalance(etherHolder)).valueOf());
        console.log('etherholder balance after transaction should be:', new BigNumber('5').mul(precision).add(etherHolderBalance).valueOf());


        await ico.testChangeSoldTokens(new BigNumber('250000000').mul(precision).valueOf());

        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('2').mul(precision).valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

    });

    it("check refund", async function () {
        const {token, privateico, preico, ico, allocations} = await deploy();

        await Utils.checkState({ico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: 0},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        let etherHolderBalance = await Utils.getEtherBalance(etherHolder);

        let preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('0').valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('0').valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('0').valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");


        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");

        await makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        //10 ^ 18 * 150000000 / 15000 * 135/100 = 13500
        await makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({ico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: new BigNumber('13500').mul(precision).valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: new BigNumber('0').mul(precision).valueOf(),
                collectedEthers: new BigNumber('0').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('13500').mul(precision).valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('1500').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('1').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");

        console.log('etherholder balance after transaction is       :', new BigNumber(await Utils.getEtherBalance(etherHolder)).valueOf());
        console.log('etherholder balance after transaction should be:', new BigNumber('1').mul(precision).add(etherHolderBalance).valueOf());

        await ico.changeICODates(0, new BigNumber(icoSince).sub(3600 * 2), new BigNumber(icoSince).sub(3600));
        await ico.changeICODates(1, new BigNumber(icoSince), new BigNumber(icoTill));

        //10 ^ 18 * 2 * 150000000 / 18000 * 125/100 = 20833.333333333333333333
        await makeTransactionKYC(ico, signAddress, accounts[1], new BigNumber('2').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        //10 ^ 18 * 150000000 / 18000 * 125/100 = 10416.6666666666666666666666666666666667
        await makeTransactionKYC(ico, signAddress, accounts[2], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        console.log('etherholder balance after transaction is       :', new BigNumber(await Utils.getEtherBalance(etherHolder)).valueOf());
        console.log('etherholder balance after transaction should be:', new BigNumber('1').mul(precision).add(etherHolderBalance).valueOf());

        await ico.testChangeCollectedUSD(new BigNumber('100000000000').valueOf());

        ////10 ^ 18 * 150000000 / 18000 * 125/100 = 10416.6666666666666666666666666666666667
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        console.log('etherholder balance after transaction is       :', new BigNumber(await Utils.getEtherBalance(etherHolder)).valueOf());
        console.log('etherholder balance after transaction should be:', new BigNumber('5').mul(precision).add(etherHolderBalance).valueOf());


        await ico.testChangeSoldTokens(new BigNumber('250000000').mul(precision).valueOf());

        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('2').mul(precision).valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

    });

/*
    it("deploy & check constructor info & setPreICO & setPrivateSale & updateTotalSupplyAndCollectedUsd", async function () {
        const {token, privateico, preico, ico, allocations} = await deploy();

        await Utils.checkState({ico, token}, {
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        //setSupplyBloc
        await ico.setSupplyBloc(accounts[2], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await ico.setSupplyBloc(accounts[2])
            .then(Utils.receiptShouldSucceed);

        await ico.setEtherHolder(accounts[3], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await ico.setEtherHolder(accounts[3])
            .then(Utils.receiptShouldSucceed);
        await ico.setEtherHolder(0x0);

        await Utils.checkState({ico, token}, {
            ico: {
                token: accounts[2],
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: accounts[3],
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

    });

    it("check ", async function () {
        const {token, privateico, preico, ico, allocations} = await deploy();

        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('0').mul(precision).valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('0').mul(precision).valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        let preICOStats = await ico.getPreICOStats();
        assert.equal(preICOStats[0], new BigNumber('0').valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('0').valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('0').valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");


        assert.equal(await ico.isActive(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier(), 0, "getActiveTier is not equal");

        await ico.updateWhitelist(accounts[3], true);

        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.15 * 10 ^ 5)) * 135 / 100
        await ico.sendTransaction({value: new BigNumber('1').mul(precision).valueOf(), from: accounts[3]})
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('13500').mul(precision).valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('13500').mul(precision).valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        preICOStats = await ico.getPreICOStats();
        assert.equal(preICOStats[0], new BigNumber('13500').mul(precision).valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('1500').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('1').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        assert.equal(await ico.isActive(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier(), 1, "getActiveTier is not equal");

        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.18 * 10 ^ 5)) * 125 / 100
        await ico.sendTransaction({value: new BigNumber('1').mul(precision).valueOf(), from: accounts[3]})
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('13500').mul(precision).add('10416666666666666666666').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('13500').mul(precision).add('10416666666666666666666').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: new BigNumber('10416666666666666666666').valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: new BigNumber('1').mul(precision).valueOf()},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        preICOStats = await ico.getPreICOStats();
        assert.equal(preICOStats[0], new BigNumber('13500').mul(precision).valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('1500').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('1').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(2, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(3, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(5, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        assert.equal(await ico.isActive(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier(), 5, "getActiveTier is not equal");

        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.3 * 10 ^ 5)) * 100 / 100
        await ico.sendTransaction({value: new BigNumber('1').mul(precision).valueOf(), from: accounts[3]})
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('13500').add('5000').mul(precision).add('10416666666666666666666').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('13500').add('5000').mul(precision).add('10416666666666666666666').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
                soldTokens: new BigNumber('10416666666666666666666').add('5000000000000000000000').valueOf(),
                collectedEthers: new BigNumber('2').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('3000').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: new BigNumber('2').mul(precision).valueOf()},
                ],
                etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        preICOStats = await ico.getPreICOStats();
        assert.equal(preICOStats[0], new BigNumber('13500').mul(precision).valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('1500').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('1').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

    });
   */

    // it("check buy", async function () {
    //     const {token, privateico, preico, ico, allocations} = await deploy();
    //
    //     await Utils.checkState({ico, token}, {
    //         token: {
    //             balanceOf: [
    //                 {[rewardsAddress]: 0},
    //                 {[accounts[0]]: 0},
    //             ],
    //         },
    //         ico: {
    //             token: token.address,
    //             minPurchase: new BigNumber('1000').mul(precision).valueOf(),
    //             maxPurchase: new BigNumber('0').mul(precision).valueOf(),
    //             softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
    //             hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
    //             maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
    //             soldTokens: 0,
    //             collectedEthers: 0,
    //             etherHolder: etherHolder,
    //             collectedUSD: 0,
    //             etherBalances: [
    //                 {[accounts[0]]: 0},
    //                 {[accounts[1]]: 0},
    //             ],
    //             etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
    //             allowedMultivests: [
    //                 {[accounts[0]]: true},
    //                 {[accounts[1]]: false},
    //             ],
    //         }
    //     });
    //
    //     let preICOStats = await ico.getPreICOStats();
    //     assert.equal(preICOStats[0], new BigNumber('0').valueOf(), "soldTokens is not equal");
    //     assert.equal(preICOStats[1], new BigNumber('0').valueOf(), "collectedUSD is not equal");
    //     assert.equal(preICOStats[2], new BigNumber('0').valueOf(), "collectedEthers is not equal");
    //     assert.equal(preICOStats[3], false, "burned is not equal");
    //
    //
    //     assert.equal(await ico.isActive(), true, "isActive is not equal");
    //     assert.equal(await ico.getActiveTier(), 0, "getActiveTier is not equal");
    //
    //     makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
    //         .then(Utils.receiptShouldFailed)
    //         .catch(Utils.catchReceiptShouldFailed);
    //     //10 ^ 18 * 119493000 / 15000 * 135/100 = 10754370000000000000000
    //     makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
    //         .then(Utils.receiptShouldSucceed);
    //
    //     await Utils.checkState({ico, token}, {
    //         token: {
    //             balanceOf: [
    //                 {[rewardsAddress]: 0},
    //                 {[accounts[0]]: new BigNumber('10754.37').mul(precision).valueOf()},
    //             ],
    //         },
    //         ico: {
    //             token: token.address,
    //             minPurchase: new BigNumber('1000').mul(precision).valueOf(),
    //             maxPurchase: new BigNumber('0').mul(precision).valueOf(),
    //             softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
    //             hardCap: new BigNumber('40000000').mul(usdPrecision).valueOf(),
    //             maxTokenSupply: new BigNumber('250000000').mul(precision).valueOf(),
    //             soldTokens: new BigNumber('0').mul(precision).valueOf(),
    //             collectedEthers: new BigNumber('0').mul(precision).valueOf(),
    //             etherHolder: etherHolder,
    //             collectedUSD: 0,
    //             etherBalances: [
    //                 {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
    //                 {[accounts[1]]: 0},
    //             ],
    //             etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
    //             allowedMultivests: [
    //                 {[accounts[0]]: true},
    //                 {[accounts[1]]: false},
    //             ],
    //         }
    //     });
    //
    //     preICOStats = await ico.getPreICOStats();
    //     assert.equal(preICOStats[0], new BigNumber('10754.37').mul(precision).valueOf(), "soldTokens is not equal");
    //     assert.equal(preICOStats[1], new BigNumber('15000').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
    //     assert.equal(preICOStats[2], new BigNumber('1').valueOf(), "collectedEthers is not equal");
    //     assert.equal(preICOStats[3], false, "burned is not equal");
    //
    //     assert.equal(await ico.isActive(), true, "isActive is not equal");
    //     assert.equal(await ico.getActiveTier(), 0, "getActiveTier is not equal");
    //
    //
    // });

    /*
        it("check calculateBonusAmount & setEtherHolder", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            assert.equal(await ico.calculateBonusAmount.call(100), 25, 'calculateBonusAmount is not equal');

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 23 * 3600, parseInt(new Date().getTime() / 1000) + 3600);
            assert.equal(await ico.calculateBonusAmount.call(100), 25, 'calculateBonusAmount is not equal');

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 25 * 3600, parseInt(new Date().getTime() / 1000) + 3600);
            assert.equal(await ico.calculateBonusAmount.call(100), 20, 'calculateBonusAmount is not equal');

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 24 * 3600 * 8 - 3600, parseInt(new Date().getTime() / 1000) + 3600);
            assert.equal(await ico.calculateBonusAmount.call(100), 10, 'calculateBonusAmount is not equal');

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 24 * 3600 * 15 - 3600, parseInt(new Date().getTime() / 1000) + 3600);
            assert.equal(await ico.calculateBonusAmount.call(100), 5, 'calculateBonusAmount is not equal');

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 24 * 3600 * 22 - 3600, parseInt(new Date().getTime() / 1000) + 3600);
            assert.equal(await ico.calculateBonusAmount.call(100), 0, 'calculateBonusAmount is not equal');

            await ico.setEtherHolder(accounts[3], {from: accounts[1]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await ico.setEtherHolder(accounts[3])
                .then(Utils.receiptShouldSucceed);
            await ico.setEtherHolder(0x0);

            await Utils.checkState({ico, token}, {
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    // startTime: icoSince,
                    // endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: accounts[3],
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });
        });

        it("check buy", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            //10 ^ 18 * 119493000 / 10000 * 125/100 = 14936625000000000000000
            makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: new BigNumber('14936.625').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('14936.625').mul(precision).valueOf(),
                    collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                    etherHolder: etherHolder,
                    collectedUSD: new BigNumber('119493000').valueOf(),
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: new BigNumber('1').mul(precision).valueOf()},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            //hardCap
            await ico.testChangeCollectedUSD(3000000000000);

            makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: new BigNumber('14936.625').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('14936.625').mul(precision).valueOf(),
                    collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                    etherHolder: etherHolder,
                    collectedUSD: new BigNumber('3000000000000').valueOf(),
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: new BigNumber('1').mul(precision).valueOf()},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });
            await ico.testChangeCollectedUSD(119493000);

            //maxSupply
            await ico.testChangeSoldTokens(3000000000000);

            makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

        });

        it("check burnTokens", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            await ico.burnTokens();
            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            await ico.testChangeSoldTokens(new BigNumber('26250000').mul(precision).valueOf());
            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 23 * 3600, parseInt(new Date().getTime() / 1000) - 3600);

            await ico.burnTokens();
            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: new BigNumber('700000000').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    maxTokenSupply: new BigNumber('26250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('26250000').mul(precision).valueOf(),
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            await ico.burnTokens();
            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: new BigNumber('700000000').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    maxTokenSupply: new BigNumber('26250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('26250000').mul(precision).valueOf(),
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });
        });

        it("check isActive & withinPeriod & setPurchaseLimits & setEtherInUSD", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();
            await Utils.checkState({ico, token}, {
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            assert.equal(await ico.withinPeriod.call().valueOf(), true, "ico.withinPeriod().valueOf() not equal");
            assert.equal(await ico.isActive.call().valueOf(), true, "ico.isActive().valueOf() not equal");

            await ico.testChangeSoldTokens(new BigNumber('726250000').mul(precision).valueOf());
            assert.equal(await ico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");

            await ico.testChangeSoldTokens(new BigNumber(0).mul(precision).valueOf());
            await ico.testChangeCollectedUSD(new BigNumber('30000000').mul(usdPrecision).valueOf());
            assert.equal(await ico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000 + 3600), parseInt(new Date().getTime() / 1000 + 7200));

            assert.equal(await ico.withinPeriod.call().valueOf(), false, "ico.withinPeriod().valueOf() not equal");
            assert.equal(await ico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000 - 7200), parseInt(new Date().getTime() / 1000 - 3600));

            assert.equal(await ico.withinPeriod.call().valueOf(), false, "ico.withinPeriod().valueOf() not equal");
            assert.equal(await ico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 7200));
            await ico.testChangeCollectedUSD(new BigNumber('0').mul(usdPrecision).valueOf());

            assert.equal(await ico.withinPeriod.call().valueOf(), true, "ico.withinPeriod().valueOf() not equal");
            assert.equal(await ico.isActive.call().valueOf(), true, "ico.isActive().valueOf() not equal");

            //setPurchaseLimits
            await ico.setPurchaseLimits(29, 2992, {from: accounts[1]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await ico.setPurchaseLimits(28, 2882);
            await ico.setPurchaseLimits(2882, 28);
            await Utils.checkState({ico, token}, {
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: 28,
                    maxPurchase: 2882,
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    // startTime: icoSince,
                    // endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            //check set ethers in usd
            assert.equal(await ico.etherPriceInUSD.call().valueOf(), new BigNumber('119493000').valueOf(), "etherPriceInUSD not equal");

            await ico.setEtherInUSD('1194.950008')
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await ico.setEtherInUSD('1194.95000', {from: rewardsAddress})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await ico.setEtherInUSD('1194.95000', {from: signAddress})
                .then(Utils.receiptShouldSucceed);

            await Utils.checkState({ico, token}, {
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: 28,
                    maxPurchase: 2882,
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    // startTime: icoSince,
                    // endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1194.95000').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });
        });

        it("check calculateTokensAmount & minInvest & maxInvest", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            let amount = await ico.calculateTokensAmount.call(new BigNumber('2').mul(precision).valueOf());
            //token = 1 ether * etherInUsd / price
            //10 ^ 18 * 2 * 119493000 / 10000 = 23898600000000000000000
            //23898600000000000000000 * 125/100 = 29873250000000000000000
            assert.equal(amount[0], new BigNumber('29873.25').mul(precision).valueOf(), "tokensAmount is not equal");
            //x = value * etherInUsd / 1 eth
            //10 ^ 18 * 2 * 119493000 / 10 ^ 18 = 238986000
            assert.equal(amount[1], new BigNumber('238986000').valueOf(), "usdAmount is not equal");

            //check minInvest
            //999 tokens = val * etherInUsd / price
            //999 * 10 ^ 18 * 10000 / 119493000 = 83603223619793628.0786322211342924
            amount = await ico.calculateTokensAmount.call(new BigNumber('83603223619793628').valueOf());
            assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "tokensAmount is not equal");
            assert.equal(amount[1], new BigNumber('0').valueOf(), "usdAmount is not equal");

            //250000 * 10 ^ 18 * 10000 / 119493000 = 20921727632580988007.665721004577674
            amount = await ico.calculateTokensAmount.call(new BigNumber('20921727632580988007.665721004577674').valueOf());
            //312500
            assert.equal(amount[0], new BigNumber('312499999999999999990056').valueOf(), "tokensAmount is not equal");
            //2500000000
            assert.equal(amount[1], new BigNumber('2499999999').valueOf(), "usdAmount is not equal");

            //check maxInvest
            //250001 * 10 ^ 18 * 10000 / 119493000 = 20921811319491518331.6177516674616923
            amount = await ico.calculateTokensAmount.call(new BigNumber('20921811319491518331.6177516674616923').valueOf());
            assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "tokensAmount is not equal");
            assert.equal(amount[1], new BigNumber('0').valueOf(), "usdAmount is not equal");
        });

        it("check buy", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            //10 ^ 18 * 119493000 / 10000 * 125/100 = 14936625000000000000000
            makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: new BigNumber('14936.625').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('14936.625').mul(precision).valueOf(),
                    collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                    etherHolder: etherHolder,
                    collectedUSD: new BigNumber('119493000').valueOf(),
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: new BigNumber('1').mul(precision).valueOf()},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            //hardCap
            await ico.testChangeCollectedUSD(3000000000000);

            makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: new BigNumber('14936.625').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('14936.625').mul(precision).valueOf(),
                    collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                    etherHolder: etherHolder,
                    collectedUSD: new BigNumber('3000000000000').valueOf(),
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: new BigNumber('1').mul(precision).valueOf()},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });
            await ico.testChangeCollectedUSD(119493000);

            //maxSupply
            await ico.testChangeSoldTokens(3000000000000);

            makeTransactionKYC(ico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

        });

        it("check refund", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            let acc0EthBal0 = await Utils.getEtherBalance(accounts[0]);
            let acc1EthBal0 = await Utils.getEtherBalance(accounts[1]);

            //10 ^ 18 * 119493000 / 10000 * 125/100 = 14936625000000000000000
            await makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            await makeTransactionKYC(ico, signAddress, accounts[1], new BigNumber('2').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            let acc0EthBal1 = await Utils.getEtherBalance(accounts[0]);
            let acc1EthBal1 = await Utils.getEtherBalance(accounts[1]);

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: new BigNumber('14936.625').mul(precision).valueOf()},
                        {[accounts[1]]: new BigNumber('29873.25').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('44809.875').mul(precision).valueOf(),
                    collectedEthers: new BigNumber('3').mul(precision).valueOf(),
                    etherHolder: etherHolder,
                    collectedUSD: new BigNumber('358479000').valueOf(),
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: new BigNumber('1').mul(precision).valueOf()},
                        {[accounts[1]]: new BigNumber('2').mul(precision).valueOf()},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            assert.equal(await ico.refund.call(), false, 'refund is not equal');
            assert.equal(await ico.refund.call({from: accounts[1]}), false, 'refund is not equal');

            await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 15778463 * 2, parseInt(new Date().getTime() / 1000) - 15778463 - 60 * 60 * 24);

            assert.equal(await ico.refund.call(), true, 'refund is not equal');
            await ico.testChangeCollectedUSD(new BigNumber('1000000').mul(usdPrecision).valueOf());
            assert.equal(await ico.refund.call(), false, 'refund is not equal');
            await ico.testChangeCollectedUSD(new BigNumber('1000000').sub('1').mul(usdPrecision).valueOf());

            assert.equal(await ico.refund.call(), true, 'refund is not equal');
            assert.equal(await ico.refund.call({from: accounts[1]}), true, 'refund is not equal');

            await ico.refund();
            await ico.refund({from: accounts[1]});

            console.log('acc0 balance before transaction -', new BigNumber(acc0EthBal0).valueOf());
            console.log('              after transaction -', new BigNumber(acc0EthBal1).valueOf());
            console.log('              after refundddddd -', new BigNumber(await Utils.getEtherBalance(accounts[0])).valueOf());
            console.log('                     difference -', new BigNumber(new BigNumber(await Utils.getEtherBalance(accounts[0]))).sub(acc0EthBal1).div(precision).valueOf());

            console.log('acc1 balance before transaction -', new BigNumber(acc1EthBal0).valueOf());
            console.log('              after transaction -', new BigNumber(acc1EthBal1).valueOf());
            console.log('              after refundddddd -', new BigNumber(await Utils.getEtherBalance(accounts[1])).valueOf());
            console.log('                     difference -', new BigNumber(new BigNumber(await Utils.getEtherBalance(accounts[1]))).sub(acc1EthBal1).div(precision).valueOf());

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: new BigNumber('29873.25').add('14936.625').mul(precision).valueOf()},
                        {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                        {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('44809.875').mul(precision).valueOf(),
                    collectedEthers: new BigNumber('3').mul(precision).valueOf(),
                    etherHolder: etherHolder,
                    collectedUSD: new BigNumber('1000000').sub('1').mul(usdPrecision).valueOf(),
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                        {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

        });

        it("check transferEthers", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            let contractBalance0 = await Utils.getEtherBalance(ico.address);
            let etherHolderBalance0 = await Utils.getEtherBalance(etherHolder);

            await makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            await makeTransactionKYC(ico, signAddress, accounts[1], new BigNumber('2').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            let contractBalance1 = await Utils.getEtherBalance(ico.address);
            let etherHolderBalance1 = await Utils.getEtherBalance(etherHolder);

            await ico.testChangeCollectedUSD(new BigNumber('1000000').mul(usdPrecision).valueOf());

            await makeTransactionKYC(ico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
                .then(Utils.receiptShouldSucceed);

            let contractBalance2 = await Utils.getEtherBalance(ico.address);
            let etherHolderBalance2 = await Utils.getEtherBalance(etherHolder);

            console.log('initianl balance contract ico                      -', new BigNumber(contractBalance0).valueOf());
            console.log('         balance after transaction before soft cap -', new BigNumber(contractBalance1).valueOf());
            console.log('         balance after transaction after soft cap  -', new BigNumber(contractBalance2).valueOf());

            console.log('initianl balance etherHolder ico                   -', new BigNumber(etherHolderBalance0).valueOf());
            console.log('         balance after transaction before soft cap -', new BigNumber(etherHolderBalance1).valueOf());
            console.log('         balance after transaction after soft cap  -', new BigNumber(etherHolderBalance2).valueOf());

        });

        it("check burnTokens", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            await ico.testChangeSoldTokens(new BigNumber('28000000').mul(precision).valueOf());
            await ico.burnTokens({from: accounts[4]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);

            await ico.burnTokens();
            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('28000000').mul(precision).valueOf(),
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            await ico.testChangeICOPeriod(
                parseInt(new Date().getTime() / 1000) - 15778463 * 2,
                parseInt(new Date().getTime() / 1000) - 15778463 - 60 * 60 * 24
            );
            await ico.burnTokens();
            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: new BigNumber('726250000').sub('28000000').mul(precision).valueOf()},
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    maxTokenSupply: new BigNumber('28000000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('28000000').mul(precision).valueOf(),
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            await ico.burnTokens();
            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: new BigNumber('726250000').sub('28000000').mul(precision).valueOf()},
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    maxTokenSupply: new BigNumber('28000000').mul(precision).valueOf(),
                    soldTokens: new BigNumber('28000000').mul(precision).valueOf(),
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

        });

        it("check getStats", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                token: {
                    balanceOf: [
                        {[rewardsAddress]: 0},
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                },
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            let stats = await ico.getStats.call(new BigNumber('3').mul(precision).valueOf(), new BigNumber('2').mul(precision).valueOf());
            assert.equal(stats[0], new BigNumber(icoSince).valueOf(), "startTime is not equal");
            assert.equal(stats[1], new BigNumber(icoTill).valueOf(), "endTime is not equal");
            assert.equal(stats[2], new BigNumber('0').mul(precision).valueOf(), "soldTokens is not equal");
            assert.equal(stats[3], new BigNumber('726250000').mul(precision).valueOf(), "maxTokenSupply is not equal");
            assert.equal(stats[4], new BigNumber('1000').mul(precision).valueOf(), "minPurchase is not equal");
            assert.equal(stats[5], new BigNumber('250000').mul(precision).valueOf(), "maxPurchase is not equal");
            assert.equal(stats[6], new BigNumber('1000000').mul(usdPrecision).valueOf(), "softCap is not equal");
            assert.equal(stats[7], new BigNumber('30000000').mul(usdPrecision).valueOf(), "hardCap is not equal");
            assert.equal(stats[8], new BigNumber('0.1').mul(usdPrecision).valueOf(), "price is not equal");
            assert.equal(stats[9], new BigNumber('14936625000000000000000').valueOf(), "tokensPerEth is not equal");
            assert.equal(stats[10], new BigNumber('44809875000000000000000').valueOf(), "tokensPerBtc is not equal");
            assert.equal(stats[11], new BigNumber('29873250000000000000000').valueOf(), "tokensPerLtc is not equal");

            await ico.testChangeICOPeriod(icoSince - 3600 * 24 * 3, icoTill - 3600 * 24 * 3);
            await ico.testChangeSoldTokens(new BigNumber('282828282828').mul(precision).valueOf());
            await ico.setPurchaseLimits(
                new BigNumber('1028').mul(precision).valueOf(),
                new BigNumber('250028').mul(precision).valueOf()
            );
            stats = await ico.getStats.call(new BigNumber('3').mul(precision).valueOf(), new BigNumber('2').mul(precision).valueOf());
            assert.equal(stats[0], new BigNumber(icoSince - 3600 * 24 * 3).valueOf(), "startTime is not equal");
            assert.equal(stats[1], new BigNumber(icoTill - 3600 * 24 * 3).valueOf(), "endTime is not equal");
            assert.equal(stats[2], new BigNumber('282828282828').mul(precision).valueOf(), "soldTokens is not equal");
            assert.equal(stats[3], new BigNumber('726250000').mul(precision).valueOf(), "maxTokenSupply is not equal");
            assert.equal(stats[4], new BigNumber('1028').mul(precision).valueOf(), "minPurchase is not equal");
            assert.equal(stats[5], new BigNumber('250028').mul(precision).valueOf(), "maxPurchase is not equal");
            assert.equal(stats[6], new BigNumber('1000000').mul(usdPrecision).valueOf(), "softCap is not equal");
            assert.equal(stats[7], new BigNumber('30000000').mul(usdPrecision).valueOf(), "hardCap is not equal");
            assert.equal(stats[8], new BigNumber('0.1').mul(usdPrecision).valueOf(), "price is not equal");
            assert.equal(stats[9], new BigNumber('14339160000000000000000').valueOf(), "tokensPerEth is not equal");
            assert.equal(stats[10], new BigNumber('43017480000000000000000').valueOf(), "tokensPerBtc is not equal");
            assert.equal(stats[11], new BigNumber('28678320000000000000000').valueOf(), "tokensPerLtc is not equal");
        });

        it("check calculateEthersAmount & minInvest & maxInvest", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({ico, token}, {
                ico: {
                    preICO: 0x0,
                    privateSale: 0x0,
                    token: token.address,
                    minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                    maxPurchase: new BigNumber('250000').mul(precision).valueOf(),
                    softCap: new BigNumber('1000000').mul(usdPrecision).valueOf(),
                    hardCap: new BigNumber('30000000').mul(usdPrecision).valueOf(),
                    startTime: icoSince,
                    endTime: icoTill,
                    maxTokenSupply: new BigNumber('726250000').mul(precision).valueOf(),
                    soldTokens: 0,
                    collectedEthers: 0,
                    etherHolder: etherHolder,
                    collectedUSD: 0,
                    price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                    etherBalances: [
                        {[accounts[0]]: 0},
                        {[accounts[1]]: 0},
                    ],
                    etherPriceInUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                    allowedMultivests: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                }
            });

            let amount = await ico.calculateEthersAmount.call(new BigNumber('23898600000000000000000').valueOf());

            //token = 1 ether * etherInUsd / price
            //10 ^ 18 * 2 * 119493000 / 10000 = 23898600000000000000000
            //23898600000000000000000 * 125/100 = 29873250000000000000000
            assert.equal(amount[0], new BigNumber('2').mul(precision).valueOf(), "ethers is not equal");
            //x = value * etherInUsd / 1 eth
            //10 ^ 18 * 2 * 119493000 / 10 ^ 18 = 238986000
            assert.equal(amount[1], new BigNumber('5974650000000000000000').valueOf(), "bonus is not equal");

            //check minInvest
            //999 tokens = val * etherInUsd / price
            //999 * 10 ^ 18 * 10000 / 119493000 = 83603223619793628.0786322211342924
            amount = await ico.calculateEthersAmount.call(new BigNumber('999').mul(precision).valueOf());
            assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "ethers is not equal");
            assert.equal(amount[1], new BigNumber('0').valueOf(), "bonus is not equal");

            //250000 * 10 ^ 18 * 1000 / 119493000 = 20921727632580988007.665721004577674
            amount = await ico.calculateEthersAmount.call(new BigNumber('1000').mul(precision).valueOf());
            //83686910530323952.0306628840183107
            assert.equal(amount[0], new BigNumber('83686910530323952').valueOf(), "ethers is not equal");
            //2500000000
            assert.equal(amount[1], new BigNumber('250').mul(precision).valueOf(), "bonus is not equal");

            //check maxInvest
            //250001 * 10 ^ 18 * 10000 / 119493000 = 20921811319491518331.6177516674616923
            amount = await ico.calculateEthersAmount.call(new BigNumber('250001').mul(precision).valueOf());
            assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "tokensAmount is not equal");
            assert.equal(amount[1], new BigNumber('0').valueOf(), "usdAmount is not equal");
        });
    */
});