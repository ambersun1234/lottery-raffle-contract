import { BigNumber } from "ethers";
import { network, getNamedAccounts, ethers } from "hardhat";
import { assert, expect } from "chai";

import { Lottery } from "../../typechain-types";
import {
  DevelopmentChains,
  ChainMapping,
  NetworkConfig,
} from "../../helper-hardhat.config";

DevelopmentChains.includes(ChainMapping[network.config.chainId!])
  ? describe.skip
  : describe("Lottery", () => {
      let lottery: Lottery;
      let deployer: string;

      const waitBlockConfirmation = 1;
      const playFee = ethers.utils.parseEther("0.1");
      const chainID = network.config.chainId!;
      const configuration = NetworkConfig[chainID];

      const errorNotEnoughETH = "Lottery__NotEnoughETH";
      const errorNotOpened = "Lottery__NotOpen";
      const errorUpkeepNotNeeded = "Lottery__UpkeepNotNeeded";

      const eventLotteryEnter = "LotteryEnter";
      const eventWinnerPicked = "WinnerPicked";

      beforeEach(async () => {
        deployer = (await getNamedAccounts())["deployer"];
        lottery = await ethers.getContract("Lottery", deployer);
      });

      describe("Constructor", () => {
        it("Should initialize lottery state to zero", async () => {
          assert.equal(await lottery.getLotteryState(), 0);
        });

        it("Should initialize lottery interval correctly", async () => {
          assert.equal(
            (await lottery.getInterval()).toString(),
            configuration.interval.toString()
          );
        });

        it("Should initialize empty player array", async () => {
          await expect(lottery.getPlayer(0)).to.be.reverted;
        });

        it("Should have zero balance", async () => {
          assert.equal(
            (await ethers.provider.getBalance(lottery.address)).toString(),
            "0"
          );
        });
      });

      describe("Enter Lottery", () => {
        describe("Error", () => {
          it("Should revert if not enough ETH", async () => {
            await expect(
              lottery.play({ value: ethers.utils.parseEther("0.001") })
            ).to.be.revertedWithCustomError(lottery, errorNotEnoughETH);
          });
        });

        describe("Event", () => {
          it("Should emit an event when a player enter raffle", async () => {
            await new Promise<void>(async (resolve) => {
              await expect(lottery.play({ value: playFee })).to.be.emit(
                lottery,
                eventLotteryEnter
              );
              resolve();
            });
          });
        });

        it("Should record player into players array", async () => {
          await new Promise<void>(async (resolve) => {
            lottery.once(eventWinnerPicked, async () => {
              assert.equal(
                (await ethers.provider.getBalance(lottery.address)).toString(),
                BigNumber.from(0).toString()
              );
              resolve();
            });

            const response = await lottery.play({ value: playFee });
            await response.wait(waitBlockConfirmation);
            assert.equal(await lottery.getPlayer(0), deployer);
          });
        });

        it("Should increase contract balance when player enter raffle", async () => {
          await new Promise<void>(async (resolve) => {
            lottery.once(eventWinnerPicked, async () => {
              assert.equal(
                (await ethers.provider.getBalance(lottery.address)).toString(),
                BigNumber.from(0).toString()
              );
              resolve();
            });

            const response = await lottery.play({ value: playFee });
            await response.wait(waitBlockConfirmation);
            const contractBalance = await ethers.provider.getBalance(
              lottery.address
            );
            assert.equal(contractBalance.toString(), playFee.toString());
          });
        });
      });

      describe("Raffle", () => {
        it("Should works with live chainlink keepers and vrf", async () => {
          await new Promise<void>(async (resolve, reject) => {
            const startingTimestamp = await lottery.getLatestTimestamp();
            let startingBalance: BigNumber = BigNumber.from(0);

            lottery.once(eventWinnerPicked, async () => {
              try {
                const winner = await lottery.getWinner();
                const state = await lottery.getLotteryState();
                const endingBalance = await ethers.provider.getBalance(winner);
                const endingTimestamp = await lottery.getLatestTimestamp();

                await expect(lottery.getPlayer(0)).to.be.reverted;
                assert.equal(winner, deployer);
                assert.equal(state, 0);
                expect(endingBalance).to.be.greaterThan(startingBalance);
                expect(endingTimestamp).to.be.greaterThan(startingTimestamp);
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            const response = await lottery.play({ value: playFee });
            await response.wait(waitBlockConfirmation);
            startingBalance = await ethers.provider.getBalance(deployer);
          });
        });
      });
    });
