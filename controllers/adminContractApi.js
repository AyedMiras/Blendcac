const express = require('express');
const fs = require('fs');
const web3 = require('web3');

const WEB3_HTTP_PROVIDER = 'http://127.0.0.1:7545';
const CONTRACT_ABI_FILE_NAME = 'blendCACContractAbi.json';
const GAS_LIMIT = 1000000;
const NULL_BYTES32_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CONTRACT_ABI = JSON.parse(fs.readFileSync(CONTRACT_ABI_FILE_NAME, 'utf8'))['abi'];
const CONTRACT_ADDRESS = '0xD8224CCa56e1dE4aCcE0256849DBfc2C73ACF0D6';

let web3js = new web3(new web3.providers.HttpProvider(WEB3_HTTP_PROVIDER));
let contract = new web3js.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
let router = express.Router();

router.post('/domains', async (req, res) => {
    let subjectAddress = req.headers.authorization.split('')[1];
    let coordinatorAddress = req.body['coordinatorAddress'];
    let domainAddress = NULL_BYTES32_ADDRESS;
    await contract.methods
        .createDomainWithCoordinator(coordinatorAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .then((txReceipt) => domainAddress = txReceipt.events.DomainCreated.returnValues.domainAddress)
        .catch((error) => res.status(500).json({'error': error}))
    ;
    res.status(200).json({
        'domainAddress': domainAddress
    });
});


router.post('/users', async (req, res) => {
    let subjectAddress = req.headers.authorization.split('')[1];
    let userAddress = req.body['userAddress'];
    let domainAddress = req.body['domainAddress'];
    await contract.methods
        .addUserToDomain(userAddress, domainAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .catch((error) => res.status(500).json({'error': error}))
    ;
    res.status(200).json({
        'userAddress': userAddress,
        'domainAddress': domainAddress
    });
});


router.post('/devices', async (req,res) => {
    let subjectAddress = req.headers.authorization.split('')[1];
    let ipAddress = req.body['ipAddress'];
    let portNumber = req.body['portNumber'];
    let domainAddress = req.body['domainAddress'];
    let deviceAddress = NULL_BYTES32_ADDRESS;
    await contract.methods
        .addDeviceToDomain(ipAddress, portNumber, domainAddress)
        .send({from: subjectAddress, gas: GAS_LIMIT})
        .then((txReceipt) => deviceAddress = txReceipt.events.DeviceAddedToDomain.returnValues.deviceAddress)
        .catch((error) => res.status(500).json({'error': error}))
    ;
    res.status(200).json({
        'deviceAddress': deviceAddress,
        'domainAddress': domainAddress
    });
});

module.exports = router;
