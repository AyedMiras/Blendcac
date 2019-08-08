pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./CapabilityTokens.sol";

contract DelegationCertificates is CapabilityTokens {

    uint8 constant private DELEGATION_TREE_MAX_DEPTH = 16;
    uint8 constant private DELEGATION_TREE_MAX_WIDTH = 16;
    uint constant private DELEGATION_CERTIFICATE_EXPIRATION_TIME = 1 days;

    mapping (bytes32 => DelegationTree) private _delegationTrees;
    mapping (bytes32 => DelegateNode) private _delegateNodes;
    mapping (address => bytes32) private _delegateAddressToDelegateNodeAddress;

    uint private _delegationTreeNonce = 0;
    uint private _delegateNodeNonce = 0;

    event DelegationTreeCreated(bytes32 delegationTreeAddress);
    event DelegationTreeInitialized(bytes32 delegationTreeAddress);
    event PrivilegeAddedToDelegateNode(bytes32 delegateNodeAddress, uint privilegeIndex);
    event DelegateNodeCreated(bytes32 delegateNodeAddress);
    event DelegationCertificateIssued(bytes32 delegateNodeAddress);
    event DelegationCertificateRevoked(bytes32 delegateNodeAddress);
    event DelegationCertificatePrivilegeRevoked(bytes32 delegateNodeAddress, string httpAction, string resourceUrlRegex);

    modifier onlyDelegationTreeSupervisor(bytes32 delegationTreeAddress, address supervisorAddress) {
        require(_delegationTrees[delegationTreeAddress].supervisorAddress == supervisorAddress, 'Only delegation tree supervisor can call function.');
        _;
    }

    modifier onlyDelegationCertificateSubject(bytes32 delegateNodeAddress, address delegateAddress) {
        require(delegateAddress == _delegateNodes[delegateNodeAddress].subjectAddress, 'Only delegation certificate subject can call functon.');
        _;
    }

    modifier onlyDelegateHierarchicalSupervisor(bytes32 delegateNodeAddress, address hierarchicalSupervisorAddress) {
        require(
            isAncestor(_delegateAddressToDelegateNodeAddress[hierarchicalSupervisorAddress], delegateNodeAddress),
            'only delegate hierarchical supervisor can call function.'
        );
        _;
    }

    modifier onlyDelegate(address delegateAddress) {
        require(_delegateNodes[_delegateAddressToDelegateNodeAddress[delegateAddress]].isExistent == true, 'Only delegate can call function.');
        _;
    }

    modifier onlyDelegator(bytes32 delegateNodeAddress, address delegatorAddress) {
        require(
            _delegateNodes[_delegateAddressToDelegateNodeAddress[delegatorAddress]].subjectAddress == delegatorAddress,
            'Only delegator can call function.'
        );
        _;
    }

    modifier isDelegationTreeExistent(bytes32 delegationTreeAddress) {
        require(_delegationTrees[delegationTreeAddress].isExistent == true, 'Delegation tree does not exist.');
        _;
    }

    modifier isDelegationTreeNonExistent(bytes32 delegationTreeAddress) {
        require(_delegationTrees[delegationTreeAddress].isExistent == false, 'Delegation tree does exist.');
        _;
    }

    modifier isDelegationTreeInitialized(bytes32 delegationTreeAddress) {
        require(_delegationTrees[delegationTreeAddress].isInitialized == true, 'Delegation tree is not initialized.');
        _;
    }

    modifier isDelegationTreeNonInitialized(bytes32 delegationTreeAddress) {
        require(_delegationTrees[delegationTreeAddress].isInitialized == false, 'Delegation tree is initialized.');
        _;
    }

    modifier isDelegateNodeExistent(bytes32 delegateNodeAddress) {
        require(_delegateNodes[delegateNodeAddress].isExistent == true, 'Delegate Node is not existent.');
        _;
    }

    modifier isDelegateNodeNonExistent(bytes32 delegateNodeAddress) {
        require(_delegateNodes[delegateNodeAddress].isExistent == false, 'Delegate Node is existent.');
        _;
    }

    modifier isDelegateNodeInitialized(bytes32 delegateNodeAddress) {
        require(_delegateNodes[delegateNodeAddress].isInitialized == true, 'Delegation Tree is non initialized.');
        _;
    }

    modifier isDelegateNodeNonInitialized(bytes32 delegateNodeAddress) {
        require(_delegateNodes[delegateNodeAddress].isInitialized == false, 'Delegation Tree is initialized.');
        _;
    }

    struct DelegateNode {
        bytes32 nodeAddress;
        address subjectAddress;
        bytes32 parentNodeAddress;
        bytes32 treeAddress;
        uint currentDepth;
        bytes32[] childrenNodesAddresses;
        uint issuingTimestamp;
        uint expirationTimestamp;
        Privilege[] privileges;
        bool isExistent;
        bool isInitialized;
    }

    struct DelegationTree {
        bytes32 treeAddress;
        address supervisorAddress;
        uint maximumDepth;
        uint maximumWidth;
        bytes32 rootNodeAddress;
        uint issuingTimestamp;
        uint expirationTimestamp;
        bool isExistent;
        bool isInitialized;
    }

    function getDelegationTree(bytes32 delegationTreeAddress) public view returns (DelegationTree memory) {
        return _delegationTrees[delegationTreeAddress];
    }

    function getDelegateNodeAddress(address delegateAddress) public view returns (bytes32) {
        return _delegateAddressToDelegateNodeAddress[delegateAddress];
    }

    function getDelegateNode(bytes32 delegateNodeAddress) public view returns (DelegateNode memory) {
        return _delegateNodes[delegateNodeAddress];
    }

    function createDelegationTree() public onlyCoordinator(msg.sender) {
        bytes32 delegationTreeAddress = keccak256(abi.encodePacked(_delegationTreeNonce, now, msg.sender));
        _delegationTrees[delegationTreeAddress].treeAddress = delegationTreeAddress;
        _delegationTrees[delegationTreeAddress].supervisorAddress = msg.sender;
        _delegationTrees[delegationTreeAddress].maximumDepth = DELEGATION_TREE_MAX_DEPTH;
        _delegationTrees[delegationTreeAddress].maximumWidth = DELEGATION_TREE_MAX_WIDTH;
        _delegationTrees[delegationTreeAddress].isExistent = true;
        _delegationTrees[delegationTreeAddress].isInitialized = false;
        _delegationTreeNonce++;
        bytes32 rootNodeAddress = createLeafDelegateNode(msg.sender, bytes32(0), delegationTreeAddress, 0);
        _delegationTrees[delegationTreeAddress].rootNodeAddress = rootNodeAddress;
        emit DelegationTreeCreated(delegationTreeAddress);
    }

    function addPrivilegeToRootNode(
        bytes32 delegationTreeAddress,
        string memory httpAction,
        string memory resourceUrlRegex
        )
        public
        isDelegationTreeExistent(delegationTreeAddress)
        isDelegationTreeNonInitialized(delegationTreeAddress)
        onlyDelegationTreeSupervisor(delegationTreeAddress, msg.sender) {
        DelegateNode storage rootNode = _delegateNodes[_delegationTrees[delegationTreeAddress].rootNodeAddress];
        uint privilegeIndex = rootNode.privileges.push(Privilege(httpAction, resourceUrlRegex)) - 1;
        emit PrivilegeAddedToDelegateNode(rootNode.nodeAddress, privilegeIndex);
    }

    function initDelegationTree(
        bytes32 delegationTreeAddress
        )
        public
        isDelegationTreeExistent(delegationTreeAddress)
        isDelegationTreeNonInitialized(delegationTreeAddress)
        onlyDelegationTreeSupervisor(delegationTreeAddress, msg.sender) {
        DelegateNode storage rootNode = _delegateNodes[_delegationTrees[delegationTreeAddress].rootNodeAddress];
        require(rootNode.privileges.length > 0);
        rootNode.isInitialized = true;
        _delegationTrees[delegationTreeAddress].isInitialized = true;
        _delegateAddressToDelegateNodeAddress[msg.sender] = _delegationTrees[delegationTreeAddress].rootNodeAddress;
        emit DelegationTreeInitialized(delegationTreeAddress);
    }

    function createDelegateNode(
        bytes32 delegatorNodeAddress,
        address subjectAddress
        )
        public
        isDelegateNodeExistent(delegatorNodeAddress)
        onlyDelegate(msg.sender) {
        DelegateNode storage delegatorNode = _delegateNodes[delegatorNodeAddress];
        require(delegatorNode.currentDepth < _delegationTrees[delegatorNode.treeAddress].maximumDepth);
        require(delegatorNode.childrenNodesAddresses.length < _delegationTrees[delegatorNode.treeAddress].maximumWidth);
        createLeafDelegateNode(subjectAddress, delegatorNodeAddress, delegatorNode.treeAddress, delegatorNode.currentDepth);
    }

    function createLeafDelegateNode(
        address subjectAddress,
        bytes32 parentNodeAddress,
        bytes32 treeAddress,
        uint parentNodeDepth
        )
        internal
        returns (bytes32) {
        bytes32 subjectNodeAddress = keccak256(abi.encodePacked(_delegateNodeNonce, now, parentNodeAddress));
        _delegateNodeNonce++;
        _delegateNodes[subjectNodeAddress].nodeAddress = subjectNodeAddress;
        _delegateNodes[subjectNodeAddress].treeAddress = treeAddress;
        _delegateNodes[subjectNodeAddress].subjectAddress = subjectAddress;
        _delegateNodes[subjectNodeAddress].parentNodeAddress = parentNodeAddress;
        _delegateNodes[subjectNodeAddress].currentDepth = parentNodeDepth + 1;
        _delegateNodes[subjectNodeAddress].isExistent = true;
        _delegateNodes[subjectNodeAddress].isInitialized = false;
        _delegateNodes[subjectNodeAddress].issuingTimestamp = now;
        _delegateNodes[subjectNodeAddress].expirationTimestamp = now + DELEGATION_CERTIFICATE_EXPIRATION_TIME;
        emit DelegateNodeCreated(subjectNodeAddress);
        return subjectNodeAddress;
    }

    function addPrivilegeToDelegateNode(
        bytes32 delegateNodeAddress,
        string memory httpAction,
        string memory resourceUrlRegex
        ) public
        isDelegateNodeExistent(delegateNodeAddress)
        isDelegateNodeNonInitialized(delegateNodeAddress)
        onlyDelegator(delegateNodeAddress, msg.sender) {
        require(_delegateNodes[delegateNodeAddress].isExistent == true);
        require(_delegateNodes[delegateNodeAddress].isInitialized == false);
        uint privilegeIndex = _delegateNodes[delegateNodeAddress].privileges.push(Privilege(httpAction, resourceUrlRegex)) - 1;
        emit PrivilegeAddedToDelegateNode(delegateNodeAddress, privilegeIndex);
    }

    function issueDelegationCertificate(
        bytes32 delegateNodeAddress
        )
        public
        isDelegateNodeExistent(delegateNodeAddress)
        isDelegateNodeNonInitialized(delegateNodeAddress)
        onlyDelegator(delegateNodeAddress, msg.sender) {
        DelegateNode storage subjectNode = _delegateNodes[delegateNodeAddress];
        DelegateNode storage delegatorNode = _delegateNodes[subjectNode.parentNodeAddress];
        require(delegatorNode.childrenNodesAddresses.length < _delegationTrees[delegatorNode.treeAddress].maximumWidth);
        delegatorNode.childrenNodesAddresses.push(delegateNodeAddress);
        subjectNode.isInitialized = true;
        subjectNode.issuingTimestamp = now;
        subjectNode.expirationTimestamp = now + DELEGATION_CERTIFICATE_EXPIRATION_TIME;
        _delegateAddressToDelegateNodeAddress[subjectNode.subjectAddress] = subjectNode.nodeAddress;
        emit DelegationCertificateIssued(delegateNodeAddress);
    }

    function areEqualStrings(string memory s1, string memory s2) private pure returns (bool) {
      return keccak256(abi.encodePacked(s1)) == keccak256(abi.encodePacked(s2));
    }

    function areSamePrivileges(Privilege memory p1, Privilege memory p2) internal pure returns (bool) {
      return areEqualStrings(p1.httpAction, p2.httpAction) && areEqualStrings(p1.resourceUrlRegex, p2.resourceUrlRegex);
    }

    function arePrivilegesSubsetOf(Privilege[] memory _privileges1, Privilege[] memory _privileges2) private pure returns (bool) {
        for (uint8 i = 0; i < _privileges1.length; i++) {
          bool exist = false;
          for (uint8 j = 0; j < _privileges2.length; j++) {
              if (areSamePrivileges(_privileges1[i], _privileges2[j])) {
                exist = true;
              }
          }
          if (exist == false) {
            return false;
          }
        }
        return true;
    }


    function isAncestor(bytes32 hierarchicalSupervisorNodeAddress, bytes32 delegateNodeAddress) internal view returns (bool) {
        bytes32 currentDelegatorNodeAddress = _delegateNodes[delegateNodeAddress].parentNodeAddress;
        while(currentDelegatorNodeAddress != bytes32(0) && currentDelegatorNodeAddress != hierarchicalSupervisorNodeAddress) {
            currentDelegatorNodeAddress = _delegateNodes[currentDelegatorNodeAddress].parentNodeAddress;
        }
        return currentDelegatorNodeAddress == hierarchicalSupervisorNodeAddress;
    }

    function revokeDelegationCertificate(
        bytes32 delegateNodeAddress
        )
        public
        isDelegateNodeExistent(delegateNodeAddress)
        isDelegateNodeInitialized(delegateNodeAddress)
        onlyDelegateHierarchicalSupervisor(delegateNodeAddress, msg.sender) {
        revokeDelegationCertificateHelper(delegateNodeAddress);
    }

    function revokeDelegationCertificateHelper(
        bytes32 delegateNodeAddress
        ) internal {
        DelegateNode storage delegateNode = _delegateNodes[delegateNodeAddress];
        for (uint i = 0; i < delegateNode.childrenNodesAddresses.length; i++) {
            revokeDelegationCertificateHelper(delegateNode.childrenNodesAddresses[i]);
        }
        DelegateNode storage parentDelegateNode = _delegateNodes[delegateNode.parentNodeAddress];
        uint childIndex = 0;
        for (uint i = 0; i < parentDelegateNode.childrenNodesAddresses.length; i++) {
            if (parentDelegateNode.childrenNodesAddresses[i] == delegateNodeAddress) {
                childIndex = i;
                break;
            }
        }
        bytes32 tempAddress = parentDelegateNode.childrenNodesAddresses[childIndex];
        uint lastIndex = parentDelegateNode.childrenNodesAddresses.length - 1;
        parentDelegateNode.childrenNodesAddresses[childIndex] = parentDelegateNode.childrenNodesAddresses[lastIndex];
        parentDelegateNode.childrenNodesAddresses[lastIndex] = tempAddress;
        parentDelegateNode.childrenNodesAddresses.length--;
        emit DelegationCertificateRevoked(delegateNodeAddress);
        delete(_delegateNodes[delegateNode.nodeAddress]);
        delete(_delegateAddressToDelegateNodeAddress[delegateNode.subjectAddress]);
    }

    function swapPrivileges(Privilege storage p1, Privilege storage p2) pure private {
        Privilege storage p = p1;
        p1 = p2;
        p2 = p;
    }

    function revokeDelegateNodePrivileges(bytes32 delegateNodeAddress, Privilege[] memory privileges) internal {
        DelegateNode storage delegateNode = _delegateNodes[delegateNodeAddress];
        for(uint8 i = 0; i < delegateNode.privileges.length; i++) {
          for(uint j = 0; j < privileges.length; j++) {
            if(areSamePrivileges(delegateNode.privileges[i], privileges[j])) {
                uint lastPrivilegeIndex = delegateNode.privileges.length - 1;
                swapPrivileges(delegateNode.privileges[i], delegateNode.privileges[lastPrivilegeIndex]);
                delegateNode.privileges.length--;
                emit DelegationCertificatePrivilegeRevoked(delegateNodeAddress, privileges[j].httpAction, privileges[j].resourceUrlRegex);
            }
          }
        }
    }

    function revokeDelegationCertificatePrivilegesHelper(bytes32 delegateNodeAddress, Privilege[] memory privileges) internal {
        DelegateNode storage delegateNode = _delegateNodes[delegateNodeAddress];
        for(uint8 i = 0; i < delegateNode.childrenNodesAddresses.length; i++) {
            revokeDelegationCertificatePrivilegesHelper(delegateNode.childrenNodesAddresses[i], privileges);
        }
        revokeDelegateNodePrivileges(delegateNodeAddress, privileges);
    }

    function revokeDelegationCertificatePrivileges(
        bytes32 delegateNodeAddress,
        Privilege[] memory privileges
        )
        public
        isDelegateNodeExistent(delegateNodeAddress)
        isDelegateNodeInitialized(delegateNodeAddress)
        onlyDelegateHierarchicalSupervisor(delegateNodeAddress, msg.sender) {
        require(privileges.length > 0, 'Empty privilege array.');
        require(arePrivilegesSubsetOf(privileges, _delegateNodes[delegateNodeAddress].privileges), 'Cannot revoke non existent privilege.');
        revokeDelegationCertificatePrivilegesHelper(delegateNodeAddress, privileges);
    }
}
