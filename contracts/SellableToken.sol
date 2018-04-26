pragma solidity 0.4.19;


import "./SupplyBloc.sol";
import "./Multivest.sol";
import "./OraclizeAPI.sol";
import "./LockupContract.sol";


contract SellableToken is Multivest, usingOraclize {

    SupplyBloc public token;
    LockupContract public lockupContract;

    uint256 public constant DECIMALS = 18;

    uint256 public minPurchase = 1000 * 10 ** DECIMALS;
    uint256 public maxPurchase;

    uint256 public softCap;
    uint256 public hardCap;

    uint256 public startTime;
    uint256 public endTime;

    uint256 public maxTokenSupply;

    uint256 public soldTokens;

    uint256 public collectedEthers;

    uint256 public priceUpdateAt;

    address public etherHolder;

    uint256 public collectedUSD;

    uint256 public price;

    uint256 public etherPriceInUSD;

    mapping (address => uint256) public etherBalances;

    mapping (address => bool) public whitelist;

    Tier[] public tiers;

    struct Tier {
        uint256 maxAmount;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
        uint256 bonus;
    }

    event WhitelistSet(address indexed contributorAddress, bool isWhitelisted);

    event Refund(address _holder, uint256 _ethers, uint256 _tokens);

    event NewOraclizeQuery(string _description);

    event NewPriceTicker(string _price);

    function SellableToken(
        address _token,
        address _etherHolder,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _etherPriceInUSD,
        uint256 _maxTokenSupply
    )
        public Multivest()
    {
        require(_token != address(0));
        token = SupplyBloc(_token);

        require(_startTime < _endTime && _etherHolder != address(0));
        etherHolder = _etherHolder;
        require(_maxTokenSupply <= token.maxSupply());

        startTime = _startTime;
        endTime = _endTime;
        etherPriceInUSD = _etherPriceInUSD;
        maxTokenSupply = _maxTokenSupply;

        priceUpdateAt = block.timestamp;
//        oraclize_setNetwork(networkID_auto);
//        oraclize = OraclizeI(OAR.getAddress());
    }

    function() public payable {
        require(true == whitelist[msg.sender] && buy(msg.sender, msg.value) == true);
    }

    function isTransferAllowed(address _from, uint256 _value) public view returns (bool) {
        _from = _from;
        _value = _value;

        return true;
    }

    function setSupplyBloc(address _token) public onlyOwner {
        require(_token != address(0));
        token = SupplyBloc(_token);
    }

    function setLockupContract(address _lockupContract) public onlyOwner {
        require(_lockupContract != address(0));
        lockupContract = LockupContract(_lockupContract);
    }

    function setEtherHolder(address _etherHolder) public onlyOwner {
        if (_etherHolder != address(0)) {
            etherHolder = _etherHolder;
        }
    }

    function updateWhitelist(address _address, bool isWhitelisted) public onlyOwner {
        whitelist[_address] = isWhitelisted;
        WhitelistSet(_address, isWhitelisted);
    }

    function mint(address _address, uint256 _tokenAmount) public onlyOwner returns (uint256) {
        require(
            _address != address(0) &&
            _tokenAmount > 0 &&
            mintInternal(_address, _tokenAmount) == _tokenAmount
        );
        lockupContract.log(_address, _tokenAmount, block.timestamp);

        return _tokenAmount;
    }

    // set ether price in USD with 5 digits after the decimal point
    //ex. 308.75000
    //for updating the price through  multivest
    function setEtherInUSD(string _price) public onlyAllowedMultivests(msg.sender) {
        bytes memory bytePrice = bytes(_price);
        uint256 dot = bytePrice.length.sub(uint256(6));

        // check if dot is in 6 position  from  the last
        require(0x2e == uint(bytePrice[dot]));

        uint256 newPrice = uint256(10 ** 23).div(parseInt(_price, 5));

        require(newPrice > 0);

        etherPriceInUSD = parseInt(_price, 5);

        priceUpdateAt = block.timestamp;

        NewPriceTicker(_price);
    }

    function __callback(bytes32, string _result, bytes) public {
        require(msg.sender == oraclize_cbAddress());
        uint256 result = parseInt(_result, 5);
        uint256 newPrice = uint256(10 ** 23).div(result);
        require(newPrice > 0);
        //not update when increasing/decreasing in 3 times
        if (result.div(3) < etherPriceInUSD || result.mul(3) > etherPriceInUSD) {
            etherPriceInUSD = result;

            NewPriceTicker(_result);
        }

    }

    function isActive() public view returns (bool);

    function withinPeriod() public view returns (bool);

    function getMinEthersInvestment() public view returns (uint256) {
        uint256 ethers;
        uint256 bonus;
        (ethers, bonus) = calculateEthersAmount(minPurchase);

        return ethers;
    }

    function calculateTokensAmount(uint256 _value) public view returns (uint256 tokenAmount, uint256 usdAmount);

    function calculateEthersAmount(uint256 _tokens) public view returns (uint256 ethers, uint256 bonus);

    function mintInternal(address _address, uint256 _tokenAmount) internal returns (uint256) {
        uint256 mintedAmount = token.mint(_address, _tokenAmount);
        require(mintedAmount == _tokenAmount);

        soldTokens = soldTokens.add(_tokenAmount);
        require(maxTokenSupply >= soldTokens);

        return _tokenAmount;
    }

    function update() internal {
        if (oraclize_getPrice("URL") > this.balance) {
            NewOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
        } else {
            NewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
            oraclize_query("URL", "json(https://api.kraken.com/0/public/Ticker?pair=ETHUSD).result.XETHZUSD.c.0");
        }
    }

}