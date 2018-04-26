pragma solidity 0.4.19;

import "./PeriodicTokenVesting.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LockupContract.sol";
import "./MintingERC20.sol";

contract SupplyBlocAllocation is Ownable {

    using SafeERC20 for ERC20Basic;
    using SafeMath for uint256;

    LockupContract public lockupContract;

    uint256 public icoEndTime;

    address public vestingDavidMotta;
    address public vestingAlexHinojosa;
    address public vestingJessicaVelazquez;
    address public vestingSamOsborn;
    address public vestingBoWhite;
    address public vestingRobDixon;
    address public vestingSteveBenson;
    address public vestingDevanSharma;
    address public vestingRhettMcNulty;
    address public vestingBenjaminBunker;
    address public vestingAnthonyShipp;
    address public vestingRudyBrathwaite;
    address public vestingRobertMcNulty;
    address public vestingJeffreyAaronson;
    address public vestingMeridethMentzer;
    address public vestingEverettConrad;
    address public vestingGlennHawkins;

    uint256 public vestingsInited;
    mapping(address => bool) public tokenInited;
    address[] public vestings;

    event VestingCreated(
        address _vesting,
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        uint256 _periods,
        bool _revocable
    );

    event VestingRevoked(address _vesting);

    function setICOEndTime(uint256 _icoEndTime) public onlyOwner {
        icoEndTime = _icoEndTime;
    }

    function setLockupContract(address _lockupContract) public onlyOwner {
        require(_lockupContract != address(0));
        lockupContract = LockupContract(_lockupContract);
    }

    function initVesting() public onlyOwner {
        if (vestingsInited == 3) {
            return;
        }
        if (vestingsInited == 2) {
            vestingDavidMotta = createVesting(
            0x05144813c041e5B9258003eB5F96674881947ea6, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingAlexHinojosa = createVesting(
            0x6A4d7cD6E5D659799F1207f40385524b8f42BDAB, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingJessicaVelazquez = createVesting(
            0x7f38ABb61EeB051270dc211D817AE877fa3CF2f5, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingSamOsborn = createVesting(
            0x324b90B185739E0E1DB159F1FE743D0D21dE0e75, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingBoWhite = createVesting(
            0x2F867E790131c7d3793ee06dE7DaC24779E51E8e, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingRobDixon = createVesting(
            0xAF2463aEd0232B23376F7FE83A2cB8eae7AB7FF6, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingSteveBenson = createVesting(
            0xb457AeA8be0B2aFE85Ce444b301Bc3Be57EA0357, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingsInited = 3;
        } else if (vestingsInited == 1) {
            vestingDevanSharma = createVesting(
            0x6C82e19fA992bB26B08B946cf9646E481D39335E, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingRhettMcNulty = createVesting(
            0xaCfED1d1c2C806fF291397Af9D2B0b0a5eF146Db, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingBenjaminBunker = createVesting(
            0x2E3E8d44BdF44DD174Ae9f5D026D73F017Ad0961, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingAnthonyShipp = createVesting(
            0x1a663A4804D504BEEC76E20A7Fc74A263C2E43dD, icoEndTime, 1, uint256(1 years).mul(3).div(2), 18, true
            );
            vestingRudyBrathwaite = createVesting(
            0xBF975c15E1eDDB080c4fef8eE7AF924147AB0e8E, icoEndTime, 1, uint256(1 years), 12, true
            );
            vestingRobertMcNulty = createVesting(
            0xF273EE1002804215E371b68a6835A0B6A22E7435, icoEndTime, 1, uint256(1 years), 12, true
            );
            vestingJeffreyAaronson = createVesting(
            0x4CcC711af0aF63C6Fab00462bdA3034c8985C6C0, icoEndTime, 1, uint256(1 years), 12, true
            );
            vestingsInited = 2;
        } else if (vestingsInited == 0) {
            vestingMeridethMentzer = createVesting(
            0x30239017806F9b7E6b766Fc69fBdBBF7afCC2035, icoEndTime, 1, uint256(1 years), 12, true
            );
            vestingEverettConrad = createVesting(
            0x18E8914214D476eD067Fa7AE136050B971858c43, icoEndTime, 1, uint256(1 years), 12, true
            );
            vestingGlennHawkins = createVesting(
            0x112B85FcB30B03579D8cF325366BeF06d9e2eFC4, icoEndTime, 1, uint256(1 years), 12, true
            );
            vestingsInited = 1;
        }
    }

    function allocate(MintingERC20 token) public onlyOwner {
        require(tokenInited[token] == false);

        tokenInited[token] = true;

        if (vestingsInited != 3) {
            return;
        }

        uint256 tokenPrecision = token.decimals();

        // allocate funds to bounty
        token.mint(0x68Eb4779493F77551FB37Af20D780C5DE7e2518C, uint256(37500000).mul(10 ** tokenPrecision));

        // allocate funds to advisors
        token.mint(vestingDavidMotta, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingAlexHinojosa, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingJessicaVelazquez, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingSamOsborn, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingBoWhite, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingRobDixon, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingSteveBenson, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingDevanSharma, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingRhettMcNulty, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingBenjaminBunker, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingAnthonyShipp, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));

        // allocate funds to team
        token.mint(vestingRudyBrathwaite, uint256(38000000).mul(10 ** tokenPrecision));
        token.mint(vestingRobertMcNulty, uint256(12327272727273).mul(10 ** tokenPrecision.sub(5)));
        token.mint(vestingJeffreyAaronson, uint256(16000000).mul(10 ** tokenPrecision));
        token.mint(vestingMeridethMentzer, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingEverettConrad, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));
        token.mint(vestingGlennHawkins, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)));

        lockupContract.log(0xBF975c15E1eDDB080c4fef8eE7AF924147AB0e8E, uint256(38000000).mul(10 ** tokenPrecision), icoEndTime);
        lockupContract.log(0xF273EE1002804215E371b68a6835A0B6A22E7435, uint256(12327272727273).mul(10 ** tokenPrecision.sub(5)), icoEndTime);
        lockupContract.log(0x4CcC711af0aF63C6Fab00462bdA3034c8985C6C0, uint256(16000000).mul(10 ** tokenPrecision), icoEndTime);
        lockupContract.log(0x30239017806F9b7E6b766Fc69fBdBBF7afCC2035, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x18E8914214D476eD067Fa7AE136050B971858c43, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x112B85FcB30B03579D8cF325366BeF06d9e2eFC4, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x05144813c041e5B9258003eB5F96674881947ea6, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x6A4d7cD6E5D659799F1207f40385524b8f42BDAB, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x7f38ABb61EeB051270dc211D817AE877fa3CF2f5, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x324b90B185739E0E1DB159F1FE743D0D21dE0e75, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x2F867E790131c7d3793ee06dE7DaC24779E51E8e, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0xAF2463aEd0232B23376F7FE83A2cB8eae7AB7FF6, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0xb457AeA8be0B2aFE85Ce444b301Bc3Be57EA0357, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x6C82e19fA992bB26B08B946cf9646E481D39335E, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0xaCfED1d1c2C806fF291397Af9D2B0b0a5eF146Db, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x2E3E8d44BdF44DD174Ae9f5D026D73F017Ad0961, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
        lockupContract.log(0x1a663A4804D504BEEC76E20A7Fc74A263C2E43dD, uint256(3409090909090).mul(10 ** tokenPrecision.sub(6)), icoEndTime);
    }

    function createVesting(
        address _beneficiary, uint256 _start, uint256 _cliff, uint256 _duration, uint256 _periods, bool _revocable
    ) public onlyOwner returns (PeriodicTokenVesting) {
        PeriodicTokenVesting vesting = new PeriodicTokenVesting(
            _beneficiary, _start, _cliff, _duration, _periods, _revocable
        );

        vestings.push(vesting);

        VestingCreated(vesting, _beneficiary, _start, _cliff, _duration, _periods, _revocable);

        return vesting;
    }

    function revokeVesting(PeriodicTokenVesting _vesting, MintingERC20 token) public onlyOwner() {
        _vesting.revoke(token);

        VestingRevoked(_vesting);
    }
}
