pragma solidity 0.4.19;

import "../MintingERC20.sol";
import "../SellableToken.sol";
import "../LockupContract.sol";


contract TestSupplyBlocVesting is MintingERC20 {

    SellableToken public ico;
    SellableToken public privateSale;
    LockupContract public lockupContract;

    bool public transferFrozen = true;

    modifier onlyICO() {
        require(address(ico) != address(0) && msg.sender == address(ico));
        _;
    }

    function TestSupplyBlocVesting(
        address _rewardsAddress,
        bool _locked
    ) public MintingERC20(0, maxSupply, "SypplyBloc", 18, "SUPX", _rewardsAddress, false, _locked)
    {
        standard = "SUPX 0.1";
        maxSupply = uint(750000000).mul(uint(10) ** decimals);
    }

    function setICO(address _ico) public onlyOwner {
        require(_ico != address(0));
        ico = SellableToken(_ico);
    }

    function setPrivateSale(address _privateSale) public onlyOwner {
        require(_privateSale != address(0));
        privateSale = SellableToken(_privateSale);
    }

    function setLockupContract(address _lockupContract) public onlyOwner {
        require(_lockupContract != address(0));
        lockupContract = LockupContract(_lockupContract);
    }

    function mint(address _addr, uint256 _amount) public onlyMinters returns (uint256) {
        if (msg.sender == owner) {
            require(address(ico) != address(0));
            if (!ico.isActive()) {
                return super.mint(_addr, _amount);
            }
            return uint256(0);
        }
        return super.mint(_addr, _amount);
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        return super.transferFrom(_from, _to, _value);
    }

}
