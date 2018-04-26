pragma solidity 0.4.19;


import "./SupplyBlocERC20.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";


/*
This contract manages the minters and the modifier to allow mint to happen only if called by minters
This contract contains basic minting functionality though
*/
contract MintingERC20 is SupplyBlocERC20 {

    using SafeMath for uint256;

    //Variables
    mapping (address => bool) public minters;

    uint256 public maxSupply;

    address public rewardsAddress;

    //Modifiers
    modifier onlyMinters () {
        require(true == minters[msg.sender]);
        _;
    }

    function MintingERC20(
        uint256 _initialSupply,
        uint256 _maxSupply,
        string _tokenName,
        uint8 _decimals,
        string _symbol,
        address _rewardsAddress,
        bool _transferAllSupplyToOwner,
        bool _locked
    )
        public SupplyBlocERC20(_initialSupply, _tokenName, _decimals, _symbol, _transferAllSupplyToOwner, _locked)
    {
        require(_rewardsAddress != address(0));
        rewardsAddress = _rewardsAddress;
        standard = "MintingERC20 0.1";
        minters[msg.sender] = true;
        maxSupply = _maxSupply;
    }

    function addMinter(address _newMinter) public onlyOwner {
        minters[_newMinter] = true;
    }

    function removeMinter(address _minter) public onlyOwner {
        minters[_minter] = false;
    }

    function mint(address _addr, uint256 _amount) public onlyMinters returns (uint256) {
        if (_amount == uint256(0)) {
            return uint256(0);
        }

        if (totalSupply_.add(_amount) > maxSupply) {
            return uint256(0);
        }

        totalSupply_ = totalSupply_.add(_amount);
        balances[_addr] = balances[_addr].add(_amount);
        Transfer(address(0), _addr, _amount);

        return _amount;
    }

    function burnInternal(address _address) internal returns (uint256 amount) {
        amount = balances[_address];
        balances[rewardsAddress] = balances[rewardsAddress].add(amount);
        balances[_address] = 0;
        Transfer(_address, rewardsAddress, amount);
    }

}