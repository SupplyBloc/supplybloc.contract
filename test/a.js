var
    PrivateSale = artifacts.require("./PrivateSale.sol"),
    ICO = artifacts.require("./test/TestICO.sol"),
    SupplyBloc = artifacts.require("./test/TestSupplyBlocVesting.sol"),
    SupplyBlocAllocation = artifacts.require("./SupplyBlocAllocation.sol"),
    LockupContract = artifacts.require("./test/TestLockupContract.sol"),
    PeriodicTokenVesting = artifacts.require("./PeriodicTokenVesting.sol"),

    Utils = require("./utils"),
    BigNumber = require('BigNumber.js'),

    precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 + 4600),
    icoTill = parseInt(new Date().getTime() / 1000) + 8 * 3600,
    monthSeconds = 2629744,
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
        new BigNumber('726250000').mul(precision).valueOf(),//_maxTokenSupply
        icoTill + 3600, //_startTime
        icoTill + 3600 * 2,//_endTime
        new BigNumber('78512000'), //_etherPriceInUSD
        new BigNumber('726250000').mul(precision).valueOf()//_maxTokenSupply
    );
    const allocation = await SupplyBlocAllocation.new();
    const lockupContract = await LockupContract.new(token.address, ico.address, ico.address);

    await token.addMinter(ico.address);
    await token.addMinter(allocation.address);
    await token.setICO(ico.address);
    await ico.setAllowedMultivest(signAddress);
    await allocation.setLockupContract(lockupContract.address);

    return {token, ico, ico, ico, allocation};
}

contract('Allocation', function (accounts) {

    it("check that after creation & initVesting, allocate - all balances are filled", async function () {
        const {token, privateSale, allocation} = await deploy();

        await Utils.checkState({token, privateSale, allocation}, {
            token: {
                balanceOf: [
                    {["0x68Eb4779493F77551FB37Af20D780C5DE7e2518C".toLowerCase()]: new BigNumber('0').mul(precision).valueOf()},
                ],
                // totalSupply: new BigNumber('150000000').mul(precision).valueOf(),
                owner: accounts[0]
            },
        });

        await  allocation.setICOEndTime(icoTill)

        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);

        await allocation.allocate(token.address)
            .then(Utils.receiptShouldSucceed);
        await allocation.allocate(token.address)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        await Utils.checkState({token, privateSale, allocation}, {
            token: {
                balanceOf: [
                    {["0x68Eb4779493F77551FB37Af20D780C5DE7e2518C".toLowerCase()]: new BigNumber('37500000').mul(precision).valueOf()},
                ],
                owner: accounts[0]
            },
        });
    })

    it("check that created vesting has correctly inited variables (equal what was send to createVesting)", async function () {
        const {token, privateSale, allocation} = await deploy();
        await  allocation.setICOEndTime(icoTill)
        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await allocation.initVesting({from:accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await allocation.allocate(token.address)
            .then(Utils.receiptShouldSucceed);

        let vesting = await PeriodicTokenVesting.at(await allocation.vestings.call(10)) //Address of the contract, obtained from Etherscan
        assert.equal(await vesting.periods.call(), 18, 'periods is not equal');
        assert.equal(await vesting.beneficiary.call(), "0x05144813c041e5B9258003eB5F96674881947ea6".toLowerCase(), '_beneficiary is not equal');
        assert.equal( new BigNumber( await vesting.start.call()).valueOf(), icoTill , 'start is not equal');
        assert.equal(await vesting.duration.call(), 47304000, 'duration is not equal');
        assert.equal(await vesting.revocable.call(), true, 'revocable is not equal');
        assert.equal(new BigNumber(await token.balanceOf.call(vesting.address)).valueOf(),
            new BigNumber(3409090.909090).mul(precision).valueOf(), 'balance is not equal');

        vesting = await PeriodicTokenVesting.at(await allocation.vestings.call(8)) //Address of the contract, obtained from Etherscan
        assert.equal(await vesting.periods.call(), 12, 'periods is not equal');
        assert.equal(await vesting.beneficiary.call(), "0xF273EE1002804215E371b68a6835A0B6A22E7435".toLowerCase(), '_beneficiary is not equal');
        assert.equal( new BigNumber( await vesting.start.call()).valueOf(), icoTill , 'start is not equal');
        assert.equal(await vesting.duration.call(), 31536000, 'duration is not equal');
        assert.equal(await vesting.revocable.call(), true, 'revocable is not equal');
        assert.equal(new BigNumber(await token.balanceOf.call(vesting.address)).valueOf(),
            new BigNumber(123272727.27273).mul(precision).valueOf(), 'balance is not equal');
    })

    it("check that METHODS could be called only by owner", async function () {
        const {token, privateSale, allocation} = await deploy();
        await  allocation.setICOEndTime(icoTill, {from: accounts[0]})
            .then(Utils.receiptShouldSucceed);
        await  allocation.setICOEndTime(icoTill, {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await  allocation.createVesting(accounts[0], icoTill, 0, 31556926, 3, true, {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await  allocation.createVesting(accounts[0], icoTill, 0, 31556926, 3, true)
            .then(Utils.receiptShouldSucceed)

        let vesting = await PeriodicTokenVesting.at(await allocation.vestings.call(0)) //Address of the contract, obtained from Etherscan
        assert.equal(await vesting.periods.call(), 3, 'periods is not equal');
        assert.equal(await vesting.beneficiary.call(), accounts[0], '_beneficiary is not equal');
        assert.equal(await vesting.start.call(), icoTill, 'start is not equal');
        assert.equal(await vesting.duration.call(), 31556926, 'duration is not equal');
        assert.equal(await vesting.revocable.call(), true, 'revocable is not equal');
        await token.addMinter(accounts[1]);
        await token.mint(vesting.address, 1000, {from: accounts[1]})
        assert.equal(new BigNumber(await vesting.vestedAmount.call(token.address)), 0, 'vestedAmount is not equal')


        await  allocation.createVesting(accounts[2], parseInt(new Date().getTime() / 1000) - 1, 0, 60, 2, true)
            .then(Utils.receiptShouldSucceed)

        vesting = await PeriodicTokenVesting.at(await allocation.vestings.call(1)) //Address of the contract, obtained from Etherscan
        await token.mint(vesting.address, 100, {from: accounts[1]})
        assert.equal(new BigNumber(await vesting.vestedAmount.call(token.address)).valueOf(), 50, 'vestedAmount is not equal')
        await vesting.release(token.address);



        await  allocation.createVesting(accounts[3], parseInt(new Date().getTime() / 1000) - 31, 0, 30, 2, true)
            .then(Utils.receiptShouldSucceed)
        await token.mint(vesting.address, 100, {from: accounts[1]})
        vesting = await PeriodicTokenVesting.at(await allocation.vestings.call(2)) //Address of the contract, obtained from Etherscan
        await token.mint(vesting.address, 100, {from: accounts[1]})
        assert.equal(new BigNumber(await vesting.vestedAmount.call(token.address)).valueOf(), 100, 'vestedAmount is not equal')
        await vesting.release(token.address);
        Utils.balanceShouldEqualTo(token, accounts[2], 50)
        Utils.balanceShouldEqualTo(token, accounts[3], 100)

        await  allocation.createVesting(accounts[4], parseInt(new Date().getTime() / 1000) - 31, 0, 30, 3, true)
            .then(Utils.receiptShouldSucceed)
        vesting = await PeriodicTokenVesting.at(await allocation.vestings.call(3)) //Address of the contract, obtained from Etherscan
        await token.mint(vesting.address, 100, {from: accounts[1]})
        assert.equal(new BigNumber(await vesting.vestedAmount.call(token.address)).valueOf(), 66, 'vestedAmount is not equal')
        await vesting.release(token.address);


        await vesting.release(token.address)
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);

        Utils.balanceShouldEqualTo(token, accounts[4], 66)

        await  allocation.createVesting(accounts[5], parseInt(new Date().getTime() / 1000) - 90000, 0, 30, 2, true)
            .then(Utils.receiptShouldSucceed)
        vesting = await PeriodicTokenVesting.at(await allocation.vestings.call(4)) //Address of the contract, obtained from Etherscan
        await token.mint(vesting.address, 100, {from: accounts[1]})
        assert.equal(new BigNumber(await vesting.vestedAmount.call(token.address)).valueOf(), 100, 'vestedAmount is not equal')
        await vesting.release(token.address);
        Utils.balanceShouldEqualTo(token, accounts[5], 100)

    });

});