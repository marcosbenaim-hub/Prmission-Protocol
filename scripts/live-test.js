const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const PRMISSION = '0xb9A5F35a8EB45aD45b91dD83ed5b91986537B193';
  
  const usdcAbi = ['function approve(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)'];
  const usdc = new ethers.Contract(USDC, usdcAbi, wallet);
  
  const amount = ethers.parseUnits('1', 6); // 1 USDC
  
  console.log('Approving 1 USDC...');
  const approveTx = await usdc.approve(PRMISSION, amount);
  await approveTx.wait();
  console.log('Approved! TX:', approveTx.hash);
  console.log('Basescan:', `https://basescan.org/tx/${approveTx.hash}`);
}

main().catch(console.error);
