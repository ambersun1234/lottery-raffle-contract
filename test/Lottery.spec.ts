import { BigNumber } from "ethers";
import { network, getNamedAccounts, deployments, ethers } from "hardhat";
import { assert, expect } from "chai";

import { Lottery, VRFCoordinatorV2Mock } from "../typechain-types";
import {
  DevelopmentChains,
  ChainMapping,
  NetworkConfig,
} from "../helper-hardhat.config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

!DevelopmentChains.includes(ChainMapping[network.config.chainId!])
  ? describe.skip
  : describe("Lottery", () => {
      let lottery: Lottery;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let interval: BigNumber;
      let deployer: string;

      const chainID = network.config.chainId!;
      const playFee = ethers.utils.parseEther("0.1");

      const errorNotEnoughETH = "Lottery__NotEnoughETH";
      const errorNotOpened = "Lottery__NotOpen";
      const errorUpkeepNotNeeded = "Lottery__UpkeepNotNeeded";

      const eventLotteryEnter = "LotteryEnter";
      const eventWinnerPicked = "WinnerPicked";

      beforeEach(async () => {
        deployer = (await getNamedAccounts())["deployer"];
        await deployments.fixture(["all", "mock"]);

        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );

        interval = await lottery.getInterval();
      });

      describe("Constructor", () => {
        it("Should initialize lottery state to zero", async () => {
          const state = await lottery.getLotteryState();
          assert.equal(state.toString(), "0");
        });

        it("Should initialize lottery interval correctly", async () => {
          const interval = await lottery.getInterval();
          assert.equal(
            interval.toString(),
            NetworkConfig[chainID].interval.toString()
          );
        });

        it("Should initialize lottery fee correctly", async () => {
          const fee = await lottery.getPlayFee();
          assert.equal(
            fee.toString(),
            NetworkConfig[chainID].entranceFee.toString()
          );
        });
      });

      describe("EnterLottery", () => {
        it("Should revert if not enough ETH", async () => {
          await expect(lottery.play()).to.be.revertedWithCustomError(
            lottery,
            errorNotEnoughETH
          );

          await expect(
            lottery.play({ value: ethers.utils.parseEther("0.001") })
          ).to.be.revertedWithCustomError(lottery, errorNotEnoughETH);
        });

        it("Should record player if enter lottery raffle", async () => {
          await lottery.play({ value: playFee });
          const player = await lottery.getPlayer(0);

          assert.equal(player, deployer);
        });

        it("Should record multiple player if enter lottery raffle", async () => {
          await lottery.play({ value: playFee });

          const player2 = (await ethers.getSigners())[1];
          const player2Contract = await lottery.connect(player2);
          player2Contract.play({ value: playFee });

          assert.equal(await lottery.getPlayer(0), deployer);
          assert.equal(await lottery.getPlayer(1), player2.address);
        });

        it("Should emit event when player enter lottery raffle", async () => {
          await expect(lottery.play({ value: playFee })).to.be.emit(
            lottery,
            eventLotteryEnter
          );
        });

        it("Should increase contract balance when player enter lottery raffle", async () => {
          const oldBalance = await ethers.provider.getBalance(lottery.address);
          assert.equal(oldBalance.toString(), "0");

          await lottery.play({ value: playFee });
          const newBalance = await ethers.provider.getBalance(lottery.address);
          assert.equal(newBalance.toString(), playFee.toString());
        });

        it("Should increase contract balance when multiple player enter lottery raffle", async () => {
          const oldBalance = await ethers.provider.getBalance(lottery.address);
          assert.equal(oldBalance.toString(), "0");

          await lottery.play({ value: playFee });
          await lottery.play({ value: playFee });
          await lottery.play({ value: playFee });

          const newBalance = await ethers.provider.getBalance(lottery.address);
          assert.equal(
            newBalance.toString(),
            playFee.mul(BigNumber.from(3)).toString()
          );
        });

        it("Should block player enter when result calculating", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);

          await expect(
            lottery.play({ value: playFee })
          ).to.be.revertedWithCustomError(lottery, errorNotOpened);
        });
      });

      describe("CheckUpkeep", () => {
        it("Should return false if no one play lottery raffle", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert.equal(upkeepNeeded, false);
        });

        it("Should return false if lottery raffle is calculating", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);

          const state = await lottery.getLotteryState();
          assert.equal(state, 1);
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert.equal(upkeepNeeded, false);
        });

        it("Should return false if time hasn't pass", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 10,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);

          assert.equal(upkeepNeeded, false);
        });

        it("Should return true if all condition matched", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 10,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);

          assert.equal(upkeepNeeded, true);
        });
      });

      describe("PerformUpkeep", () => {
        it("Should only run if checkUpkeep is true", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          assert(await lottery.performUpkeep([]));
        });

        it("Should revert when checkUpkeep is false", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 10,
          ]);
          await network.provider.send("evm_mine", []);

          await expect(lottery.performUpkeep([])).to.be.revertedWithCustomError(
            lottery,
            errorUpkeepNotNeeded
          );
        });

        it("Should update lottery raffle state", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);

          assert.equal(await lottery.getLotteryState(), 1);
        });

        it("Should emit event when time up", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const response = await lottery.performUpkeep([]);
          const receipt = await response.wait(1);

          assert.isAbove(receipt.events![1].args!.requestID, 0);
        });
      });

      describe("FulfillRandomWords", () => {
        it("Should only be called after performUpkeep", async () => {
          await lottery.play({ value: playFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
          ).to.be.reverted;
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
          ).to.be.reverted;
        });
      });

      describe("Winner", () => {
        let players: SignerWithAddress[];
        const totalPlayerCount: number = 10;

        beforeEach(async () => {
          players = await ethers.getSigners();

          for (let i = 0; i < totalPlayerCount; i++) {
            const playerContract = await lottery.connect(players[i]);
            await playerContract.play({ value: playFee });
          }
        });

        it("Should pick a winner from players", async () => {
          await new Promise<void>(async (resolve, reject) => {
            lottery.once(eventWinnerPicked, async () => {
              try {
                const winner = await lottery.getWinner();
                assert.isTrue(
                  players.some((player) => {
                    return player.address.toString() == winner.toString();
                  })
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 10,
            ]);
            await network.provider.send("evm_mine", []);

            const response = await lottery.performUpkeep([]);
            const receipt = await response.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              receipt.events![1].args!.requestID,
              lottery.address
            );
          });
        });

        it("Should re-initialize player array when winner picked", async () => {
          await new Promise<void>(async (resolve, reject) => {
            lottery.once(eventWinnerPicked, async () => {
              try {
                await expect(lottery.getPlayer(0)).to.be.reverted;
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 10,
            ]);
            await network.provider.send("evm_mine", []);

            const response = await lottery.performUpkeep([]);
            const receipt = await response.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              receipt.events![1].args!.requestID,
              lottery.address
            );
          });
        });

        it("Should send all ETH to winner's wallet", async () => {
          await new Promise<void>(async (resolve, reject) => {
            const playerStartingFeeMap = new Map<string, BigNumber>();
            players.forEach(async (player) => {
              playerStartingFeeMap.set(
                player.address,
                await ethers.provider.getBalance(player.address)
              );
            });

            lottery.once(eventWinnerPicked, async () => {
              try {
                const winner = await lottery.getWinner();

                assert.equal(
                  playerStartingFeeMap
                    .get(winner)!
                    .add(playFee.mul(totalPlayerCount))
                    .toString(),
                  (await ethers.provider.getBalance(winner)).toString()
                );

                resolve();
              } catch (e) {
                reject(e);
              }
            });

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.send("evm_mine", []);
            const response = await lottery.performUpkeep([]);
            const receipt = await response.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              receipt.events![1].args!.requestID,
              lottery.address
            );
          });
        });
      });
    });
