module.exports = {
    skipFiles: [
        'Migrations.sol',
        'OraclizeAPI.sol',
        'test/TestSupplyBlocVesting.sol',
        'test/TestSupplyBloc.sol',
        'test/TestICO.sol',
        'test/TestPrivateSale.sol',
        'test/TestLockupContract.sol',
        'test/TestMultivest.sol'
    ],
    // need for dependencies
    copyNodeModules: true,
    copyPackages: ['zeppelin-solidity'],
    dir: '.',
    norpc: false
};
