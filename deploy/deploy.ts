import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

import {
  ChainMapping,
  DevelopmentChains,
  NetworkConfig,
} from "../helper-hardhat.config";
import { verify } from "../utils/verify";

const deployLottery: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainID = network.config.chainId!;
  const configuration = NetworkConfig[chainID];

  let vrfCoordinatorV2Address: string = "";
  let subscriptionID: any;

  if (DevelopmentChains.includes(ChainMapping[chainID])) {
    let vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

    const response = await vrfCoordinatorV2Mock.createSubscription();
    const receipt = await response.wait(1);
    subscriptionID = receipt.events[0].args.subId;

    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionID,
      "1000000000000000000000"
    );
  } else {
    vrfCoordinatorV2Address = configuration.vrfCoordinatorAddress!;
    subscriptionID = configuration.subscriptionID;
  }

  const lotteryArgs: any[] = [
    vrfCoordinatorV2Address,
    configuration.entranceFee,
    configuration.gasLane,
    subscriptionID,
    configuration.gasLimit,
    configuration.interval,
  ];

  const lottery = await deploy("Lottery", {
    from: deployer,
    args: lotteryArgs,
    log: true,
    waitConfirmations: 1,
  });

  if (
    !DevelopmentChains.includes(ChainMapping[chainID]) &&
    process.env.ETHERSCAN_API_KEY !== undefined
  ) {
    await verify(lottery.address, lotteryArgs);
  }
};

deployLottery.tags = ["all"];

export default deployLottery;
