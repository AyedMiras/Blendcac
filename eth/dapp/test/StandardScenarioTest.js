const DelegationCertificates = artifacts.require('DelegationCertificates');

contract('DelegationCertificates', async (accounts) => {
  let truffleAssert = require('truffle-assertions');
  let adminAddress = accounts[0];
  let coordinatorAddress = accounts[1];
  let userAddress = accounts[2];
  let user2Address = accounts[3];
  let deviceIpAddress = 'http://127.0.0.1';
  let devicePortNumber = '5000';
  let domainAddress;
  let deviceAddress;
  let capabilityTokenAddress;
  let privileges = [
    { httpAction: 'GET', resourceUrlRegex: 'http://127.0.0.1:5000/api/test_get'},
    { httpAction: 'POST', resourceUrlRegex: 'http://127.0.0.1:5000/api/test_post'}
  ]
  let delegationTreeAddress;
  let delegateNodeAddress;
  let nullBytes32Address = '0x0000000000000000000000000000000000000000000000000000000000000000';
  it('AdminCanCreateDomainWithCoordinator', async () => {
      let instance = await DelegationCertificates.deployed();
      let txReceipt = await instance.createDomainWithCoordinator(coordinatorAddress);
      domainAddress = txReceipt.logs[0].args.domainAddress;
      assert.equal(txReceipt.logs[0].args.coordinatorAddress, coordinatorAddress);
  });
  it('AdminCanAddUserToDomain', async () => {
    let instance = await DelegationCertificates.deployed();
    let txReceipt = await instance.addUserToDomain(userAddress, domainAddress);
    assert.equal(txReceipt.logs[0].args.userAddress, userAddress);
    let domainUserAddresses = await instance.getDomainUsersAddresses.call(domainAddress);
    assert.equal(domainUserAddresses[0], userAddress);
  });
  it('AdminCanAddDeviceToDomain', async () => {
    let instance = await DelegationCertificates.deployed();
    let txReceipt = await instance.addDeviceToDomain(deviceIpAddress, devicePortNumber, domainAddress);
    deviceAddress = txReceipt.logs[0].args.deviceAddress;
    let domainDevicesAddresses = await instance.getDomainDevicesAddresses.call(domainAddress);
    assert.equal(domainDevicesAddresses[0], deviceAddress);
  });
  it('CoordinatorCanIssueCapabilityToken', async () => {
    let instance = await DelegationCertificates.deployed();
    let txReceipt = await instance.createCapabilityToken(userAddress, deviceAddress, { from: coordinatorAddress });
    capabilityTokenAddress = txReceipt.logs[0].args.capabilityTokenAddress;
    txReceipt = await instance.addPrivilegeToCapabilityToken(capabilityTokenAddress, privileges[0].httpAction, privileges[0].resourceUrlRegex, { from: coordinatorAddress });
    let privilegeIndex = txReceipt.logs[0].args.privilegeIndex;
    assert.equal(privilegeIndex, 0);
    txReceipt = await instance.addPrivilegeToCapabilityToken(capabilityTokenAddress, privileges[1].httpAction, privileges[1].resourceUrlRegex, { from: coordinatorAddress });
    privilegeIndex = txReceipt.logs[0].args.privilegeIndex;
    assert.equal(privilegeIndex, 1);
    txReceipt = await instance.issueCapabilityToken(capabilityTokenAddress, { from: coordinatorAddress });
    assert.equal(capabilityTokenAddress, txReceipt.logs[0].args.capabilityTokenAddress);
  });
  it('CoordinatorCanCreateDelegationTree', async () => {
    let instance = await DelegationCertificates.deployed();
    let txReceipt = await instance.createDelegationTree({ from: coordinatorAddress });
    delegationTreeAddress = txReceipt.logs[1].args.delegationTreeAddress;
    txReceipt = await instance.addPrivilegeToRootNode(delegationTreeAddress, privileges[0].httpAction, privileges[0].resourceUrlRegex, { from: coordinatorAddress });
    let privilegeIndex = txReceipt.logs[0].args.privilegeIndex;
    assert.equal(privilegeIndex, 0);
    txReceipt = await instance.addPrivilegeToRootNode(delegationTreeAddress, privileges[1].httpAction, privileges[1].resourceUrlRegex, { from: coordinatorAddress });
    privilegeIndex = txReceipt.logs[0].args.privilegeIndex;
    assert.equal(privilegeIndex, 1);
    txReceipt = await instance.initDelegationTree(delegationTreeAddress, { from: coordinatorAddress });
    assert.equal(txReceipt.logs[0].args.delegationTreeAddress, delegationTreeAddress);
  });
  it('CoordinatorCanIssueDelegationCertificate', async () => {
    let instance = await DelegationCertificates.deployed();
    let rootNodeAddress = (await instance.getDelegationTree.call(delegationTreeAddress)).rootNodeAddress;
    let txReceipt = await instance.createDelegateNode(rootNodeAddress, userAddress, { from: coordinatorAddress });
    let delegateNodeAddress = txReceipt.logs[0].args.delegateNodeAddress;
    txReceipt = await instance.addPrivilegeToDelegateNode(delegateNodeAddress, privileges[0].httpAction, privileges[0].resourceUrlRegex, { from: coordinatorAddress });
    let privilegeIndex = txReceipt.logs[0].args.privilegeIndex.toNumber();
    assert.equal(privilegeIndex, 0);
    txReceipt = await instance.addPrivilegeToDelegateNode(delegateNodeAddress, privileges[1].httpAction, privileges[1].resourceUrlRegex, { from: coordinatorAddress });
    privilegeIndex = txReceipt.logs[0].args.privilegeIndex.toNumber();
    assert.equal(privilegeIndex, 1);
    txReceipt = await instance.issueDelegationCertificate(delegateNodeAddress, { from: coordinatorAddress });
    assert.equal(txReceipt.logs[0].event, 'DelegationCertificateIssued');
    assert.equal(txReceipt.logs[0].args.delegateNodeAddress, delegateNodeAddress);
  });
  it('DelegatorCanRevokeDelegationCertificatePrivilege', async() => {
    let instance = await DelegationCertificates.deployed();
    let delegateNodeAddress = await instance.getDelegateNodeAddress.call(userAddress, { from: coordinatorAddress });
    let delegatorNodeAddress = await instance
        .getDelegateNode
        .call(delegateNodeAddress)
        .then((delegateNode) => delegateNode.parentNodeAddress);
    let txReceipt = await instance.revokeDelegationCertificatePrivileges(delegateNodeAddress, [privileges[0]], { from: coordinatorAddress });
    assert.equal(txReceipt.logs[0].event, 'DelegationCertificatePrivilegeRevoked');
    assert.equal(txReceipt.logs[0].args.delegateNodeAddress, delegateNodeAddress);
    assert.equal(txReceipt.logs[0].args.httpAction, 'GET');
    assert.equal(txReceipt.logs[0].args.resourceUrlRegex, 'http://127.0.0.1:5000/api/test_get');
  });
  it('DelegatorCanRevokeDelegationCertificate', async() => {
    let instance = await DelegationCertificates.deployed();
    let delegateNodeAddress = await instance.getDelegateNodeAddress.call(userAddress, { from: coordinatorAddress });
    let delegatorNodeAddress = await instance
        .getDelegateNode
        .call(delegateNodeAddress)
        .then((delegateNode) => delegateNode.parentNodeAddress);
    let txReceipt = await instance.revokeDelegationCertificate(delegateNodeAddress, { from: coordinatorAddress });
    let delegatorNode = await instance.getDelegateNode.call(delegatorNodeAddress);
    assert.equal(txReceipt.logs[0].event, 'DelegationCertificateRevoked');
    assert.equal(txReceipt.logs[0].args.delegateNodeAddress, delegateNodeAddress);
    assert.equal(delegatorNode.childrenNodesAddresses.length, 0);
  });
  it('DelegatorCanRecursiveRevokeDelegationCertificatePrivilege', async () => {
    let instance = await DelegationCertificates.deployed();
    let rootNodeAddress = (await instance.getDelegationTree.call(delegationTreeAddress)).rootNodeAddress;
    let txReceipt = await instance.createDelegateNode(rootNodeAddress, userAddress, { from: coordinatorAddress });
    let userDelegateNodeAddress = txReceipt.logs[0].args.delegateNodeAddress;
    await instance.addPrivilegeToDelegateNode(userDelegateNodeAddress, privileges[0].httpAction, privileges[0].resourceUrlRegex, { from: coordinatorAddress });
    await instance.addPrivilegeToDelegateNode(userDelegateNodeAddress, privileges[1].httpAction, privileges[1].resourceUrlRegex, { from: coordinatorAddress });
    await instance.issueDelegationCertificate(userDelegateNodeAddress, { from: coordinatorAddress });
    txReceipt = await instance.createDelegateNode(userDelegateNodeAddress, user2Address, { from: userAddress });
    let user2DelegateNodeAddress = txReceipt.logs[0].args.delegateNodeAddress;
    await instance.addPrivilegeToDelegateNode(user2DelegateNodeAddress, privileges[0].httpAction, privileges[0].resourceUrlRegex, { from: userAddress });
    await instance.addPrivilegeToDelegateNode(user2DelegateNodeAddress, privileges[1].httpAction, privileges[1].resourceUrlRegex, { from: userAddress });
    await instance.issueDelegationCertificate(user2DelegateNodeAddress, { from: userAddress });
    txReceipt = await instance.revokeDelegationCertificatePrivileges(userDelegateNodeAddress, [privileges[0]], { from: coordinatorAddress });
    let delegatorNode = await instance.getDelegateNode.call(rootNodeAddress);
    assert.equal(txReceipt.logs[0].event, 'DelegationCertificatePrivilegeRevoked');
    assert.equal(txReceipt.logs[0].args.delegateNodeAddress, user2DelegateNodeAddress);
    assert.equal(txReceipt.logs[1].event, 'DelegationCertificatePrivilegeRevoked');
    assert.equal(txReceipt.logs[1].args.delegateNodeAddress, userDelegateNodeAddress);
  });
  it('DelegatorCanRecursiveRevokeDelegationCertificate', async () => {
    let instance = await DelegationCertificates.deployed();
    let rootNodeAddress = await instance.getDelegationTree.call(delegationTreeAddress).then((delegationTree) => delegationTree.rootNodeAddress);
    let rootNode = await instance.getDelegateNode.call(rootNodeAddress);
    let userDelegateNodeAddress = rootNode.childrenNodesAddresses[0];
    let userDelegateNode = await instance.getDelegateNode.call(userDelegateNodeAddress);
    let user2DelegateNodeAddress = userDelegateNode.childrenNodesAddresses[0];
    let txReceipt = await instance.revokeDelegationCertificate(userDelegateNodeAddress, { from: coordinatorAddress });
    assert.equal(txReceipt.logs[0].event, 'DelegationCertificateRevoked');
    assert.equal(txReceipt.logs[1].event, 'DelegationCertificateRevoked');
    assert.equal(txReceipt.logs[0].args.delegateNodeAddress, user2DelegateNodeAddress);
    assert.equal(txReceipt.logs[1].args.delegateNodeAddress, userDelegateNodeAddress);
    let userDeletedDelegateNode = await instance.getDelegateNode.call(userDelegateNodeAddress);
    assert.equal(userDeletedDelegateNode.nodeAddress, nullBytes32Address);
    let user2DeletedDelegateNode = await instance.getDelegateNode.call(user2DelegateNodeAddress);
    assert.equal(user2DeletedDelegateNode.nodeAddress, nullBytes32Address);
    let rootUpdatedNode = await instance.getDelegateNode.call(rootNodeAddress);
    assert.equal(rootUpdatedNode.childrenNodesAddresses.length, 0);
  });
});
