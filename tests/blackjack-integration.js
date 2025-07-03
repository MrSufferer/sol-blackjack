const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } = require("@solana/web3.js");

// Program ID of the deployed blackjack program on Gorbagana
const PROGRAM_ID = new PublicKey("5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny");

// Connection to Gorbagana testnet
const connection = new anchor.web3.Connection("https://rpc.gorbagana.wtf/");

/**
 * Generate Gorbagana explorer URL for a transaction
 */
function getExplorerUrl(signature, type = 'tx') {
  return `https://explorer.gorbagana.wtf/${type}/${signature}`;
}

/**
 * Log transaction success with explorer link
 */
function logTransactionSuccess(signature, description) {
  console.log(`✅ ${description}`);
  console.log(`📋 Transaction Hash: ${signature}`);
  console.log(`🔗 View on Gorbagana Explorer: ${getExplorerUrl(signature)}`);
  console.log(''); // Empty line for readability
}

/**
 * Wait for transaction confirmation and log explorer URL
 */
async function confirmAndLogTransaction(connection, signature, description) {
  console.log(`⏳ Confirming transaction: ${description}...`);
  
  try {
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature);
    
    if (confirmation.value.err) {
      console.error(`❌ Transaction failed: ${description}`);
      console.error(`Error: ${confirmation.value.err}`);
      console.log(`🔗 Failed Transaction: ${getExplorerUrl(signature)}`);
      return false;
    }
    
    logTransactionSuccess(signature, description);
    return true;
  } catch (error) {
    console.error(`❌ Transaction confirmation failed: ${description}`);
    console.error(`Error: ${error.message}`);
    console.log(`🔗 Check Transaction: ${getExplorerUrl(signature)}`);
    return false;
  }
}

/**
 * BlackjackClient - A simple client to interact with the deployed blackjack program
 */
class BlackjackClient {
  constructor(wallet, connection) {
    this.wallet = wallet;
    this.connection = connection;
    this.provider = new anchor.AnchorProvider(connection, wallet, {});
    
    // Simple program interface for method calls
    this.programId = PROGRAM_ID;
  }

  /**
   * Get the global state PDA
   */
  async getGlobalStatePDA() {
    const [globalStatePDA] = await PublicKey.findProgramAddress(
      [Buffer.from("global_state")],
      this.programId
    );
    return globalStatePDA;
  }

  /**
   * Get game PDA for a specific game ID
   */
  async getGamePDA(gameId) {
    const [gamePDA] = await PublicKey.findProgramAddress(
      [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
      this.programId
    );
    return gamePDA;
  }

  /**
   * Get player PDA for a specific player and game ID
   */
  async getPlayerPDA(playerPublicKey, gameId) {
    const [playerPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("player"), playerPublicKey.toBuffer(), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
      this.programId
    );
    return playerPDA;
  }

  /**
   * Initialize the program (only needs to be done once)
   */
  async initialize() {
    const globalStatePDA = await this.getGlobalStatePDA();
    
    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: globalStatePDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]), // initialize instruction discriminator
    });

    const transaction = new anchor.web3.Transaction().add(instruction);
    const signature = await this.provider.sendAndConfirm(transaction);
    
    // Log with explorer URL
    logTransactionSuccess(signature, "Program initialized successfully");
    
    return signature;
  }

  /**
   * Start a single player game
   */
  async startSinglePlayerGame(betAmount, gameId) {
    const globalStatePDA = await this.getGlobalStatePDA();
    const gamePDA = await this.getGamePDA(gameId);
    const playerPDA = await this.getPlayerPDA(this.wallet.publicKey, gameId);

    // Create instruction data
    const instructionData = Buffer.alloc(16);
    instructionData.writeUInt32LE(0xd7263a9e, 0); // startSinglePlayerGame discriminator (first 8 bytes)
    instructionData.writeUInt32LE(0x19b88a74, 4);
    instructionData.writeBigUInt64LE(BigInt(betAmount), 8);

    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: globalStatePDA, isSigner: false, isWritable: true },
        { pubkey: gamePDA, isSigner: false, isWritable: true },
        { pubkey: playerPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new anchor.web3.Transaction().add(instruction);
    const signature = await this.provider.sendAndConfirm(transaction);
    
    // Log with explorer URL
    logTransactionSuccess(signature, `Single player game started (Game ID: ${gameId}, Bet: ${betAmount / LAMPORTS_PER_SOL} GOR)`);
    
    return signature;
  }

  /**
   * Start a multiplayer game
   */
  async startMultiplayerGame(betAmount, gameId) {
    const globalStatePDA = await this.getGlobalStatePDA();
    const gamePDA = await this.getGamePDA(gameId);
    const playerPDA = await this.getPlayerPDA(this.wallet.publicKey, gameId);

    // Create instruction data
    const instructionData = Buffer.alloc(16);
    instructionData.writeUInt32LE(0x123456ab, 0); // startMultiplayerGame discriminator (placeholder)
    instructionData.writeUInt32LE(0x789012cd, 4);
    instructionData.writeBigUInt64LE(BigInt(betAmount), 8);

    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: globalStatePDA, isSigner: false, isWritable: true },
        { pubkey: gamePDA, isSigner: false, isWritable: true },
        { pubkey: playerPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new anchor.web3.Transaction().add(instruction);
    const signature = await this.provider.sendAndConfirm(transaction);
    
    // Log with explorer URL
    logTransactionSuccess(signature, `Multiplayer game started (Game ID: ${gameId}, Bet: ${betAmount / LAMPORTS_PER_SOL} GOR)`);
    
    return signature;
  }

  /**
   * End a game
   */
  async endGame(gameId, finalBet) {
    const gamePDA = await this.getGamePDA(gameId);
    const playerPDA = await this.getPlayerPDA(this.wallet.publicKey, gameId);

    // Create instruction data
    const instructionData = Buffer.alloc(24);
    instructionData.writeUInt32LE(0xa8e3fe9c, 0); // endGame discriminator (first 8 bytes)
    instructionData.writeUInt32LE(0x526c6cdc, 4);
    instructionData.writeBigUInt64LE(BigInt(gameId), 8);
    instructionData.writeBigUInt64LE(BigInt(finalBet), 16);

    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: gamePDA, isSigner: false, isWritable: true },
        { pubkey: playerPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new anchor.web3.Transaction().add(instruction);
    const signature = await this.provider.sendAndConfirm(transaction);
    
    // Log with explorer URL
    logTransactionSuccess(signature, `Game ended (Game ID: ${gameId}, Final Bet: ${finalBet / LAMPORTS_PER_SOL} GOR)`);
    
    return signature;
  }

  /**
   * Withdraw bet from a finished game
   */
  async withdrawBet(gameId, amount) {
    const gamePDA = await this.getGamePDA(gameId);
    const playerPDA = await this.getPlayerPDA(this.wallet.publicKey, gameId);

    // Create instruction data
    const instructionData = Buffer.alloc(16);
    instructionData.writeUInt32LE(0x853fde92, 0); // withdrawBet discriminator (first 8 bytes)
    instructionData.writeUInt32LE(0xfe39b3b5, 4);
    instructionData.writeBigUInt64LE(BigInt(amount), 8);

    const instruction = new anchor.web3.TransactionInstruction({
      keys: [
        { pubkey: gamePDA, isSigner: false, isWritable: true },
        { pubkey: playerPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new anchor.web3.Transaction().add(instruction);
    const signature = await this.provider.sendAndConfirm(transaction);
    
    // Log with explorer URL
    logTransactionSuccess(signature, `Bet withdrawn (Game ID: ${gameId}, Amount: ${amount / LAMPORTS_PER_SOL} GOR)`);
    
    return signature;
  }

  /**
   * Get account data for debugging
   */
  async getGameAccount(gameId) {
    const gamePDA = await this.getGamePDA(gameId);
    const accountInfo = await this.connection.getAccountInfo(gamePDA);
    
    // Log account PDA for reference
    console.log(`🎮 Game Account PDA: ${gamePDA.toString()}`);
    console.log(`🔗 View Account: ${getExplorerUrl(gamePDA.toString(), 'account')}`);
    
    return { pda: gamePDA, accountInfo };
  }

  async getPlayerAccount(playerPublicKey, gameId) {
    const playerPDA = await this.getPlayerPDA(playerPublicKey, gameId);
    const accountInfo = await this.connection.getAccountInfo(playerPDA);
    
    // Log account PDA for reference
    console.log(`👤 Player Account PDA: ${playerPDA.toString()}`);
    console.log(`🔗 View Account: ${getExplorerUrl(playerPDA.toString(), 'account')}`);
    
    return { pda: playerPDA, accountInfo };
  }

  async getGlobalStateAccount() {
    const globalStatePDA = await this.getGlobalStatePDA();
    const accountInfo = await this.connection.getAccountInfo(globalStatePDA);
    
    // Log account PDA for reference
    console.log(`🌍 Global State PDA: ${globalStatePDA.toString()}`);
    console.log(`🔗 View Account: ${getExplorerUrl(globalStatePDA.toString(), 'account')}`);
    
    return { pda: globalStatePDA, accountInfo };
  }
}

/**
 * Demo function showing how to use the BlackjackClient
 */
async function runBlackjackDemo() {
  console.log("🃏 Starting Blackjack Demo on Gorbagana Testnet");
  console.log("================================================");
  console.log(`🌐 Explorer: https://explorer.gorbagana.wtf/`);
  console.log(`📋 Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`🔗 View Program: ${getExplorerUrl(PROGRAM_ID.toString(), 'account')}`);
  console.log("");

  // Create a test wallet (you would use your actual wallet in practice)
  const testWallet = Keypair.generate();
  console.log("Test wallet public key:", testWallet.publicKey.toString());
  console.log(`🔗 View Wallet: ${getExplorerUrl(testWallet.publicKey.toString(), 'account')}`);

  // Create wallet adapter
  const wallet = {
    publicKey: testWallet.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(testWallet);
      return tx;
    },
    signAllTransactions: async (txs) => {
      txs.forEach(tx => tx.partialSign(testWallet));
      return txs;
    },
  };

  // Create the client
  const client = new BlackjackClient(wallet, connection);

  try {
    // Request airdrop for test wallet
    console.log("\n📡 Requesting airdrop...");
    const airdropSignature = await connection.requestAirdrop(
      testWallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    
    // Wait for airdrop confirmation
    const airdropConfirmed = await confirmAndLogTransaction(
      connection, 
      airdropSignature, 
      `Airdrop 2 GOR to ${testWallet.publicKey.toString().substring(0, 8)}...`
    );
    
    if (!airdropConfirmed) {
      console.log("❌ Airdrop failed, but continuing with demo...");
    }

    const balance = await connection.getBalance(testWallet.publicKey);
    console.log(`💰 Wallet balance: ${balance / LAMPORTS_PER_SOL} GOR`);

    // Check if program is initialized
    console.log("\n🔧 Checking program state...");
    const globalState = await client.getGlobalStateAccount();
    
    let gameId = 1;
    if (!globalState.accountInfo) {
      console.log("Program not initialized, initializing...");
      try {
        await client.initialize();
      } catch (error) {
        console.log("Initialize may already be done:", error.message);
      }
    } else {
      console.log("✅ Program already initialized");
    }

    // Start a single player game
    console.log("\n🎮 Starting single player game...");
    const betAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 GOR
    
    try {
      await client.startSinglePlayerGame(betAmount, gameId);
    } catch (error) {
      console.log("⚠️  Game may already exist or other error:", error.message);
    }

    // Get game account info
    console.log("\n📊 Checking game state...");
    const gameAccount = await client.getGameAccount(gameId);
    console.log("Game account exists:", !!gameAccount.accountInfo);

    const playerAccount = await client.getPlayerAccount(testWallet.publicKey, gameId);
    console.log("Player account exists:", !!playerAccount.accountInfo);

    // End the game (simulate game completion)
    console.log("\n🏁 Ending game...");
    const finalBet = 0.2 * LAMPORTS_PER_SOL;
    
    try {
      await client.endGame(gameId, finalBet);
    } catch (error) {
      console.log("⚠️  End game error:", error.message);
    }

    // Try to withdraw bet
    console.log("\n💰 Attempting to withdraw bet...");
    const withdrawAmount = 0.05 * LAMPORTS_PER_SOL;
    
    try {
      await client.withdrawBet(gameId, withdrawAmount);
    } catch (error) {
      console.log("⚠️  Withdraw error:", error.message);
    }

    // Final balance check
    const finalBalance = await connection.getBalance(testWallet.publicKey);
    console.log(`\n💳 Final wallet balance: ${finalBalance / LAMPORTS_PER_SOL} GOR`);

    // Summary with all relevant links
    console.log("\n📋 Demo Summary:");
    console.log("================");
    console.log(`🌐 Gorbagana Explorer: https://explorer.gorbagana.wtf/`);
    console.log(`📋 Program ID: ${PROGRAM_ID.toString()}`);
    console.log(`🔗 Program on Explorer: ${getExplorerUrl(PROGRAM_ID.toString(), 'account')}`);
    console.log(`👤 Test Wallet: ${testWallet.publicKey.toString()}`);
    console.log(`🔗 Wallet on Explorer: ${getExplorerUrl(testWallet.publicKey.toString(), 'account')}`);

  } catch (error) {
    console.error("Demo error:", error);
  }

  console.log("\n🎉 Blackjack demo completed!");
}

/**
 * Example usage in a frontend application
 */
function getFrontendExample() {
  return `
// Example: Using BlackjackClient in a React frontend

import { BlackjackClient } from './blackjack-client.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

function BlackjackGame() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const [client, setClient] = useState(null);
  const [gameId, setGameId] = useState(1);
  
  useEffect(() => {
    if (publicKey && signTransaction && signAllTransactions) {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      setClient(new BlackjackClient(wallet, connection));
    }
  }, [publicKey, signTransaction, signAllTransactions, connection]);
  
  const startGame = async () => {
    if (!client) return;
    
    try {
      const betAmount = 0.1 * LAMPORTS_PER_SOL;
      await client.startSinglePlayerGame(betAmount, gameId);
      console.log('Game started!');
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };
  
  const endGame = async () => {
    if (!client) return;
    
    try {
      const finalBet = 0.2 * LAMPORTS_PER_SOL;
      await client.endGame(gameId, finalBet);
      console.log('Game ended!');
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  };
  
  return (
    <div>
      <button onClick={startGame}>Start Game</button>
      <button onClick={endGame}>End Game</button>
    </div>
  );
}
`;
}

// Export for use in other files
module.exports = {
  BlackjackClient,
  runBlackjackDemo,
  getExplorerUrl,
  logTransactionSuccess,
  confirmAndLogTransaction,
  PROGRAM_ID,
};

// Run demo if this file is executed directly
if (require.main === module) {
  runBlackjackDemo().catch(console.error);
} 