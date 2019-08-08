const fs = require('fs');
const Web3 = require('web3');
const net = require('net');
const DEVICE_ADDRESS = '';

const WEB3_HTTP_PROVIDER = 'http://127.0.0.1:8043';
const CONTRACT_ABI_FILE_NAME = 'blendCACContractAbi.json';
const GAS_LIMIT = 1000000;
const NULL_BYTES32_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CONTRACT_ABI = JSON.parse(fs.readFileSync(CONTRACT_ABI_FILE_NAME, 'utf8'))['abi'];
const CONTRACT_ADDRESS = '0xD8224CCa56e1dE4aCcE0256849DBfc2C73ACF0D6';

let web3 = new Web3(new Web3.providers.HttpProvider(WEB3_HTTP_PROVIDER));
let contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

async function accessValidation(req, res) {
    let token = req.headers.authorization.split(" ")[1];
    if (token.length != 66) {
        res.status(500).json({error:'Token length is not valid.'});
    }
    let valid = false;
    let requestMethod = req.method;
    let requestPath = req.protocol + '://' + req.get('host') + req.originalUrl;
    if (req.headers['token-type'] === 'capToken') {
        valid = await capTokenAccessValidation(token, requestMethod, requestPath);
    } else if (req.headers['token-type'] === 'dlgCertificate') {
        valid = await delegationCertificateAccessValidation(token, requestMethod, requestPath);
    } else if (req.headers['token-type'] === undefined) {
        res.status(500).json({error: 'HTTP header token-type is missing.'});
    } else {
        res.status(500).json({error: 'HTTP header token-type not valid.'});
    }
    if (valid === false) {
        res.status(500).json({error: 'Access denied.'});
    }
}

async function capTokenAccessValidation(token, requestMethod, requestPath) {
    let capabilityTokenAddress = token;
    let capabilityToken = await contract.methods
        .getCapabilityToken(capabilityTokenAddress)
        .call({from: DEVICE_ADDRESS, gas: GAS_LIMIT})
    ;
    if (capabilityToken.tokenAddress === NULL_BYTES32_ADDRESS) {
        return false;
    }
    for (let i = 0; i < capabilityToken.privileges.length; i++) {
        if (
            capabilityToken.privileges[i].httpAction === requestMethod &&
            capabilityToken.privileges[i].resourceUrlRegex === requestPath
        )
        {
            return true
        }
    }
    return false;
}

async function delegationCertificateAccessValidation(token, reqestMethod, requestPath) {
    let delegationCertificateAddress = token;
    let delegateNode = await contract.methods
        .getDelegateNode(delegationCertificateAddress)
        .call({from: DEVICE_ADDRESS, gas: GAS_LIMIT})
    ;
    if (delegateNode.nodeAddress === NULL_BYTES32_ADDRESS) {
        return false;
    }
    for (let i = 0; i < delegateNode.privileges.length; i++) {
        if (
            delegateNode.privileges[i].httpAction === reqestMethod &&
            delegateNode.privileges[i].resourceUrlRegex === requestPath
        )
        {
            return true
        }
    }
    return false;
}

module.exports = {
    accessValidation: accessValidation
};
