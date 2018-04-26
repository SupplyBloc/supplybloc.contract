var
    PrivateSale = artifacts.require("./test/TestPrivateSale.sol"),
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
    const privateico = await PrivateSale.new(
        token.address, //_token
        etherHolder, //_etherHolder
        icoSince, //_startTime
        icoTill,//_endTime
        new BigNumber('119493000').valueOf(), //_etherPriceInUSD
        new BigNumber('15000000').mul(precision).valueOf(),//_maxTokenSupply
    );
    const ico = await ICO.new(
        token.address, //_token
        etherHolder, //_etherHolder
        icoSince, //_startTime
        icoTill,//_endTime
        new BigNumber('726250000').mul(precision).valueOf(),//_maxTokenSupply
        icoTill + 3600, //_startTime
        icoTill + 3600 * 2,//_endTime
        new BigNumber('78512000'), //_etherPriceInUSD
        new BigNumber('726250000').mul(precision).valueOf()//_maxTokenSupply
    );
    const allocations = await SupplyBlocAllocation.new(token.address, ico.address);
    const lockupContract = await LockupContract.new(token.address, ico.address, ico.address);

    await token.addMinter(ico.address);
    await token.addMinter(privateico.address);
    await token.setICO(ico.address);
    await token.setPrivateSale(privateico.address);
    await token.setLockupContract(lockupContract.address);
    await ico.setAllowedMultivest(signAddress);
    await privateico.setAllowedMultivest(signAddress);
    await privateico.setLockupContract(lockupContract.address);

    return {token, privateico, ico, allocations, lockupContract};
}

contract('PrivateSale', function (accounts) {

    it("deploy & check constructor info", async function () {
        const {token, privateico, ico, allocations, lockupContract} = await deploy();

        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        //setSupplyBloc
        await privateico.setSupplyBloc(accounts[2], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await privateico.setSupplyBloc(0x0)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await privateico.setSupplyBloc(accounts[2])
            .then(Utils.receiptShouldSucceed);
        //setLockupContract
        await privateico.setLockupContract(accounts[2], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await privateico.setLockupContract(0x0)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await privateico.setLockupContract(accounts[2])
            .then(Utils.receiptShouldSucceed);
        //setSupplyBloc
        await privateico.setEtherHolder(accounts[2], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await privateico.setEtherHolder(accounts[2])
            .then(Utils.receiptShouldSucceed);

        //updateWhitelist
        await privateico.updateWhitelist(accounts[2], true, {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await privateico.updateWhitelist(accounts[2], true)
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: accounts[2],
                token: accounts[2],
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: accounts[2],
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                    {[accounts[2]]: true},
                ],
            }
        });

    });

    it("check buy & check burnUnsoldTokens & changeSalePeriod", async function () {
        const {token, privateico, ico, allocations, lockupContract} = await deploy();

        let etherHolderBalance = await Utils.getEtherBalance(etherHolder);

        await Utils.checkState({privateico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: 0},
                ],
            },
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        await makeTransactionKYC(privateico, wrongSigAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        //10 ^ 18 * 119493000 / 10000 * 150/100 = 16131555000000000000000
        await makeTransactionKYC(privateico, signAddress, accounts[0], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({privateico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: new BigNumber('17923.95').mul(precision).valueOf()},
                ],
            },
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: new BigNumber('17923.95').mul(precision).valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        await privateico.burnUnsoldTokens({from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await privateico.burnUnsoldTokens();

        await Utils.checkState({privateico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: new BigNumber('17923.95').mul(precision).valueOf()},
                ],
            },
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: new BigNumber('17923.95').mul(precision).valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        await privateico.changeSalePeriod(1253, 231525, {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await privateico.changeSalePeriod(icoSince - 3600 * 2, icoSince - 3600);

        await privateico.burnUnsoldTokens();

        await Utils.checkState({token, privateico}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: new BigNumber('15000000').sub('17923.95').mul(precision).valueOf()},
                    {[accounts[0]]: new BigNumber('17923.95').mul(precision).valueOf()},
                ],
            },
            privateico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                // startTime: icoSince,
                // endTime: icoTill,
                maxTokenSupply: new BigNumber('17923.95').mul(precision).valueOf(),
                soldTokens: new BigNumber('17923.95').mul(precision).valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('119493000').valueOf(),
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        await privateico.burnUnsoldTokens();

        await Utils.checkState({token, privateico}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: new BigNumber('15000000').sub('17923.95').mul(precision).valueOf()},
                    {[accounts[0]]: new BigNumber('17923.95').mul(precision).valueOf()},
                ],
            },
            privateico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                // startTime: icoSince,
                // endTime: icoTill,
                maxTokenSupply: new BigNumber('17923.95').mul(precision).valueOf(),
                soldTokens: new BigNumber('17923.95').mul(precision).valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('119493000').valueOf(),
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        console.log('etherHolder before transaction', new BigNumber(etherHolderBalance).valueOf());
        console.log('etherHolder afterr transaction', new BigNumber(await Utils.getEtherBalance(etherHolder)).valueOf());
        console.log('                     should be', new BigNumber(precision).valueOf());
        console.log('                     it is    ', new BigNumber(await Utils.getEtherBalance(etherHolder)).sub(etherHolderBalance).valueOf());
    });

    it('check whitelisting', async function () {
        const {token, privateico, ico, allocations, lockupContract} = await deploy();
        let other = accounts[5];
        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        await privateico.updateWhitelist(other, true);
        assert.equal(await privateico.whitelist.call(other).valueOf(), true, 'whitelist isn\'t equal');

        other = accounts[1];
        await privateico.updateWhitelist(other, true, {from: other})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed)
        assert.equal(await privateico.whitelist.call(other).valueOf(), false, 'whitelist isn\'t equal');
        await privateico.updateWhitelist(other, true);
        assert.isTrue(await privateico.whitelist.call(other).valueOf() == true);
        await privateico.updateWhitelist(other, false, {from: other})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed)
        assert.isTrue(await privateico.whitelist.call(other).valueOf() == true);
        await privateico.updateWhitelist(other, false)
        assert.isTrue(await privateico.whitelist.call(other).valueOf() == false);
    });

    it('check transaction through whitelisting', async function () {
        const {token, privateico, ico, allocations, lockupContract} = await deploy();

        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        await privateico.sendTransaction({value: new BigNumber('1').mul(precision)})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await privateico.updateWhitelist(accounts[0], true);
        await privateico.updateWhitelist(accounts[1], true);

        //10 ^ 18 * 119493000 / 10000 * 125/100 = 17923950000000000000000
        await privateico.sendTransaction({value: new BigNumber('1').mul(precision)})
            .then(Utils.receiptShouldSucceed);
        await privateico.sendTransaction({value: new BigNumber('2').mul(precision), from: accounts[1]})
            .then(Utils.receiptShouldSucceed);

        let acc0EthBal1 = await Utils.getEtherBalance(accounts[0]);
        let acc1EthBal1 = await Utils.getEtherBalance(accounts[1]);

        await Utils.checkState({privateico, token}, {
            token: {
                balanceOf: [
                    {[rewardsAddress]: 0},
                    {[accounts[0]]: new BigNumber('17923.95').mul(precision).valueOf()},
                    {[accounts[1]]: new BigNumber('35847.9').mul(precision).valueOf()},
                ],
            },
            privateico: {
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: new BigNumber('53771.85').mul(precision).valueOf(),
                collectedEthers: new BigNumber('3').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('358479000').valueOf(),
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
    });

    it("check isActive & withinPeriod & setEtherInUSD", async function () {
        const {token, privateico, ico, allocations, lockupContract} = await deploy();

        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        assert.equal(await privateico.withinPeriod.call().valueOf(), true, "ico.withinPeriod().valueOf() not equal");
        assert.equal(await privateico.isActive.call().valueOf(), true, "ico.isActive().valueOf() not equal");

        await privateico.testChangeSoldTokens(new BigNumber('15000000').mul(precision).valueOf());
        assert.equal(await privateico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");

        await privateico.testChangeSoldTokens(new BigNumber(0).mul(precision).valueOf());

        await privateico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000 + 3600), parseInt(new Date().getTime() / 1000 + 7200));

        assert.equal(await privateico.withinPeriod.call().valueOf(), false, "ico.withinPeriod().valueOf() not equal");
        assert.equal(await privateico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");

        await privateico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000 - 7200), parseInt(new Date().getTime() / 1000 - 3600));

        assert.equal(await privateico.withinPeriod.call().valueOf(), false, "ico.withinPeriod().valueOf() not equal");
        assert.equal(await privateico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");

        await privateico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 7200));
        await privateico.testChangeCollectedUSD(new BigNumber('0').mul(usdPrecision).valueOf());

        assert.equal(await privateico.withinPeriod.call().valueOf(), true, "ico.withinPeriod().valueOf() not equal");
        assert.equal(await privateico.isActive.call().valueOf(), true, "ico.isActive().valueOf() not equal");

        //check set ethers in usd
        assert.equal(await privateico.etherPriceInUSD.call().valueOf(), new BigNumber('119493000').valueOf(), "etherPriceInUSD not equal");

        await privateico.setEtherInUSD('1194.950008')
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await privateico.setEtherInUSD('1194.95000', {from: rewardsAddress})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await privateico.setEtherInUSD('1194.95000', {from: signAddress})
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.95').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

    });

    it("check calculateTokensAmount & minInvest", async function () {
        const {token, privateico, ico, allocations, lockupContract} = await deploy();

        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        let amount = await privateico.calculateTokensAmount.call(new BigNumber('2').mul(precision).valueOf());
        //token = 1 ether * etherInUsd / price
        //10 ^ 18 * 2 * 119493000 / 10000 = 23898600000000000000000
        //23898600000000000000000 * 150/100 = 29873250000000000000000
        assert.equal(amount[0], new BigNumber('35847.9').mul(precision).valueOf(), "tokensAmount is not equal");
        //x = value * etherInUsd / 1 eth
        //10 ^ 18 * 2 * 119493000 / 10 ^ 18 = 238986000
        assert.equal(amount[1], new BigNumber('238986000').valueOf(), "usdAmount is not equal");

        //check minInvest
        //999 tokens = val * etherInUsd / price
        //999 * 10 ^ 18 * 10000 / 119493000 = 83603223619793628.0786322211342924
        amount = await privateico.calculateTokensAmount.call(new BigNumber('83603223619793628').valueOf());
        assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "tokensAmount is not equal");
        assert.equal(amount[1], new BigNumber('0').valueOf(), "usdAmount is not equal");

        //250000 * 10 ^ 18 * 10000 / 119493000 = 20921727632580988007.665721004577674
        amount = await privateico.calculateTokensAmount.call(new BigNumber('20921727632580988008').valueOf());
        assert.equal(amount[0], new BigNumber('375000000000000000005991').valueOf(), "tokensAmount is not equal");
        assert.equal(amount[1], new BigNumber('2500000000').valueOf(), "usdAmount is not equal");
    });

    it("check calculateEthersAmount & minInvest", async function () {
        const {token, privateico, ico, allocations, lockupContract} = await deploy();

        await Utils.checkState({privateico, token}, {
            privateico: {
                lockupContract: lockupContract.address,
                token: token.address,
                minPurchase: new BigNumber('1000').mul(precision).valueOf(),
                softCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('0').mul(usdPrecision).valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                maxTokenSupply: new BigNumber('15000000').mul(precision).valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                price: new BigNumber('0.1').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                etherPriceInUSD: new BigNumber('1194.93').mul(usdPrecision).valueOf(),
                allowedMultivests: [
                    {[signAddress]: true},
                    {[accounts[1]]: false},
                ],
                whitelist: [
                    {[accounts[0]]: false},
                    {[accounts[1]]: false},
                ],
            }
        });

        let amount = await privateico.calculateEthersAmount.call(new BigNumber('23898600000000000000000').valueOf());

        //token = 1 ether * etherInUsd / price
        //10 ^ 18 * 2 * 119493000 / 10000 = 23898600000000000000000
        //23898600000000000000000 * 150/100 = 35847900000000000000000
        assert.equal(amount[0], new BigNumber('2').mul(precision).valueOf(), "ethers is not equal");
        //x = value * etherInUsd / 1 eth
        //10 ^ 18 * 2 * 119493000 / 10 ^ 18 = 238986000
        assert.equal(amount[1], new BigNumber('11949300000000000000000').valueOf(), "bonus is not equal");

        //check minInvest
        //999 tokens = val * etherInUsd / price
        //999 * 10 ^ 18 * 10000 / 119493000 = 83603223619793628.0786322211342924
        amount = await privateico.calculateEthersAmount.call(new BigNumber('999').mul(precision).valueOf());
        assert.equal(amount[0], new BigNumber('0').mul(precision).valueOf(), "ethers is not equal");
        assert.equal(amount[1], new BigNumber('0').valueOf(), "bonus is not equal");

        //250000 * 10 ^ 18 * 1000 / 119493000 = 20921727632580988007.665721004577674
        amount = await privateico.calculateEthersAmount.call(new BigNumber('1000').mul(precision).valueOf());
        //83686910530323952.0306628840183107
        assert.equal(amount[0], new BigNumber('83686910530323952').valueOf(), "ethers is not equal");
        //2500000000
        assert.equal(amount[1], new BigNumber('500').mul(precision).valueOf(), "bonus is not equal");
    });

});