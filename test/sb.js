var
    PrivateSale = artifacts.require("./PrivateSale.sol"),
    ICO = artifacts.require("./test/TestICO.sol"),
    SupplyBloc = artifacts.require("./test/TestSupplyBloc.sol"),
    LockupContract = artifacts.require("./LockupContract.sol"),

    Utils = require("./utils"),
    BigNumber = require('bignumber.js'),

    precision = new BigNumber("1000000000000000000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600,
    signAddress = web3.eth.accounts[0],
    etherHolder = web3.eth.accounts[5],
    wrongSigAddress = web3.eth.accounts[7],
    rewardsAddress = web3.eth.accounts[8];

// function makeTransaction(instance, value, add, from) {
//     "use strict";
//     return instance.multivestBuy(add, value, {from: from});
// }

async function deploy() {
    const token = await SupplyBloc.new(rewardsAddress, false);
    // const privateico = await PrivateSale.new(
    //     token.address, //_token
    //     etherHolder, //_etherHolder
    //     icoSince, //_startTime
    //     icoTill,//_endTime
    //     new BigNumber('78512000'), //_etherPriceInUSD
    //     new BigNumber('726250000').mul(precision).valueOf(),//_maxTokenSupply
    //     true //_activeWhitelist
    // );
    // const preico = await PreICO.new(
    //     token.address, //_token
    //     etherHolder, //_etherHolder
    //     icoSince, //_startTime
    //     icoTill,//_endTime
    //     new BigNumber('78512000'), //_etherPriceInUSD
    //     new BigNumber('726250000').mul(precision).valueOf()//_maxTokenSupply
    // );
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
    const lockupContract = await LockupContract.new(token.address, ico.address, ico.address);

    await token.addMinter(ico.address);
    await token.setICO(ico.address);
    await token.setLockupContract(lockupContract.address);
    await ico.setAllowedMultivest(signAddress);

    return {token, token, token, ico, lockupContract};
}

contract('Token', function (accounts) {

    it("deploy & check constructor info & check: setICO, SetLocked with transfers", async function () {
        const {token, privateico, preico, ico, lockupContract} = await deploy();

        await Utils.checkState({token}, {
            token: {
                ico: ico.address,
                rewardsAddress: rewardsAddress,
                transferFrozen: true,
                standard: 'SUPX 0.1',
                maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                minters: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
                decimals: 18,
                name: 'SypplyBloc',
                symbol: 'SUPX',
                locked: false,
                balanceOf: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                ],
                totalSupply: new BigNumber('0').mul(precision).valueOf(),
                owner: accounts[0]
            }
        });

        //setICO
        await token.setICO(accounts[2], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await token.setICO(0x0)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await token.setICO(accounts[2])
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({token}, {
            token: {
                ico: accounts[2],
                rewardsAddress: rewardsAddress,
                transferFrozen: true,
                standard: 'SUPX 0.1',
                maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                minters: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
                decimals: 18,
                name: 'SypplyBloc',
                symbol: 'SUPX',
                locked: false,
                balanceOf: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                ],
                totalSupply: new BigNumber('0').mul(precision).valueOf(),
                owner: accounts[0]
            }
        });

        //SetLocked with transfers
        await token.setLocked(true, {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        assert.equal(await token.locked.call(), false, 'locked is not equal')
        await token.setLocked(true)
            .then(Utils.receiptShouldSucceed);
        assert.equal(await token.locked.call(), true, 'locked is not equal')

        await token.testSetFreezing(false);
        await token.addMinter(accounts[3]);

        await Utils.checkState({token}, {
            token: {
                ico: accounts[2],
                rewardsAddress: rewardsAddress,
                transferFrozen: false,
                standard: 'SUPX 0.1',
                maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                minters: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                    {[accounts[3]]: true},
                ],
                decimals: 18,
                name: 'SypplyBloc',
                symbol: 'SUPX',
                locked: true,
                balanceOf: [
                    {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                    {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                ],
                totalSupply: new BigNumber('0').mul(precision).valueOf(),
                owner: accounts[0]
            }
        });

        await token.setICO(ico.address)
            .then(Utils.receiptShouldSucceed);

        await token.mint(accounts[0], 1000, {from: accounts[3]})
            .then(() => Utils.balanceShouldEqualTo(token, accounts[0], 1000));
        await ico.testSetICOBalance(accounts[0], 1000);

        await token.transfer(accounts[1], 500)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await token.approve(accounts[1], 500);
        assert.equal(await token.transferFrom.call(accounts[0], accounts[1], 500, {from: accounts[1]}).valueOf(), false, 'transferFrom is not equal');

        await token.setLocked(false)
            .then(Utils.receiptShouldSucceed);
        assert.equal(await token.locked.call(), false, 'locked is not equal');
        await token.setICO(ico.address)
            .then(Utils.receiptShouldSucceed);

        await Utils.checkState({token}, {
            token: {
                ico: ico.address,
                rewardsAddress: rewardsAddress,
                transferFrozen: false,
                standard: 'SUPX 0.1',
                maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                minters: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                    {[accounts[3]]: true},
                ],
                decimals: 18,
                name: 'SypplyBloc',
                symbol: 'SUPX',
                locked: false,
                balanceOf: [
                    {[accounts[1]]: 0},
                    {[accounts[0]]: 1000},
                ],
                totalSupply: new BigNumber('1000').valueOf(),
                owner: accounts[0]
            }
        });

        assert.equal(await token.isTransferAllowed.call(accounts[0], 500), false, 'isTransferAllowed is not equal');
        await token.transfer(accounts[1], 500)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await token.approve(accounts[1], 500);
        assert.equal(await token.transferFrom.call(accounts[0], accounts[1], 500, {from: accounts[1]}).valueOf(), false, 'transferFrom is not equal');

        await ico.testChangeCollectedUSD(500000000001);
        assert.equal(await token.isTransferAllowed.call(accounts[0], 500), true, 'isTransferAllowed is not equal');

        await token.transfer(accounts[1], 500)
            .then(Utils.receiptShouldSucceed);
        await token.approve(accounts[1], 500);
        await token.transferFrom(accounts[0], accounts[1], 500, {from: accounts[1]});

        await Utils.checkState({token}, {
            token: {
                ico: ico.address,
                rewardsAddress: rewardsAddress,
                transferFrozen: false,
                standard: 'SUPX 0.1',
                maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                minters: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                    {[accounts[3]]: true},
                ],
                decimals: 18,
                name: 'SypplyBloc',
                symbol: 'SUPX',
                locked: false,
                balanceOf: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 1000},
                ],
                totalSupply: new BigNumber('1000').valueOf(),
                owner: accounts[0]
            }
        });

    });

    it("deploy & freezing & transfer & approve & transferFrom", async function () {
        const {token, privateico, preico, ico, allocations} = await deploy();

        await token.addMinter(accounts[3]);
        await token.setICO(ico.address)
            .then(Utils.receiptShouldSucceed);
        await token.mint(accounts[0], 1000, {from: accounts[3]})
            .then(() => Utils.balanceShouldEqualTo(token, accounts[0], 1000));

        await Utils.checkState({token}, {
            token: {
                ico: ico.address,
                rewardsAddress: rewardsAddress,
                transferFrozen: true,
                standard: 'SUPX 0.1',
                maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                minters: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                    {[accounts[3]]: true},
                ],
                decimals: 18,
                name: 'SypplyBloc',
                symbol: 'SUPX',
                locked: false,
                balanceOf: [
                    {[accounts[0]]: new BigNumber('1000').valueOf()},
                    {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                ],
                totalSupply: new BigNumber('1000').valueOf(),
                owner: accounts[0]
            }
        });

        await token.freezing(false, {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        assert.equal(await token.transferFrozen.call(), true, 'transferFrozen is not equal');
        await token.freezing(false);
        assert.equal(await token.transferFrozen.call(), true, 'transferFrozen is not equal');

        await token.transfer(accounts[1], 500)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await token.approve(accounts[1], 500);
        assert.equal(await token.transferFrom.call(accounts[0], accounts[1], 500, {from: accounts[0]}).valueOf(), false, "transferFrom not equal");

        await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000 - 7200), parseInt(new Date().getTime() / 1000 - 3600));
        assert.equal(await ico.isActive.call().valueOf(), false, "ico.isActive().valueOf() not equal");
        await token.freezing(false);
        assert.equal(await token.transferFrozen.call(), false, 'transferFrozen is not equal');
        await ico.testChangeCollectedUSD(100000100000);
        await token.transfer(accounts[1], 500)
            .then(Utils.receiptShouldSucceed);
        await token.approve(accounts[1], 500);
        assert.equal(await token.transferFrom.call(accounts[0], accounts[1], 500, {from: accounts[1]}).valueOf(), true, "transferFrom not equal");
        await token.transferFrom(accounts[0], accounts[1], 500, {from: accounts[1]});
        await Utils.checkState({token}, {
            token: {
                ico: ico.address,
                rewardsAddress: rewardsAddress,
                transferFrozen: false,
                standard: 'SUPX 0.1',
                maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                minters: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                    {[accounts[3]]: true},
                ],
                decimals: 18,
                name: 'SypplyBloc',
                symbol: 'SUPX',
                locked: false,
                balanceOf: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 1000},
                ],
                totalSupply: new BigNumber('1000').valueOf(),
                owner: accounts[0]
            }
        });
    });
    /*
        it("check locking", async function () {
            const {token, privateico, preico, ico, allocations} = await deploy();

            await Utils.checkState({token}, {
                token: {
                    ico: ico.address,
                    rewardsAddress: rewardsAddress,
                    lockedInvestors: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: false},
                    ],
                    transferFrozen: true,
                    standard: 'SUPX 0.1',
                    maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                    minters: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                    decimals: 18,
                    name: 'SypplyBloc',
                    symbol: 'SUPX',
                    locked: false,
                    balanceOf: [
                        {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                        {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                    ],
                    totalSupply: new BigNumber('0').mul(precision).valueOf(),
                    owner: accounts[0]
                }
            });

            await token.lockInvestor(accounts[1], true, {from: accounts[1]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await token.lockInvestor(0x0, true)
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await token.lockInvestor(accounts[1], true)
                .then(Utils.receiptShouldSucceed);

            await Utils.checkState({token}, {
                token: {
                    ico: ico.address,
                    rewardsAddress: rewardsAddress,
                    lockedInvestors: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: true},
                    ],
                    transferFrozen: true,
                    standard: 'SUPX 0.1',
                    maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                    minters: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                    ],
                    decimals: 18,
                    name: 'SypplyBloc',
                    symbol: 'SUPX',
                    locked: false,
                    balanceOf: [
                        {[accounts[0]]: new BigNumber('0').mul(precision).valueOf()},
                        {[accounts[1]]: new BigNumber('0').mul(precision).valueOf()},
                    ],
                    totalSupply: new BigNumber('0').mul(precision).valueOf(),
                    owner: accounts[0]
                }
            });

            await token.addMinter(accounts[3]);
            await token.setICO(ico.address)
                .then(Utils.receiptShouldSucceed);
            await token.mint(accounts[1], 1000, {from: accounts[3]})
                .then(() => Utils.balanceShouldEqualTo(token, accounts[1], 1000));

            assert.equal(await token.isLocked.call(accounts[3]), false, 'isLocked is not equal');
            assert.equal(await token.isLocked.call(accounts[1]), true, 'isLocked is not equal');
            //1 half year = 15 778 463 seconds
            await ico.testChangeICOPeriod(
                parseInt(new Date().getTime() / 1000) - 15778463 * 2,
                parseInt(new Date().getTime() / 1000) - 15778463 + 60 * 60 * 24
            );
            await token.freezing(false);

            await token.transfer(accounts[0], 500, {from: accounts[1]})
                .then(Utils.receiptShouldFailed)
                .catch(Utils.catchReceiptShouldFailed);
            await token.approve(accounts[0], 500, {from: accounts[1]});
            assert.equal(await token.transferFrom.call(accounts[1], accounts[0], 500).valueOf(), false, "transferFrom not equal");

            assert.equal(await token.isLocked.call(accounts[1]), true, 'isLocked is not equal');
            await ico.testChangeICOPeriod(
                parseInt(new Date().getTime() / 1000) - 15778463 * 2,
                parseInt(new Date().getTime() / 1000) - 15778463 - 60 * 60 * 24
            );
            assert.equal(await token.isLocked.call(accounts[1]), false, 'isLocked is not equal');
            assert.equal(await token.transferFrozen.call(), false, 'transferFrozen is not equal');
            await ico.testChangeCollectedUSD(500000000001);
            await token.transfer(accounts[0], 500, {from: accounts[1]})
                .then(Utils.receiptShouldSucceed);
            await token.approve(accounts[0], 500, {from: accounts[1]});
            await token.transferFrom(accounts[1], accounts[0], 500);

            await Utils.checkState({token}, {
                token: {
                    ico: ico.address,
                    rewardsAddress: rewardsAddress,
                    lockedInvestors: [
                        {[accounts[0]]: false},
                        {[accounts[1]]: true},
                    ],
                    transferFrozen: false,
                    standard: 'SUPX 0.1',
                    maxSupply: new BigNumber('750000000').mul(precision).valueOf(),
                    minters: [
                        {[accounts[0]]: true},
                        {[accounts[1]]: false},
                        {[accounts[3]]: true},
                    ],
                    decimals: 18,
                    name: 'SypplyBloc',
                    symbol: 'SUPX',
                    locked: false,
                    balanceOf: [
                        {[accounts[1]]: 0},
                        {[accounts[0]]: 1000},
                    ],
                    totalSupply: new BigNumber('1000').valueOf(),
                    owner: accounts[0]
                }
            });
        });
    */
});