var Election = artifacts.require('./Election.sol');
// const http = require('http');

module.exports = function (deployer) {
  deployer.deploy(Election);
};
