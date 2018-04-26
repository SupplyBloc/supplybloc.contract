pragma solidity 0.4.19;

import "../LockupContract.sol";


contract TestLockupContract is LockupContract {

    function TestLockupContract(
        address _token,
        address _ico,
        address _privateSale
    ) public LockupContract(
        _token,
        _ico,
        _privateSale
    ) {}

    function TestIsTransferAllowed(address _address, uint256 _value, uint256 _time) public view returns (bool) {
        return isTransferAllowedInternal(_address, _value, _time);
    }
}