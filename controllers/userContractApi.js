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


router.get('/capTokens', async (req, res) => {
    let subjectAddress = req.headers.authorization.split('')[1];
    let capabilityTokenAddress = req.body['capabilityTokenAddress'];
    let capabilityToken = await contract.methods
        .getCapabilityToken(capabilityTokenAddress)
        .call({from: subjectAddress, gas: GAS_LIMIT})
        .catch((error) => res.status(500).json({'error': error}))
    ;
    res.status(200).json(parseSolidityStruct(capabilityToken));
});

router.get('/delegationCertificates', async (req, res) => {
    let subjectAddress = req.headers.authorization.split('')[1];
    let delegateNodeAddress = req.body['delegateNodeAddress'];
    let delegateNode = await contract.methods
        .getDelegateNode(delegateNodeAddress)
        .call({from: subjectAddress, gas: GAS_LIMIT})
        .catch((error) => res.status(500).json({'error': error}))
    ;
    res.status(200).json(parseSolidityStruct(delegateNode));
});

function parseSolidityStruct(properties) {
    let jsonResult = {};
    Object.entries(properties)
        .slice(properties.length)
        .forEach((entry) => jsonResult[entry[0]] = entry[1]);
    return jsonResult;
}

module.exports = router;
