pragma solidity ^0.4.18;

import "../SupplyBloc.sol";

contract TestSupplyBloc is SupplyBloc {
    function TestSupplyBloc(
        address _rewardsAddress,
        bool _locked
    ) public SupplyBloc(_rewardsAddress, _locked)
    { }

    function testSetFreezing(bool _isFrozen) public {
        transferFrozen = _isFrozen;
    }

}
