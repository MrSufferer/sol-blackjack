#!/usr/bin/env node

const { runBlackjackDemo, BlackjackClient, PROGRAM_ID, getExplorerUrl } = require('./tests/blackjack-integration.js');
const { PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logWithExplorer(color, message, signature = null, type = 'tx') {
  log(color, message);
  if (signature) {
    log('blue', `🔗 View on Explorer: ${getExplorerUrl(signature, type)}`);
  }
}

async function testProgramConnection() {
  log('cyan', '\n🔗 Testing connection to Gorbagana testnet...');
  
  const connection = new anchor.web3.Connection("https://rpc.gorbagana.wtf/");
  
  try {
    const slot = await connection.getSlot();
    logWithExplorer('green', `✅ Connected to Gorbagana testnet (slot: ${slot})`);
    
    // Test program account exists
    const programAccount = await connection.getAccountInfo(PROGRAM_ID);
    if (programAccount) {
      logWithExplorer('green', `✅ Program ${PROGRAM_ID} found on-chain`, PROGRAM_ID.toString(), 'account');
      log('blue', `   Owner: ${programAccount.owner}`);
      log('blue', `   Executable: ${programAccount.executable}`);
      log('blue', `   Lamports: ${programAccount.lamports}`);
    } else {
      log('red', `❌ Program ${PROGRAM_ID} not found on-chain`);
      return false;
    }
    
    return true;
  } catch (error) {
    log('red', `❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function testWalletFunding() {
  log('cyan', '\n💰 Testing wallet funding...');
  
  const connection = new anchor.web3.Connection("https://rpc.gorbagana.wtf/");
  const testWallet = Keypair.generate();
  
  try {
    // Request airdrop
    log('yellow', `Requesting airdrop for ${testWallet.publicKey.toString()}`);
    logWithExplorer('blue', `🔗 View Wallet:`, testWallet.publicKey.toString(), 'account');
    
    const airdropSignature = await connection.requestAirdrop(
      testWallet.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    
    // Wait for confirmation
    await connection.confirmTransaction(airdropSignature);
    
    const balance = await connection.getBalance(testWallet.publicKey);
    logWithExplorer('green', `✅ Airdrop successful: ${balance / LAMPORTS_PER_SOL} GOR`, airdropSignature);
    
    return { connection, testWallet, balance };
  } catch (error) {
    log('red', `❌ Airdrop failed: ${error.message}`);
    return null;
  }
}

async function testProgramMethods() {
  log('cyan', '\n🎮 Testing program methods...');
  
  const connection = new anchor.web3.Connection("https://rpc.gorbagana.wtf/");
  const testWallet = Keypair.generate();
  
  try {
    // Fund the wallet
    log('yellow', 'Funding test wallet...');
    const airdropSignature = await connection.requestAirdrop(
      testWallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);
    
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
    
    // Create client
    const client = new BlackjackClient(wallet, connection);
    
    // Test 1: Check global state
    log('yellow', 'Checking global state...');
    const globalState = await client.getGlobalStateAccount();
    logWithExplorer('green', `✅ Global state PDA: ${globalState.pda.toString()}`, globalState.pda.toString(), 'account');
    log('blue', `   Exists: ${!!globalState.accountInfo}`);
    
    // Test 2: Test PDA derivation
    log('yellow', 'Testing PDA derivation...');
    const gameId = 1;
    const gamePDA = await client.getGamePDA(gameId);
    const playerPDA = await client.getPlayerPDA(testWallet.publicKey, gameId);
    
    logWithExplorer('green', `✅ Game PDA for ID ${gameId}: ${gamePDA.toString()}`, gamePDA.toString(), 'account');
    logWithExplorer('green', `✅ Player PDA: ${playerPDA.toString()}`, playerPDA.toString(), 'account');
    
    // Test 3: Check if accounts exist
    const gameAccount = await client.getGameAccount(gameId);
    const playerAccount = await client.getPlayerAccount(testWallet.publicKey, gameId);
    
    log('blue', `   Game account exists: ${!!gameAccount.accountInfo}`);
    log('blue', `   Player account exists: ${!!playerAccount.accountInfo}`);
    
    log('green', '✅ All PDA tests passed');
    
    return true;
  } catch (error) {
    log('red', `❌ Program method test failed: ${error.message}`);
    return false;
  }
}

async function runBasicTransactionTest() {
  log('cyan', '\n📝 Running basic transaction test...');
  
  const connection = new anchor.web3.Connection("https://rpc.gorbagana.wtf/");
  const testWallet = Keypair.generate();
  
  try {
    // Fund the wallet
    log('yellow', 'Funding test wallet...');
    const airdropSignature = await connection.requestAirdrop(
      testWallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);
    
    const initialBalance = await connection.getBalance(testWallet.publicKey);
    log('green', `Initial balance: ${initialBalance / LAMPORTS_PER_SOL} GOR`);
    
    // Create a simple transaction to test
    const recipientWallet = Keypair.generate();
    const transaction = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: testWallet.publicKey,
        toPubkey: recipientWallet.publicKey,
        lamports: 1000, // 0.000001 GOR
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [testWallet]);
    await connection.confirmTransaction(signature);
    
    const finalBalance = await connection.getBalance(testWallet.publicKey);
    logWithExplorer('green', `✅ Transaction successful: ${signature}`, signature);
    log('green', `Final balance: ${finalBalance / LAMPORTS_PER_SOL} GOR`);
    
    return true;
  } catch (error) {
    log('red', `❌ Transaction test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('magenta', '🚀 Starting Blackjack Program Test Suite');
  log('magenta', '==========================================');
  log('cyan', '🌐 Gorbagana Explorer: https://explorer.gorbagana.wtf/');
  log('cyan', `📋 Program ID: ${PROGRAM_ID.toString()}`);
  log('cyan', `🔗 View Program: ${getExplorerUrl(PROGRAM_ID.toString(), 'account')}`);
  log('magenta', '');
  
  const results = [];
  
  // Test 1: Connection
  const connectionTest = await testProgramConnection();
  results.push({ name: 'Connection Test', passed: connectionTest });
  
  // Test 2: Wallet funding
  const fundingTest = await testWalletFunding();
  results.push({ name: 'Wallet Funding Test', passed: !!fundingTest });
  
  // Test 3: Program methods
  const methodTest = await testProgramMethods();
  results.push({ name: 'Program Methods Test', passed: methodTest });
  
  // Test 4: Basic transaction
  const transactionTest = await runBasicTransactionTest();
  results.push({ name: 'Basic Transaction Test', passed: transactionTest });
  
  // Summary
  log('magenta', '\n📊 Test Results Summary');
  log('magenta', '========================');
  
  let passedCount = 0;
  results.forEach(result => {
    if (result.passed) {
      log('green', `✅ ${result.name}: PASSED`);
      passedCount++;
    } else {
      log('red', `❌ ${result.name}: FAILED`);
    }
  });
  
  log('magenta', `\nTotal: ${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    log('green', '\n🎉 All tests passed! Your program is ready for integration.');
    log('cyan', '\n📚 Next steps:');
    log('blue', '1. Run the full demo: node tests/blackjack-integration.js');
    log('blue', '2. Integrate with your frontend using the BlackjackClient');
    log('blue', '3. Update your UI to use the deployed program ID');
    log('blue', '4. All transactions will show explorer URLs for verification');
    
    log('cyan', '\n🔗 Explorer Integration:');
    log('blue', '- Every transaction shows a clickable explorer URL');
    log('blue', '- Account PDAs are viewable on the explorer');
    log('blue', '- Use https://explorer.gorbagana.wtf/ to verify all activities');
  } else {
    log('red', '\n❌ Some tests failed. Please check the errors above.');
  }
}

// Add help command
function showHelp() {
  log('cyan', '\n🎮 Blackjack Program Test Runner');
  log('cyan', '=================================\n');
  log('blue', 'Usage: node run-tests.js [command]\n');
  log('yellow', 'Commands:');
  log('green', '  test, tests    Run all tests');
  log('green', '  demo           Run the full demo');
  log('green', '  connection     Test connection only');
  log('green', '  help           Show this help message\n');
  log('yellow', 'Examples:');
  log('blue', '  node run-tests.js test      # Run all tests');
  log('blue', '  node run-tests.js demo      # Run full demo');
  log('blue', '  node run-tests.js connection # Test connection only');
  log('cyan', '\n🔗 Explorer:');
  log('blue', '  https://explorer.gorbagana.wtf/');
  log('blue', '  All transactions will show explorer URLs for verification');
}

// Main execution
async function main() {
  const command = process.argv[2] || 'test';
  
  switch (command) {
    case 'test':
    case 'tests':
      await runAllTests();
      break;
    
    case 'demo':
      await runBlackjackDemo();
      break;
    
    case 'connection':
      await testProgramConnection();
      break;
    
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    
    default:
      log('red', `Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log('red', `\n❌ Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testProgramConnection,
  testWalletFunding,
  testProgramMethods,
  runBasicTransactionTest,
}; 