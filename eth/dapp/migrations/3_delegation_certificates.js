const DelegationCertificates = artifacts.require("DelegationCertificates");

module.exports = function(deployer) {
  deployer.deploy(DelegationCertificates);
};
