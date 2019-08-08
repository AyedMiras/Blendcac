const express = require('express');
const fs = require('fs');
const web3 = require('web3');

const WEB3_HTTP_PROVIDER = 'http://127.0.0.1:8043';
const CONTRACT_ABI_FILE_NAME = 'blendCACContractAbi.json';
const GAS_LIMIT = 1000000;
const NULL_BYTES32_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CONTRACT_ABI = JSON.parse(fs.readFileSync(CONTRACT_ABI_FILE_NAME, 'utf8'))['abi'];
const CONTRACT_ADDRESS = '0x4fcEa2B8c45581401dc18f6349CFa10c7E7331cd';

let web3js = new web3(new web3.providers.HttpProvider(WEB3_HTTP_PROVIDER));
let contract = new web3js.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
let router = express.Router();

router.post('/domains', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let coordinatorAddress = req.body['coordinatorAddress'];
    let domainAddress = NULL_BYTES32_ADDRESS;
    console.log('7che');
    await contract.methods
        .createDomainWithCoordinator(coordinatorAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .then((txReceipt) => {
            console.log(txReceipt);
            domainAddress = txReceipt.events.DomainCreated.returnValues.domainAddress;
        })
        .catch(e => console.log(e))
    ;
    console.log('te7che');
    res.status(200).json({
       'domainAddress': domainAddress
    });
});


router.post('/users', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let userAddress = req.body['userAddress'];
    let domainAddress = req.body['domainAddress'];
    await contract.methods
        .addUserToDomain(userAddress, domainAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.status(200).json({
       'userAddress': userAddress,
       'domainAddress': domainAddress
    });
});


router.post('/devices', async (req,res) => {
    let subjectAddress = req.body['subjectAddress'];
    let ipAddress = req.body['ipAddress'];
    let portNumber = req.body['portNumber'];
    let domainAddress = req.body['domainAddress'];
    let deviceAddress = NULL_BYTES32_ADDRESS;
    await contract.methods
        .addDeviceToDomain(ipAddress, portNumber, domainAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .then((txReceipt) => deviceAddress = txReceipt.events.DeviceAddedToDomain.returnValues.deviceAddress)
    ;
    res.status(200).json({
       'deviceAddress': deviceAddress,
       'domainAddress': domainAddress
    });
});


router.post('/capTokens', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let deviceAddress = req.body['deviceAddress'];
    let userAddress = req.body['userAddress'];
    let privileges = req.body['privileges'];
    let capabilityTokenAddress = NULL_BYTES32_ADDRESS;
    await contract.methods
        .createCapabilityToken(userAddress, deviceAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .then((txReceipt) => capabilityTokenAddress = txReceipt.events.CapabilityTokenCreated.returnValues.capabilityTokenAddress)
    ;
    for (let i = 0; i < privileges.length; i++) {
        await contract.methods
            .addPrivilegeToCapabilityToken(
                capabilityTokenAddress,
                privileges[i].httpAction,
                privileges[i].resourceUrlRegex
            )
            .send({from: subjectAddress, gas: GAS_LIMIT})
        ;
    }
    await contract.methods
        .issueCapabilityToken(capabilityTokenAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.status(200).json({
       'capabilityTokenAddress': capabilityTokenAddress
    });
});

router.get('/capTokens', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let capabilityTokenAddress = req.body['capabilityTokenAddress'];
    let capabilityToken = await contract.methods
        .getCapabilityToken(capabilityTokenAddress)
        .call({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.status(200).json(parseSolidityStruct(capabilityToken));
});

router.post('/delegationTrees', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let privileges = req.body['privileges'];
    let delegationTreeAddress = NULL_BYTES32_ADDRESS;
    await contract.methods
        .createDelegationTree()
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .then((txReceipt) => delegationTreeAddress = txReceipt.events.DelegationTreeCreated.returnValues.delegationTreeAddress)
    ;
    for (let i = 0; i < privileges.length; i++) {
        await contract.methods
            .addPrivilegeToRootNode(
                delegationTreeAddress,
                privileges[i].httpAction,
                privileges[i].resourceUrlRegex
            )
            .send({from: subjectAddress, gas: GAS_LIMIT})
        ;
    }
    await contract.methods
        .initDelegationTree(delegationTreeAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.status(200).json({
       'delegationTreeAddress': delegationTreeAddress
    });
});


router.get('/delegationTrees', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let delegationTreeAddress = req.body['delegationTreeAddress'];
    let delegationTree = await contract.methods
        .getDelegationTree(delegationTreeAddress)
        .call({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.status(200).json(parseSolidityStruct(delegationTree));
});

router.post('/delegationCertificates', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let userAddress = req.body['userAddress'];
    let delegatorNodeAddress = req.body['delegatorNodeAddress'];
    let privileges = req.body['privileges'];
    let delegateNodeAddress = NULL_BYTES32_ADDRESS;
    await contract
        .methods
        .createDelegateNode(delegatorNodeAddress, userAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .then((txReceipt) => delegateNodeAddress = txReceipt.events.DelegateNodeCreated.returnValues.delegateNodeAddress);
    for (let i = 0; i < privileges.length; i++) {
        await contract.methods.
            addPrivilegeToDelegateNode(
                delegateNodeAddress,
                privileges[i].httpAction,
                privileges[i].resourceUrlRegex
            )
            .send({from: subjectAddress, gas: GAS_LIMIT })
        ;
    }
    await contract.methods
        .issueDelegationCertificate(delegateNodeAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.status(200).json({
        "delegateNodeAddress": delegateNodeAddress
    });
});

router.get('/delegationCertificates', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let delegateNodeAddress = req.body['delegateNodeAddress'];
    let delegateNode = await contract.methods
        .getDelegateNode(delegateNodeAddress)
        .call({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.status(200).json(parseSolidityStruct(delegateNode));
});

router.delete('/delegationCertificates', async (req, res) => {
    let subjectAddress = req.body['subjectAddress'];
    let delegateNodeAddress = req.body['delegateNodeAddress'];
    await contract.methods
        .revokeDelegationCertificate(delegateNodeAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT});
    res.sendStatus(200);
});

router.put('/delegationCertificates', async (req, res) => {
    let privileges = req.body['privileges'];
    let subjectAddress = req.body['subjectAddress'];
    let delegateNodeAddress = req.body['delegateNodeAddress'];
    console.log(privileges, subjectAddress, delegateNodeAddress);
    await contract.methods
        .revokeDelegationCertificatePrivileges(delegateNodeAddress, privileges)
        .send({from: subjectAddress, gas: GAS_LIMIT})
    ;
    res.sendStatus(200);
});

function parseSolidityStruct(properties) {
    let jsonResult = {};
    Object.entries(properties)
        .slice(properties.length)
        .forEach((entry) => jsonResult[entry[0]] = entry[1]);
    return jsonResult;
}

module.exports = router;
