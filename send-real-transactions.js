#!/usr/bin/env node

// Real transaction test for blackjack program
// This will send actual transactions to Gorbagana testnet

const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} = require('@solana/web3.js');

// Program details
const PROGRAM_ID = new PublicKey("5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny");
const connection = new Connection("https://rpc.gorbagana.wtf/", 'confirmed');

// Explorer URL helper
function getExplorerUrl(signature, type = 'tx') {
  return `https://explorer.gorbagana.wtf/${type}/${signature}`;
}

// Derive PDAs
async function getGlobalStatePDA() {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );
  return pda;
}

async function getGamePDA(gameId) {
  const gameIdBytes = Buffer.alloc(8);
  gameIdBytes.writeBigUInt64LE(BigInt(gameId), 0);
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from("game"), gameIdBytes],
    PROGRAM_ID
  );
  return pda;
}

async function getPlayerPDA(playerPublicKey, gameId) {
  const gameIdBytes = Buffer.alloc(8);
  gameIdBytes.writeBigUInt64LE(BigInt(gameId), 0);
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from("player"), playerPublicKey.toBuffer(), gameIdBytes],
    PROGRAM_ID
  );
  return pda;
}

// Transaction functions
async function initializeProgram(wallet) {
  console.log("\n🔧 Initializing program...");
  
  const globalStatePDA = await getGlobalStatePDA();
  
  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(globalStatePDA);
  if (accountInfo) {
    console.log("✅ Program already initialized");
    console.log(`🔗 Global State: ${getExplorerUrl(globalStatePDA.toString(), 'account')}`);
    return null;
  }
  
  const instructionData = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // initialize discriminator
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: globalStatePDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("✅ Program initialized successfully!");
    console.log(`📋 Transaction Hash: ${signature}`);
    console.log(`🔗 View on Explorer: ${getExplorerUrl(signature)}`);
    console.log(`🔗 Global State Account: ${getExplorerUrl(globalStatePDA.toString(), 'account')}`);
    return signature;
  } catch (error) {
    console.error("❌ Initialize failed:", error.message);
    return null;
  }
}

async function startSinglePlayerGame(wallet, gameId, betAmount) {
  console.log(`\n🎮 Starting single player game ${gameId} with bet ${betAmount / LAMPORTS_PER_SOL} GOR...`);
  
  const globalStatePDA = await getGlobalStatePDA();
  const gamePDA = await getGamePDA(gameId);
  const playerPDA = await getPlayerPDA(wallet.publicKey, gameId);
  
  // Check if game already exists
  const gameAccount = await connection.getAccountInfo(gamePDA);
  if (gameAccount) {
    console.log("⚠️  Game already exists");
    console.log(`🔗 Existing Game: ${getExplorerUrl(gamePDA.toString(), 'account')}`);
    return null;
  }
  
  // Create instruction data
  const instructionData = Buffer.alloc(16);
  instructionData.writeUInt32LE(2203997721, 0); // startSinglePlayerGame discriminator
  instructionData.writeUInt32LE(3226407176, 4);
  instructionData.writeBigUInt64LE(BigInt(betAmount), 8);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: globalStatePDA, isSigner: false, isWritable: true },
      { pubkey: gamePDA, isSigner: false, isWritable: true },
      { pubkey: playerPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("✅ Single player game started successfully!");
    console.log(`📋 Transaction Hash: ${signature}`);
    console.log(`🔗 View on Explorer: ${getExplorerUrl(signature)}`);
    console.log(`🔗 Game Account: ${getExplorerUrl(gamePDA.toString(), 'account')}`);
    console.log(`🔗 Player Account: ${getExplorerUrl(playerPDA.toString(), 'account')}`);
    return signature;
  } catch (error) {
    console.error("❌ Start game failed:", error.message);
    console.error("Full error:", error);
    return null;
  }
}

async function endGame(wallet, gameId, finalBet) {
  console.log(`\n🏁 Ending game ${gameId} with final bet ${finalBet / LAMPORTS_PER_SOL} GOR...`);
  
  const gamePDA = await getGamePDA(gameId);
  const playerPDA = await getPlayerPDA(wallet.publicKey, gameId);
  
  // Create instruction data
  const instructionData = Buffer.alloc(24);
  instructionData.writeUInt32LE(1677035488, 0); // endGame discriminator
  instructionData.writeUInt32LE(4235833155, 4);
  instructionData.writeBigUInt64LE(BigInt(gameId), 8);
  instructionData.writeBigUInt64LE(BigInt(finalBet), 16);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: gamePDA, isSigner: false, isWritable: true },
      { pubkey: playerPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("✅ Game ended successfully!");
    console.log(`📋 Transaction Hash: ${signature}`);
    console.log(`🔗 View on Explorer: ${getExplorerUrl(signature)}`);
    return signature;
  } catch (error) {
    console.error("❌ End game failed:", error.message);
    return null;
  }
}

async function withdrawBet(wallet, gameId, amount) {
  console.log(`\n💰 Withdrawing ${amount / LAMPORTS_PER_SOL} GOR from game ${gameId}...`);
  
  const gamePDA = await getGamePDA(gameId);
  const playerPDA = await getPlayerPDA(wallet.publicKey, gameId);
  
  // Create instruction data
  const instructionData = Buffer.alloc(16);
  instructionData.writeUInt32LE(1910526594, 0); // withdrawBet discriminator
  instructionData.writeUInt32LE(3301209216, 4);
  instructionData.writeBigUInt64LE(BigInt(amount), 8);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: gamePDA, isSigner: false, isWritable: true },
      { pubkey: playerPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("✅ Bet withdrawn successfully!");
    console.log(`📋 Transaction Hash: ${signature}`);
    console.log(`🔗 View on Explorer: ${getExplorerUrl(signature)}`);
    return signature;
  } catch (error) {
    console.error("❌ Withdraw failed:", error.message);
    return null;
  }
}

async function runRealTransactions() {
  console.log("🃏 Sending REAL Transactions to Blackjack Program");
  console.log("=================================================");
  console.log(`🌐 Explorer: https://explorer.gorbagana.wtf/`);
  console.log(`📋 Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`🔗 View Program: ${getExplorerUrl(PROGRAM_ID.toString(), 'account')}`);
  
  // Load the funded deployment wallet
  const fs = require('fs');
  const walletPath = '/Users/kyler/.config/solana/id.json';
  const walletKeypair = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletKeypair));
  
  console.log(`\n👤 Using Deployment Wallet: ${wallet.publicKey.toString()}`);
  console.log(`🔗 View Wallet: ${getExplorerUrl(wallet.publicKey.toString(), 'account')}`);
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Wallet Balance: ${balance / LAMPORTS_PER_SOL} GOR`);
  
  if (balance === 0) {
    console.error("❌ No balance to send transactions. Please fund the wallet manually.");
    return;
  }
  
  const signatures = [];
  
  // 1. Initialize program
  const initSig = await initializeProgram(wallet);
  if (initSig) signatures.push(initSig);
  
  // 2. Start a single player game
  // First get the next game ID from global state
  const globalStatePDA = await getGlobalStatePDA();
  const globalStateAccount = await connection.getAccountInfo(globalStatePDA);
  let nextGameId = 1; // Default if not initialized
  if (globalStateAccount) {
    // Read next_game_id from the account data (skip discriminator + authority)
    const data = globalStateAccount.data;
    nextGameId = data.readBigUInt64LE(8 + 32); // Skip discriminator (8) + authority (32)
  }
  
  const betAmount = 0.1 * LAMPORTS_PER_SOL;
  const startSig = await startSinglePlayerGame(wallet, nextGameId, betAmount);
  if (startSig) signatures.push(startSig);
  
  // 3. End the game
  if (startSig) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const finalBet = 0.2 * LAMPORTS_PER_SOL;
    const endSig = await endGame(wallet, nextGameId, finalBet);
    if (endSig) signatures.push(endSig);
    
    // 4. Try to withdraw
    if (endSig) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      const withdrawAmount = 0.05 * LAMPORTS_PER_SOL;
      const withdrawSig = await withdrawBet(wallet, nextGameId, withdrawAmount);
      if (withdrawSig) signatures.push(withdrawSig);
    }
  }
  
  // Final summary
  console.log("\n📊 Transaction Summary");
  console.log("=====================");
  console.log(`✅ Sent ${signatures.length} successful transactions to the blockchain`);
  console.log(`💰 Final wallet balance: ${(await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL} GOR`);
  
  console.log("\n🔗 All Transaction Links:");
  signatures.forEach((sig, i) => {
    console.log(`${i + 1}. ${getExplorerUrl(sig)}`);
  });
  
  console.log(`\n👤 Wallet on Explorer: ${getExplorerUrl(wallet.publicKey.toString(), 'account')}`);
  console.log(`📋 Program on Explorer: ${getExplorerUrl(PROGRAM_ID.toString(), 'account')}`);
  
  console.log("\n🎉 Real transactions completed! Check the explorer links above.");
}

// Run if executed directly
if (require.main === module) {
  runRealTransactions().catch(console.error);
}

module.exports = {
  initializeProgram,
  startSinglePlayerGame,
  endGame,
  withdrawBet,
  runRealTransactions,
  getExplorerUrl
}; 