pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Domains.sol";


contract CapabilityTokens is Domains {

    uint constant private CAPABILITY_TOKEN_EXPIRATION_TIME = 1 days;
    uint private _capabilityTokensNonce = 0;

    mapping (bytes32 => CapabilityToken) private _capabilityTokens;

    event CapabilityTokenCreated(bytes32 capabilityTokenAddress);
    event CapabilityTokenIssued(bytes32 capabilityTokenAddress);
    event PrivilegeAddedToCapabilityToken(bytes32 capabilityTokenAddress, uint privilegeIndex);

    modifier isCapabilityTokenExistent(bytes32 capabilityTokenAddress, bool exists) {
        require(_capabilityTokens[capabilityTokenAddress].isExistent == exists, 'yo');
        _;
    }

    modifier isCapabilityTokenIssued(bytes32 capabilityTokenAddress, bool issued) {
        require(_capabilityTokens[capabilityTokenAddress].isIssued == issued, 'bo');
        _;
    }

    struct CapabilityToken {
        bytes32 tokenAddress;
        address issuerAddress;
        address subjectAddress;
        bytes32 objectAddress;
        bytes32 domainAddress;
        uint issuedTime;
        uint expiredTime;
        bool isExistent;
        bool isIssued;
        Privilege[] privileges;
    }

    struct Privilege {
        string httpAction;
        string resourceUrlRegex;
    }

    function addPrivilegeToCapabilityToken(
        bytes32 capabilityTokenAddress,
        string memory httpAction,
        string memory resourceUrlRegex
        )
        public
        isCapabilityTokenExistent(capabilityTokenAddress, true)
        isCapabilityTokenIssued(capabilityTokenAddress, false) {
        CapabilityToken storage capabilityToken = _capabilityTokens[capabilityTokenAddress];
        uint privilegeIndex = capabilityToken.privileges.push(Privilege(httpAction, resourceUrlRegex)) - 1;
        emit PrivilegeAddedToCapabilityToken(capabilityTokenAddress, privilegeIndex);
    }

    function createCapabilityToken(
        address subjectAddress,
        bytes32 objectAddress
        )
        public
        onlyCoordinator(msg.sender) {
            bytes32 capabilityTokenAddress = keccak256(abi.encodePacked(_capabilityTokensNonce, now, subjectAddress, msg.sender, objectAddress));
            _capabilityTokens[capabilityTokenAddress].tokenAddress = capabilityTokenAddress;
            _capabilityTokens[capabilityTokenAddress].issuerAddress = msg.sender;
            _capabilityTokens[capabilityTokenAddress].subjectAddress = subjectAddress;
            _capabilityTokens[capabilityTokenAddress].objectAddress = objectAddress;
            _capabilityTokens[capabilityTokenAddress].domainAddress = _devices[objectAddress].domainAddress;
            _capabilityTokens[capabilityTokenAddress].issuedTime = now;
            _capabilityTokens[capabilityTokenAddress].expiredTime = now + CAPABILITY_TOKEN_EXPIRATION_TIME;
            _capabilityTokens[capabilityTokenAddress].isExistent = true;
            emit CapabilityTokenCreated(capabilityTokenAddress);
        }

    function issueCapabilityToken(bytes32 capabilityTokenAddress) public onlyCoordinator(msg.sender) {
        CapabilityToken storage capabilityToken = _capabilityTokens[capabilityTokenAddress];
        require(capabilityToken.isExistent == true);
        require(capabilityToken.isIssued == false);
        capabilityToken.isIssued = true;
        emit CapabilityTokenIssued(capabilityTokenAddress);
    }

    function getCapabilityToken(bytes32 capabilityTokenAddress) public view returns (CapabilityToken memory) {
        return _capabilityTokens[capabilityTokenAddress];
    }

}
