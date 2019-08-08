pragma solidity 0.5.8;


contract Users {

    address private owner;

    mapping (address => Admin) internal _admins;
    mapping (address => Coordinator) internal _coordinators;
    mapping (address => User) internal _users;

    constructor() public {
        owner = msg.sender;
        _admins[msg.sender].adminAddress = msg.sender;
        _admins[msg.sender].isExistent = true;
    }

    modifier isAdminExistent(address adminAddress, bool exists) {
        require(_admins[adminAddress].isExistent == exists, 'waa');
        _;
    }

    modifier isCoordinatorExistent(address coordinatorAddress, bool exists) {
        require(_coordinators[coordinatorAddress].isExistent == exists);
        _;
    }

    modifier isUserExistent(address userAddress, bool exists) {
        require(_users[userAddress].isExistent == exists, 'waaaaa');
        _;
    }

    modifier onlyAdmin(address adminAddress) {
        require(_admins[adminAddress].isExistent == true);
        _;
    }

    modifier onlyCoordinator(address coordinatorAddress) {
        require(_coordinators[coordinatorAddress].isExistent == true, 'The provided address is not a coordinator address.');
        _;
    }

    function addAdmin(address adminAddress) external onlyAdmin(msg.sender) isAdminExistent(adminAddress, false) {
        _admins[adminAddress].adminAddress = adminAddress;
        _admins[adminAddress].isExistent = true;

    }

    struct Admin {
        address adminAddress;
        bool isExistent;
    }

    struct User {
        address userAddress;
        bytes32 domainAddress;
        bool isExistent;
    }

    struct Coordinator {
        address coordinatorAddress;
        bytes32 domainAddress;
        bool isExistent;
    }


}
