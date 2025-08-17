import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const name = process.env.EIP712_NAME || "RaceEscrow";
  const version = process.env.EIP712_VERSION || "1";

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const RaceEscrow = await ethers.getContractFactory("RaceEscrow");
  const contract = await RaceEscrow.deploy(name, version);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("RaceEscrow deployed to:", address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

