var
    PrivateSale = artifacts.require("./PrivateSale.sol"),
    ICO = artifacts.require("./test/TestICO.sol"),
    SupplyBloc = artifacts.require("./test/TestSupplyBloc.sol"),
    LockupContract = artifacts.require("./test/TestLockupContract.sol"),

    Utils = require("./utils"),
    BigNumber = require('bignumber.js'),

    precision = new BigNumber("1000000000000000000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 3600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600,
    signAddress = web3.eth.accounts[0],
    etherHolder = web3.eth.accounts[5],
    wrongSigAddress = web3.eth.accounts[7],
    rewardsAddress = web3.eth.accounts[8];

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
    const lockupContract = await LockupContract.new(token.address, ico.address, ico.address);

    await token.addMinter(ico.address);
    await token.setICO(ico.address);
    await token.setLockupContract(lockupContract.address);
    await ico.setAllowedMultivest(signAddress);

    return {token, ico, lockupContract};
}

contract('Lockup', function (accounts) {

    it("check", async function () {
        const {token, ico, lockupContract} = await deploy();

        await lockupContract.setICO(accounts[0]);
        await token.addMinter(accounts[3]);
        await token.mint(accounts[1], new BigNumber('100').mul(precision).valueOf(), {from: accounts[3]});

        assert.equal(
            await lockupContract.TestIsTransferAllowed.call(accounts[1], new BigNumber('100').mul(precision).valueOf(), parseInt(new Date().getTime() / 1000 - 3600)),
            true,
            "isTransferAllowed is not equal"
        );

        let startingAt = parseInt(new Date().getTime() / 1000 - 3600);
        let halfyear = 15778463;

        await lockupContract.log(accounts[1], new BigNumber('5').mul(precision).valueOf(), startingAt);
        await lockupContract.log(accounts[1], new BigNumber('5').mul(precision).valueOf(), startingAt);
        assert.equal(
            await lockupContract.TestIsTransferAllowed.call(accounts[1], new BigNumber('100').mul(precision).valueOf(),  parseInt(new Date().getTime() / 1000 )),
            false,
            "isTransferAllowed is not equal"
        );

        assert.equal(
            await lockupContract.TestIsTransferAllowed.call(accounts[1], new BigNumber('90').mul(precision).valueOf(), parseInt(new Date().getTime() / 1000 )),
            true,
            "isTransferAllowed is not equal"
        );

        assert.equal(
            await lockupContract.TestIsTransferAllowed.call(accounts[1], new BigNumber('100').mul(precision).valueOf(), new BigNumber(startingAt).add(halfyear).sub(3600 * 24).valueOf()),
            false,
            "isTransferAllowed is not equal"
        );

        assert.equal(
            await lockupContract.TestIsTransferAllowed.call(accounts[1], new BigNumber('100').mul(precision).valueOf(), new BigNumber(startingAt).add(halfyear).valueOf()),
            true,
            "isTransferAllowed is not equal"
        );


        await token.mint(accounts[2], new BigNumber('100').mul(precision).valueOf(), {from: accounts[3]});
        await lockupContract.log(accounts[2], 0, icoTill + 3600 * 2);

        assert.equal(
            await lockupContract.TestIsTransferAllowed.call(accounts[2], new BigNumber('100').mul(precision).valueOf(),  parseInt(new Date().getTime() / 1000 )),
            false,
            "isTransferAllowed is not equal"
        );

        assert.equal(
            await lockupContract.TestIsTransferAllowed.call(accounts[2], new BigNumber('90').mul(precision).valueOf(), parseInt(new Date().getTime() / 1000 )),
            false,
            "isTransferAllowed is not equal"
        );

    });

});