import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/dist/types";

import { ChainMapping, DevelopmentChains } from "../helper-hardhat.config";

const deployVrfCoordinatorV2Mock: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { getNamedAccounts, deployments, network } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  if (DevelopmentChains.includes(ChainMapping[network.config.chainId!])) {
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: [ethers.utils.parseEther("0.25"), 1e9],
      log: true,
      waitConfirmations: 1,
    });
  }
};

deployVrfCoordinatorV2Mock.tags = ["all", "mock"];

export default deployVrfCoordinatorV2Mock;
