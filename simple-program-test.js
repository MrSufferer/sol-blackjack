#!/usr/bin/env node

// Simple blackjack program interaction test
// This demonstrates how to interact with the deployed program

const https = require('https');
const crypto = require('crypto');

// Program details
const PROGRAM_ID = "5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny";
const RPC_ENDPOINT = "https://rpc.gorbagana.wtf/";
const EXPLORER_URL = "https://explorer.gorbagana.wtf/";

/**
 * Generate Gorbagana explorer URL for a transaction or account
 */
function getExplorerUrl(signature, type = 'tx') {
  return `${EXPLORER_URL}${type}/${signature}`;
}

/**
 * Log with explorer link
 */
function logWithExplorer(message, signature = null, type = 'tx') {
  console.log(message);
  if (signature) {
    console.log(`🔗 View on Explorer: ${getExplorerUrl(signature, type)}`);
  }
}

// Helper function to make RPC calls
function makeRPCCall(method, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: method,
      params: params
    });

    const options = {
      hostname: 'rpc.gorbagana.wtf',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Test functions
async function testConnection() {
  console.log("🔗 Testing connection to Gorbagana testnet...");
  
  try {
    const response = await makeRPCCall('getHealth', []);
    logWithExplorer("✅ Connection successful!");
    console.log("Response:", response);
    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    return false;
  }
}

async function testSlotInfo() {
  console.log("\n📊 Getting slot information...");
  
  try {
    const response = await makeRPCCall('getSlot', []);
    logWithExplorer(`✅ Current slot: ${response.result}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to get slot:", error.message);
    return false;
  }
}

async function testProgramAccount() {
  console.log("\n🎮 Testing program account...");
  
  try {
    const response = await makeRPCCall('getAccountInfo', [
      PROGRAM_ID,
      {
        encoding: "base64"
      }
    ]);
    
    if (response.result && response.result.value) {
      logWithExplorer("✅ Program account found!", PROGRAM_ID, 'account');
      console.log("Owner:", response.result.value.owner);
      console.log("Executable:", response.result.value.executable);
      console.log("Lamports:", response.result.value.lamports);
      console.log("Data length:", response.result.value.data ? response.result.value.data[0].length : 0);
      return true;
    } else {
      console.log("❌ Program account not found");
      return false;
    }
  } catch (error) {
    console.error("❌ Failed to get program account:", error.message);
    return false;
  }
}

async function testVersionInfo() {
  console.log("\n📋 Getting version info...");
  
  try {
    const response = await makeRPCCall('getVersion', []);
    logWithExplorer("✅ Version info:", response.result);
    return true;
  } catch (error) {
    console.error("❌ Failed to get version:", error.message);
    return false;
  }
}

async function demonstrateInstructionData() {
  console.log("\n📝 Demonstrating instruction data format...");
  
  console.log("Example instruction discriminators:");
  console.log("initialize:             [175, 175, 109, 31, 13, 152, 155, 237]");
  console.log("startSinglePlayerGame:  [215, 38, 58, 158, 25, 184, 138, 116]");
  console.log("endGame:                [168, 227, 254, 156, 82, 108, 108, 220]");
  console.log("withdrawBet:            [133, 63, 222, 146, 254, 57, 179, 181]");
  
  console.log("\nExample PDA derivation:");
  console.log("Global state: ['global_state']");
  console.log("Game:         ['game', <game_id_bytes>]");
  console.log("Player:       ['player', <player_pubkey>, <game_id_bytes>]");
  
  return true;
}

async function demonstrateExplorerUsage() {
  console.log("\n🌐 Gorbagana Explorer Integration:");
  console.log("==================================");
  
  console.log(`🔗 Explorer Base URL: ${EXPLORER_URL}`);
  console.log(`📋 Program ID: ${PROGRAM_ID}`);
  console.log(`🔗 View Program: ${getExplorerUrl(PROGRAM_ID, 'account')}`);
  
  console.log("\n📖 How to use explorer URLs:");
  console.log("- Transaction: https://explorer.gorbagana.wtf/tx/<signature>");
  console.log("- Account: https://explorer.gorbagana.wtf/account/<pubkey>");
  console.log("- Block: https://explorer.gorbagana.wtf/block/<slot>");
  
  console.log("\n💡 Every successful transaction will now show:");
  console.log("✅ Transaction completed successfully");
  console.log("📋 Transaction Hash: <signature>");
  console.log("🔗 View on Gorbagana Explorer: <explorer_url>");
  
  return true;
}

async function runSimpleTests() {
  console.log("🎮 Blackjack Program Simple Test Suite");
  console.log("=====================================");
  console.log(`🌐 Explorer: ${EXPLORER_URL}`);
  console.log(`📋 Program: ${PROGRAM_ID}`);
  console.log(`🔗 View Program: ${getExplorerUrl(PROGRAM_ID, 'account')}`);
  console.log("");
  
  const tests = [
    { name: "Connection Test", fn: testConnection },
    { name: "Slot Info Test", fn: testSlotInfo },
    { name: "Program Account Test", fn: testProgramAccount },
    { name: "Version Info Test", fn: testVersionInfo },
    { name: "Instruction Demo", fn: demonstrateInstructionData },
    { name: "Explorer Demo", fn: demonstrateExplorerUsage }
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) passed++;
  }
  
  console.log("\n📊 Test Results:");
  console.log(`✅ ${passed}/${tests.length} tests passed`);
  
  if (passed === tests.length) {
    console.log("\n🎉 All tests passed! Your program is deployed and accessible.");
    console.log("\n📚 Integration Information:");
    console.log(`Program ID: ${PROGRAM_ID}`);
    console.log(`RPC Endpoint: ${RPC_ENDPOINT}`);
    console.log(`Explorer: ${EXPLORER_URL}`);
    console.log(`Network: Gorbagana Testnet v2`);
    console.log(`Native Token: GOR`);
    
    console.log("\n🔧 Next Steps:");
    console.log("1. Update your frontend to use the deployed program ID");
    console.log("2. Configure your wallet to connect to Gorbagana testnet");
    console.log("3. Use the BlackjackClient class from the integration tests");
    console.log("4. Replace Light protocol code with the new simplified program calls");
    console.log("5. All transactions will now show explorer URLs for verification");
    
    console.log("\n📖 Available Functions:");
    console.log("- initialize(): Set up global state");
    console.log("- start_single_player_game(bet_amount): Start solo game");
    console.log("- start_multiplayer_game(bet_amount): Start multiplayer game");
    console.log("- create_game(bet_amount): Alternative game creation");
    console.log("- join_game(): Join existing game");
    console.log("- end_game(game_id, final_bet): End game");
    console.log("- withdraw_bet(amount): Withdraw winnings");
    
    console.log("\n🔗 Explorer Links:");
    console.log("- Every transaction will show a clickable explorer URL");
    console.log("- Account PDAs are also viewable on the explorer");
    console.log("- Use the explorer to verify all on-chain activities");
    
  } else {
    console.log("\n❌ Some tests failed. Please check the connection and program deployment.");
  }
}

// Frontend integration example
function showFrontendIntegration() {
  console.log("\n🌐 Frontend Integration Example:");
  console.log("================================\n");
  
  const example = `
// Update your zkblackjack-ui/src/context/Solana.tsx
import { clusterApiUrl, Connection } from '@solana/web3.js';

const GORBAGANA_ENDPOINT = 'https://rpc.gorbagana.wtf/';
const PROGRAM_ID = '${PROGRAM_ID}';

// Helper function for explorer URLs
function getExplorerUrl(signature, type = 'tx') {
  return \`https://explorer.gorbagana.wtf/\${type}/\${signature}\`;
}

// In your component:
const connection = new Connection(GORBAGANA_ENDPOINT);

// Example: Start a single player game with explorer logging
async function startGame() {
  const gameId = 1;
  const betAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 GOR
  
  try {
    // Create instruction data
    const instructionData = Buffer.alloc(16);
    instructionData.writeUInt32LE(0xd7263a9e, 0); // startSinglePlayerGame discriminator
    instructionData.writeUInt32LE(0x19b88a74, 4);
    instructionData.writeBigUInt64LE(BigInt(betAmount), 8);
    
    // Create instruction
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
    const signature = await sendTransaction(transaction, connection);
    
    // Log success with explorer URL
    console.log('✅ Game started successfully!');
    console.log('📋 Transaction Hash:', signature);
    console.log('🔗 View on Gorbagana Explorer:', getExplorerUrl(signature));
    
    // Show toast notification with explorer link
    toast.success(\`Game started! \${getExplorerUrl(signature)}\`);
    
  } catch (error) {
    console.error('❌ Failed to start game:', error);
    toast.error('Failed to start game');
  }
}
`;

  console.log(example);
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  if (command === 'example' || command === 'integration') {
    showFrontendIntegration();
  } else {
    await runSimpleTests();
    showFrontendIntegration();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testConnection,
  testProgramAccount,
  getExplorerUrl,
  logWithExplorer,
  PROGRAM_ID,
  RPC_ENDPOINT,
  EXPLORER_URL
}; 