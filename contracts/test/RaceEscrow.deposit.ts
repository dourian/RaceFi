import { expect } from "chai";
import { ethers } from "hardhat";

describe("RaceEscrow deposits", function () {
  async function deploy() {
    const [deployer, organizer, runner1, runner2] = await ethers.getSigners();
    const RaceEscrow = await ethers.getContractFactory("RaceEscrow");
    const escrow = await RaceEscrow.deploy("RaceEscrow", "1");
    await escrow.waitForDeployment();
    return { escrow, deployer, organizer, runner1, runner2 };
  }

  it("depositToRace attributes value and joins participant", async () => {
    const { escrow, organizer, runner1 } = await deploy();

    // Create race
    const stakeWei = ethers.parseEther("0.01");
    const joinWindow = 3600n;
    const signer = organizer.address;
    const tx = await escrow.connect(organizer).createRace(stakeWei, joinWindow, signer);
    const rc = await tx.wait();
    const event = rc!.logs.find((l: any) => (l as any).eventName === "RaceCreated") as any;
    const raceId = event.args.raceId as bigint;

    // depositToRace
    await expect(
      escrow.connect(runner1).depositToRace(raceId, { value: stakeWei })
    )
      .to.emit(escrow, "Joined").withArgs(raceId, runner1.address)
      .and.to.emit(escrow, "Deposited").withArgs(raceId, runner1.address, stakeWei);

    const info = await escrow.getRace(raceId);
    expect(info.pool).to.equal(stakeWei);
    expect(await escrow.hasJoined(raceId, runner1.address)).to.equal(true);
  });

  it("fallback with 32-byte abi-encoded raceId attributes deposit", async () => {
    const { escrow, organizer, runner2 } = await deploy();

    const stakeWei = ethers.parseEther("0.02");
    const joinWindow = 3600n;
    const signer = organizer.address;
    const tx = await escrow.connect(organizer).createRace(stakeWei, joinWindow, signer);
    const rc = await tx.wait();
    const event = rc!.logs.find((l: any) => (l as any).eventName === "RaceCreated") as any;
    const raceId = event.args.raceId as bigint;

    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [raceId]);

    await expect(
      runner2.sendTransaction({ to: await escrow.getAddress(), value: stakeWei, data })
    )
      .to.emit(escrow, "Joined").withArgs(raceId, runner2.address)
      .and.to.emit(escrow, "Deposited").withArgs(raceId, runner2.address, stakeWei);

    const info = await escrow.getRace(raceId);
    expect(info.pool).to.equal(stakeWei);
  });

  it("plain receive accepts ETH but does not attribute to any race", async () => {
    const { escrow, organizer, runner1 } = await deploy();

    const stakeWei = ethers.parseEther("0.01");
    const joinWindow = 3600n;
    const signer = organizer.address;
    await escrow.connect(organizer).createRace(stakeWei, joinWindow, signer);

    await expect(
      runner1.sendTransaction({ to: await escrow.getAddress(), value: ethers.parseEther("0.005") })
    ).to.emit(escrow, "DirectDeposit");

    // No change in race pool since we didn't target a race
    const info0 = await escrow.getRace(0);
    expect(info0.pool).to.equal(0n);
  });
});

