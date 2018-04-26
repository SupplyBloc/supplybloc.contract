pragma solidity 0.4.19;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./SupplyBloc.sol";
import "./SellableToken.sol";


contract LockupContract is Ownable {

    using SafeMath for uint256;

    SupplyBloc public token;
    SellableToken public ico;
    SellableToken public privateSale;

    uint256 public lockPeriod = uint256(1 years).div(2);

    mapping (address => uint256[]) public lockedAmount;

    function LockupContract(
        address _token,
        address _ico,
        address _privateSale
    ) public {
        require(_token != address(0) && _ico != address(0) && _privateSale != address(0));
        token = SupplyBloc(_token);
        ico = SellableToken(_ico);
        privateSale = SellableToken(_privateSale);
    }

    function setTokenContract(address _token) public onlyOwner {
        require(_token != address(0));
        token = SupplyBloc(_token);
    }

    function setICO(address _ico) public onlyOwner {
        require(_ico != address(0));
        ico = SellableToken(_ico);
    }

    function setPrivateSale(address _privateSale) public onlyOwner {
        require(_privateSale != address(0));
        privateSale = SellableToken(_privateSale);
    }

    function log(address _address, uint256 _amount, uint256 _startingAt) public {
        if (msg.sender == address(token) || msg.sender == address(ico) || msg.sender == address(privateSale)) {
            lockedAmount[_address].push(_startingAt);
            lockedAmount[_address].push(_amount);
        }
    }

    function isTransferAllowed(address _address, uint256 _value) public view returns (bool) {
        return isTransferAllowedInternal(_address, _value, block.timestamp);
    }

    function isTransferAllowedInternal(address _address, uint256 _value, uint256 _time) internal view returns (bool) {
        if (lockedAmount[_address].length == 0) {
            return true;
        }

        uint256 length = lockedAmount[_address].length / 2;
        uint256 blockedAmount;

        for (uint256 i = 0; i < length; i++) {
            if (lockedAmount[_address][i.mul(2)].add(lockPeriod) > _time) {
                if (lockedAmount[_address][i.mul(2).add(1)] == 0) {
                    blockedAmount = token.balanceOf(_address);
                    break;
                } else {
                    blockedAmount = blockedAmount.add(lockedAmount[_address][i.mul(2).add(1)]);
                }
            }
        }

        if (token.balanceOf(_address).sub(blockedAmount) >= _value) {
            return true;
        }

        return false;
    }

}