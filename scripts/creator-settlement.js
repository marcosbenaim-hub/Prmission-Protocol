const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('🎯 Prmission Protocol — Creator Economy Settlement');
  console.log('📍 Nike AI Agent:', wallet.address);

  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const PRMISSION = '0xb9A5F35a8EB45aD45b91dD83ed5b91986537B193';

  const usdc = new ethers.Contract(USDC, ['function approve(address,uint256) returns (bool)'], wallet);
  const amount = ethers.parseUnits('1', 6);

  console.log('Approving 1 USDC to Prmission Protocol...');
  const tx = await usdc.approve(PRMISSION, amount);
  await tx.wait();
  console.log('✅ TX:', tx.hash);
  console.log('🔗 https://basescan.org/tx/' + tx.hash);
}

main().catch(console.error);
