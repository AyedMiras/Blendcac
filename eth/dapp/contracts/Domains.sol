pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Users.sol";


contract Domains is Users {

    mapping (bytes32 => Device) public _devices;
    mapping (bytes32 => Domain) public _domains;

    uint private _domainsNonce = 0;
    uint private _deviceNonce = 0;

    event DeviceAddedToDomain(bytes32 deviceAddress, bytes32 domainAddress);
    event UserAddedToDomain(address userAddress, bytes32 domainAddress);
    event DomainCreated(address coordinatorAddress, bytes32 domainAddress);

    modifier onlyDomainCoordinator(bytes32 domainAddress, address domainCoordinatorAddress) {
        require(_domains[domainAddress].coordinatorAddress == domainCoordinatorAddress, 'Address does not correspond to the Domain Coordinator Address.');
        _;
    }

    modifier isDomainExistent(bytes32 domainAddress, bool exists) {
        string memory not = ' ';
        if (exists == true) {
          not = ' not ';
        }
        string memory errorMessage = string(abi.encodePacked('Domain does', not, 'exist.'));
        require(_domains[domainAddress].isExistent == exists, errorMessage);
        _;
    }

    struct Domain {
        bytes32 domainAddress;
        address coordinatorAddress;
        bytes32[] devicesAddresses;
        address[] userAddresses;
        bool isExistent;
    }

    struct Device {
        bytes32 deviceAddress;
        string ipAddress;
        uint16 portNumber;
        bytes32 domainAddress;
        bool isExistent;
    }

    function getDomain(bytes32 domainAddress) public view returns (Domain memory) {
        return _domains[domainAddress];
    }

    function getDomainDevicesAddresses(bytes32 domainAddress) public view returns (bytes32[] memory) {
        return _domains[domainAddress].devicesAddresses;
    }

    function getDomainUsersAddresses(bytes32 domainAddress) public view returns (address[] memory) {
        return _domains[domainAddress].userAddresses;
    }

    function createDomain(address coordinatorAddress) internal onlyAdmin(msg.sender) returns (bytes32) {
        bytes32 domainAddress = keccak256(abi.encodePacked(_domainsNonce, now, coordinatorAddress));
        _domains[domainAddress].domainAddress = domainAddress;
        _domains[domainAddress].coordinatorAddress = coordinatorAddress;
        _domains[domainAddress].isExistent = true;
        _domainsNonce++;
        return domainAddress;
    }

    function createDomainWithCoordinator(address coordinatorAddress) external onlyAdmin(msg.sender) isCoordinatorExistent(coordinatorAddress, false) {
        bytes32 domainAddress = createDomain(coordinatorAddress);
        _coordinators[coordinatorAddress].coordinatorAddress = coordinatorAddress;
        _coordinators[coordinatorAddress].domainAddress = domainAddress;
        _coordinators[coordinatorAddress].isExistent = true;
        emit DomainCreated(coordinatorAddress, domainAddress);
    }

    function addUserToDomain(
        address userAddress,
        bytes32 domainAddress
        )
        public
        onlyAdmin(msg.sender)
        isUserExistent(userAddress, false)
        isDomainExistent(domainAddress, true) {
        _users[userAddress].userAddress = userAddress;
        _users[userAddress].domainAddress = domainAddress;
        _users[userAddress].isExistent = true;
        _domains[domainAddress].userAddresses.push(userAddress);
        emit UserAddedToDomain(userAddress, domainAddress);
    }

    function addDeviceToDomain(string memory ipAddress, uint16 portNumber, bytes32 domainAddress)
        public onlyAdmin(msg.sender) {
            bytes32 deviceAddress = keccak256(abi.encodePacked(_deviceNonce, now, domainAddress));
            _devices[deviceAddress].deviceAddress = deviceAddress;
            _devices[deviceAddress].domainAddress = domainAddress;
            _devices[deviceAddress].ipAddress = ipAddress;
            _devices[deviceAddress].portNumber = portNumber;
            _domains[domainAddress].devicesAddresses.push(deviceAddress);
            _deviceNonce++;
            emit DeviceAddedToDomain(deviceAddress, domainAddress);
        }

}
