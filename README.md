# Lottery Raffle Contract
This project implements simple lottery contract with chainlink keeper and vrf

## Description
This smart contract will choose one winner in a time interval(default for `30 seconds`, change the default value in [helper-hardhat.config.ts](./helper-hardhat.config.ts))\
User can pay at least `0.1 goerli ETH` entrance fee to play the raffle, and after 30 seconds, the smart contract will automatically pick a winner(by chainlink keeper and vrf)\
All of the entrance fee will be send to winner's crypto wallet

## Prerequisite
```
$ yarn install
```

## Note
In order to use the contract on the testnet correctly, you will need to set up [chainlink keeper](https://automation.chain.link/) and [chainlink vrf](https://vrf.chain.link/) correctly\
After you setup the keeper and vrf, grab the vrf subscription id and place it into `subscriptionID`(inside `NetworkConfig.5`) in [helper-hardhat.config.ts](./helper-hardhat.config.ts)

## Deploy to Goerli Testnet
```
$ yarn hardhat deploy --network goerli
```

## Test
### Unit Test
```
$ yarn hardhat test
```

### Integration Test
```
$ yarn hardhat test --network goerli
```

## Code Coverage
```
$ yarn hardhat coverage
```

File                       |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
---------------------------|----------|----------|----------|----------|----------------|
 contracts/                |    94.74 |       90 |    92.86 |    94.74 |                |
  Lottery.sol              |    94.74 |       90 |    92.86 |    94.74 |         81,146 |
  VRFCoordinatorV2Mock.sol |      100 |      100 |      100 |      100 |                |
---------------------------|----------|----------|----------|----------|----------------|
All files                  |    94.74 |       90 |    92.86 |    94.74 |                |
---------------------------|----------|----------|----------|----------|----------------|

## License
This project is licensed under MIT License - see the [LICENSE](./LICENSE) file for detail