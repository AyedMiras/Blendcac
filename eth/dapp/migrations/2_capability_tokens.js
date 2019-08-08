const CapabilityTokens = artifacts.require("CapabilityTokens");

module.exports = function(deployer) {
  deployer.deploy(CapabilityTokens);
};
