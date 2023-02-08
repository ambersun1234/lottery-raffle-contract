import { BigNumber } from "ethers";
import { ethers } from "hardhat";

interface NetworkConfigItemInterface {
  name: string;
  subscriptionID: string;
  entranceFee: BigNumber;
  gasLane: string;
  gasLimit: number;
  interval: number;
  vrfCoordinatorAddress?: string;
}

interface NetworkConfigInterface {
  [key: number]: NetworkConfigItemInterface;
}

interface ChainMappingInterface {
  [key: number]: string;
}

export const DevelopmentChains = ["hardhat", "localhost"];

export const ChainMapping: ChainMappingInterface = {
  31337: "hardhat",
  5: "goerli",
};

export const NetworkConfig: NetworkConfigInterface = {
  5: {
    name: "goerli",
    subscriptionID: "9548",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    gasLimit: 500000,
    interval: 30,
    vrfCoordinatorAddress: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
  },
  31337: {
    name: "hardhat",
    subscriptionID: "588",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    gasLimit: 500000,
    interval: 30,
  },
};
