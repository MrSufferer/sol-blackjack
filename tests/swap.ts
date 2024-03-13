import * as anchor from "@coral-xyz/anchor";
import {
  Utxo,
  Provider as LightProvider,
  confirmConfig,
  Action,
  TestRelayer,
  User,
  airdropSol,
  STANDARD_SHIELDED_PUBLIC_KEY,
  BN_0,
  PspTransactionInput,
  TransactionParameters,
  MerkleTreeConfig,
  IDL_LIGHT_PSP4IN4OUT_APP_STORAGE,
  getVerifierStatePda,
  createProofInputs,
  getSystemProof,
  setUndefinedPspCircuitInputsToZero,
  SolanaTransactionInputs,
  Provider,
  sendAndConfirmShieldedTransaction,
  ConfirmOptions,
  airdropSplToAssociatedTokenAccount,
  MINT,
  hashAndTruncateToCircuit,
  createTestAccounts,
} from "@lightprotocol/zk.js";

import { SystemProgram, PublicKey, Keypair, Connection } from "@solana/web3.js";

import { buildPoseidonOpt } from "circomlibjs";
import { BN } from "@coral-xyz/anchor";
import { IDL } from "../target/types/swaps";
const path = require("path");

const verifierProgramId = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
);
import { assert } from "chai";

let POSEIDON: any, RELAYER: TestRelayer;
const RPC_URL = "http://127.0.0.1:8899";
const usdcDecimals = 1e2;

/**
 * Creates a test user with airdropped lamports.
 * @param connection
 * @param lamports
 * @param shieldedSol
 * @returns
 */
const createTestUser = async (
  connection: Connection,
  lamports: number,
  shieldedSol?: number,
  shieldedUSDC?: number,
): Promise<User> => {
  let wallet = Keypair.generate();
  await airdropSol({
    connection,
    lamports,
    recipientPublicKey: wallet.publicKey,
  });

  const lightProvider: Provider = await LightProvider.init({
    wallet,
    url: RPC_URL,
    relayer: RELAYER,
    confirmConfig,
  });
  let user: User = await User.init({ provider: lightProvider });
  if (shieldedSol) {
    await user.shield({
      token: "SOL",
      publicAmountSol: shieldedSol,
    });
  }
  if(shieldedUSDC) {
    await airdropSplToAssociatedTokenAccount(
      connection,
      shieldedUSDC * 1e2,
      user.account.solanaPublicKey!,
    );
    await user.shield({
      token: "USDC",
      publicAmountSpl: shieldedUSDC,
    });
  }
  return user;
};

describe("Test swaps", () => {
  process.env.ANCHOR_PROVIDER_URL = RPC_URL;
  process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

  const provider = anchor.AnchorProvider.local(RPC_URL, confirmConfig);
  anchor.setProvider(provider);

  before(async () => {
    POSEIDON = await buildPoseidonOpt();
    const relayerWallet = Keypair.generate();
    await airdropSol({
      connection: provider.connection,
      lamports: 1e11,
      recipientPublicKey: relayerWallet.publicKey,
    });
    RELAYER = new TestRelayer({
      relayerPubkey: relayerWallet.publicKey,
      relayerRecipientSol: relayerWallet.publicKey,
      relayerFee: new BN(100000),
      payer: relayerWallet,
    });
    // Creates test accounts, among others the token MINT
    await createTestAccounts(provider.connection);
  });

  /**
   * Swap Take Offer Instruction Execution Example
   * 1. Setup: create and fund Alice and Bob users.
   * 2. Alice: creates offer utxo, to swap 10 sol for 300 USDC.
   * 3. Bob: fetches and decrypt offer.
   * 4. Bob: creates utxos and transaction parameters to accept and settle the swap.
   * 5. Bob: generates the system proof (proves valid state transitions).
   * 6. Bob: generates the PSP proof.
   * 5. Bob: creates solana transactions to execute the PSP transaction.
   */
  it("Swap Take functional", async () => {
    /**
     * Step 1: Setup: create and fund alice and bob users.
     * ---------------------------------------------------
     * Creates Alice and Bob users with random keypairs and 100 airdropped sol.
     */
    const aliceUser: User = await createTestUser(provider.connection, 100e9);
    const bobUser: User = await createTestUser(provider.connection, 100e9);

    /**
     * Alice shields 10 sol to fund her shielded account.
     */
    await aliceUser.shield({
      token: "SOL",
      publicAmountSol: 10,
      confirmOptions: ConfirmOptions.finalized,
    });

    /**
     * Airdrop 400 usdc to Bob.
     */
    await airdropSplToAssociatedTokenAccount(
      provider.connection,
      400 * usdcDecimals,
      bobUser.account.solanaPublicKey!,
    );

    /**
     * Bob shields 6 sol and 400 USDC to fund his shielded account.
     */
    await bobUser.shield({
      token: "USDC",
      publicAmountSpl: 400,
      publicAmountSol: 6,
    });

    /**
     * Step 2: Alice: create offer utxo, to swap 10 sol for 300 USDC.
     * ---------------------------------------------------
     * Create offer utxo, to swap 10 sol for 300 USDC.
     * The amount to be traded is store in the utxos amounts field.
     * The utxo data determines the trade parameters:
     *    - priceSol: 0 sol (Is zero since price is in USDC)
     *    - priceSpl: 300
     *    - splAsset: USDC (the hashed and truncated mint address, so that it is smaller than the circuit field size)
     *    - recipient: is the maker (alice user public key)
     * - publicKey: publicSTANDARD_SHIELDED_PUBLIC_KEY is used so that the taker (Bob) can sign the utxo.
     * - encryptionPublicKey: is the public key of the taker (Bob) so that he can decrypt the utxo.
     * - verifierAddress: is the address of the PSP. (This program utxo can only be spent by the PSP.)
     */
    let offerUtxo = new Utxo({
      poseidon: POSEIDON,
      assets: [SystemProgram.programId],
      publicKey: STANDARD_SHIELDED_PUBLIC_KEY,
      encryptionPublicKey: bobUser.account.encryptionKeypair.publicKey,
      amounts: [new BN(1e10)],
      appData: {
        priceSol: new BN(0),
        priceSpl: new BN(400 * usdcDecimals),
        splAsset: hashAndTruncateToCircuit(MINT.toBytes()),
        recipient: aliceUser.account.pubkey,
        recipientEncryptionPublicKey: new BN(
          aliceUser.account.encryptionKeypair.publicKey,
        ),
      },
      appDataIdl: IDL,
      verifierAddress: verifierProgramId,
      assetLookupTable: aliceUser.provider.lookUpTables.assetLookupTable,
    });

    /**
     * Insert the offer utxo into Light Protocol state.
     * Store the encrypted offer utxo onchain into compressed account.
     * Under the hood this method creates a shielding transaction,
     * generates a proof and executes the solana transaction.
     */
    let txHashMakeOffer = await aliceUser.storeAppUtxo({
      appUtxo: offerUtxo,
      action: Action.SHIELD,
    });
    console.log("Made encrypted offer signature: ", txHashMakeOffer);





    /**
     * Step 3: Bob: fetch and decrypt offer.
     * ---------------------------------------------------
     * Fetch the encrypted offer utxo from the compressed account.
     * Decrypt the offer utxo.
     * syncStorage syncs
     */
    let syncedStorage = await bobUser.syncStorage(IDL, false);
    await bobUser.provider.latestMerkleTree();

    let fetchedOfferUtxo = Array.from(
      syncedStorage
        .get(verifierProgramId.toBase58())
        .tokenBalances.get(SystemProgram.programId.toBase58())
        .utxos.values(),
    )[0];

    fetchedOfferUtxo.publicKey = STANDARD_SHIELDED_PUBLIC_KEY;
    offerUtxo.index = fetchedOfferUtxo.index;
    Utxo.equal(POSEIDON, offerUtxo, fetchedOfferUtxo);

    console.log(
      `Successfully fetched and decrypted offer: priceSol ${fetchedOfferUtxo.appData.priceSol.toString()}, offer sol amount: ${fetchedOfferUtxo.amounts[0].toString()} \n recipient public key: ${fetchedOfferUtxo.appData.recipient.toString()}\n`,
    );





    /**
     * Step 4: Bob: creates utxos and transaction parameters to accept and settle the swap.
     * ---------------------------------------------------
     */

    const offerRewardUtxo = new Utxo({
      poseidon: POSEIDON,
      publicKey: fetchedOfferUtxo.appData.recipient,
      encryptionPublicKey: Uint8Array.from(
        fetchedOfferUtxo.appData.recipientEncryptionPublicKey.toArray(),
      ),
      assetLookupTable: bobUser.provider.lookUpTables.assetLookupTable,
      amounts: [new BN(0), offerUtxo.appData.priceSpl],
      assets: [SystemProgram.programId, MINT],
      blinding: fetchedOfferUtxo.blinding,
    });

    /**
     * tradeOutputUtxo is a native utxo which holds sol and is owned by Bob.
     */
    const tradeOutputUtxo = new Utxo({
      poseidon: POSEIDON,
      publicKey: fetchedOfferUtxo.appData.recipient,
      assetLookupTable: bobUser.provider.lookUpTables.assetLookupTable,
      amounts: [fetchedOfferUtxo.amounts[0]],
      assets: [SystemProgram.programId],
    });

    /**
     * feeUtxo is a native utxo which holds sol.
     * It is used to pay for the trade result the relayer fee.
     */
    const feeUtxo = bobUser.getAllUtxos()[0];

    /**
     * changeUtxo is a native utxo which holds sol, and USDC.
     * It is used to return the change amounts to Bob.
     * The change amounts are the difference between the offer amount and the trade amount.
     */
    const changeAmountSol = feeUtxo.amounts[0].sub(RELAYER.relayerFee);
    const changeAmountSpl = feeUtxo.amounts[1].sub(
      fetchedOfferUtxo.appData.priceSpl,
    );

    const changeUtxo = new Utxo({
      poseidon: POSEIDON,
      publicKey: fetchedOfferUtxo.appData.recipient,
      assetLookupTable: bobUser.provider.lookUpTables.assetLookupTable,
      amounts: [changeAmountSol, changeAmountSpl],
      assets: [SystemProgram.programId, MINT],
    });

    /**
     * Path to the compiled circuit.
     * build-circuit is the default path.
     */
    const circuitPath = path.join("build-circuit");

    /**
     * pspTransactionInput bundles transaction inputs for the PSP transaction.
     * - we want to execute the takeOfferInstruction, thus we set:
     *   - takeOfferInstruction to 1
     *   - other proof inputs are either taken from the utxos defined
     *     or set as zero with setUndefinedPspCircuitInputsToZero
     *   - checkedInUtxos defines the offer utxo and
     * Input Utxos:
     * - the fee utxo adds the funds Bob uses to pay for the trade
     * - the offer utxo is the utxo Bob wants to take
     * Output Utxos:
     * - the trade output utxo holds the trade proceeds of Alice
     * - the change utxo holds the change amounts not required in the trade or to pay the relayer
     */
    const pspTransactionInput: PspTransactionInput = {
      proofInputs: {
        takeOfferInstruction: new BN(1),
      },
      path: circuitPath,
      verifierIdl: IDL,
      circuitName: "swaps",
      checkedInUtxos: [{ utxoName: "offerUtxo", utxo: fetchedOfferUtxo }],
      checkedOutUtxos: [{ utxoName: "offerRewardUtxo", utxo: offerRewardUtxo }],
      inUtxos: [feeUtxo],
      outUtxos: [changeUtxo, tradeOutputUtxo],
    };

    const inputUtxos = [fetchedOfferUtxo, feeUtxo];
    const outputUtxos = [changeUtxo, tradeOutputUtxo, offerRewardUtxo];

    const txParams = new TransactionParameters({
      inputUtxos,
      outputUtxos,
      transactionMerkleTreePubkey: MerkleTreeConfig.getTransactionMerkleTreePda(
        new BN(0),
      ),
      eventMerkleTreePubkey: MerkleTreeConfig.getEventMerkleTreePda(new BN(0)),
      action: Action.TRANSFER,
      poseidon: POSEIDON,
      relayer: RELAYER,
      verifierIdl: IDL_LIGHT_PSP4IN4OUT_APP_STORAGE,
      account: bobUser.account,
      verifierState: getVerifierStatePda(
        verifierProgramId,
        RELAYER.accounts.relayerPubkey,
      ),
    });

    await txParams.getTxIntegrityHash(POSEIDON);

    /**
     * Creates the proof inputs for the PSP and system proofs of the PSP transaction.
     */
    const proofInputs = createProofInputs({
      poseidon: POSEIDON,
      transaction: txParams,
      pspTransaction: pspTransactionInput,
      account: bobUser.account,
      solMerkleTree: bobUser.provider.solMerkleTree,
    });





    /**
     * Step 5: Bob: generates the system proof.
     * ---------------------------------------------------
     * The system proof proves the correct spending of input and creation of output utxos.
     * Input utxos have to exists in the protocol state.
     * Output utxos' asset amounts have to match the sums and assets of the input utxos.
     */
    const systemProof = await getSystemProof({
      account: bobUser.account,
      transaction: txParams,
      systemProofInputs: proofInputs,
    });





    /**
     * Step 6: Bob: generates the PSP proof.
     * ---------------------------------------------------
     * The PSP proof proves the PSP logic.
     * In this case it enforces the constraints that an offer utxo
     * can only be spent if a reward utxo exists for which the offer utxo data matches.
     */
    const completePspProofInputs = setUndefinedPspCircuitInputsToZero(
      proofInputs,
      IDL,
      pspTransactionInput.circuitName,
    );
    const pspProof = await bobUser.account.getProofInternal(
      pspTransactionInput.path,
      pspTransactionInput,
      completePspProofInputs,
      false,
    );






    /**
     * Step 7: Bob: creates solana transactions to execute the PSP transaction.
     * ---------------------------------------------------
     * Create solana transactions.
     * We send 3 transactions because it is too much data for one solana transaction
     * (max 1232 bytes per solana tx).
     */
    const solanaTransactionInputs: SolanaTransactionInputs = {
      systemProof,
      pspProof,
      transaction: txParams,
      pspTransactionInput,
    };

    /**
     * Creates the solana instructions, sends these to the relayer (in this test the test relayer),
     * and waits for confirmation.
     * 
     * Shielded transactions are executed by a relayer.
     * The relayer pays the fees for the solana transactions so that the user does not need to hold sol.
     * Additionally, if a user pays for solana transactions it would create a link between the user's actions.
     * The relayer is a service provider which executes the solana transactions for many users
     * therefore it does not create a link for a specific user.
     * The relayer is trustless because if any transaction information changes the proof will be invalid.
     */
    const shieldedTransactionConfirmation =
      await sendAndConfirmShieldedTransaction({
        solanaTransactionInputs,
        provider: bobUser.provider,
        confirmOptions: ConfirmOptions.spendable,
      });
    console.log(
      "Take offer tx Hash : ",
      shieldedTransactionConfirmation.txHash,
    );

    /**
     * Get the balance of Bob.
     * The balance should contain:
     * - trade output utxo
     * - change utxo.
     */
    await bobUser.getBalance();
    assert(bobUser.getUtxo(changeUtxo.getCommitment(POSEIDON)) !== undefined);
    assert(
      bobUser.getUtxo(tradeOutputUtxo.getCommitment(POSEIDON)) !== undefined,
    );

    /**
     * Get the balance of Alice.
     * The inbox balance should contain:
     * - offer reward utxo
     *
     * We need to check the inbox balance because the utxo was encrypted asymetrically to Alice.
     * To make the utxo part of the spendable balance Alice needs to accept the utxo.
     */
    let aliceUtxoInbox = await aliceUser.getUtxoInbox();
    console.log("Alice utxo inbox ", aliceUtxoInbox);
    assert.equal(
      aliceUtxoInbox.totalSolBalance.toNumber(),
      offerUtxo.appData.priceSol.toNumber(),
    );
  });


  /**
   * Swap Cancel Instruction Execution Example:
   * 1. Create alice and bob Users
   * 2. alice user creates offer
   *    - creates utxo
   *    - encrypts it to herself (since this is just a test)
   *    - stores the encrypted utxo onchain in a compressed account
   * 3. alice generates cancel proof
   * 4. alice cancels the offer
   */
  // it("Swap Cancel functional", async () => {
  //   const aliceUser: User = await createTestUser(provider.connection, 100e9);

  //   let offerUtxo = new Utxo({
  //     poseidon: POSEIDON,
  //     assets: [SystemProgram.programId],
  //     publicKey: STANDARD_SHIELDED_PUBLIC_KEY,
  //     encryptionPublicKey: aliceUser.account.encryptionKeypair.publicKey,
  //     amounts: [new BN(1e10)],
  //     appData: {
  //       priceSol: new BN(0),
  //       priceSpl: new BN(400 * 1e2),
  //       splAsset: hashAndTruncateToCircuit(MINT.toBytes()),
  //       recipient: aliceUser.account.pubkey,
  //       recipientEncryptionPublicKey: new BN(
  //         aliceUser.account.encryptionKeypair.publicKey,
  //       ),
  //     },
  //     appDataIdl: IDL,
  //     verifierAddress: verifierProgramId,
  //     assetLookupTable: aliceUser.provider.lookUpTables.assetLookupTable,
  //   });

  //   let txHashMakeOffer = await aliceUser.storeAppUtxo({
  //     appUtxo: offerUtxo,
  //     action: Action.SHIELD,
  //   });
  //   console.log("made offer: ", txHashMakeOffer);

  //   let syncedStorage = await aliceUser.syncStorage(IDL, false);
  //   await aliceUser.provider.latestMerkleTree();

  //   let fetchedOfferUtxo = Array.from(
  //     syncedStorage
  //       .get(verifierProgramId.toBase58())
  //       .tokenBalances.get(SystemProgram.programId.toBase58())
  //       .utxos.values(),
  //   )[0];

  //   fetchedOfferUtxo.publicKey = STANDARD_SHIELDED_PUBLIC_KEY;
  //   offerUtxo.index = fetchedOfferUtxo.index;
  //   Utxo.equal(POSEIDON, offerUtxo, fetchedOfferUtxo);

  //   console.log(
  //     `Successfully fetched and decrypted offer: priceSol ${fetchedOfferUtxo.appData.priceSol.toString()}, offer sol amount: ${fetchedOfferUtxo.amounts[0].toString()} \n recipient public key: ${fetchedOfferUtxo.appData.recipient.toString()}`,
  //   );
  //   const circuitPath = path.join("build-circuit");

  //   const cancelOutputUtxo = new Utxo({
  //     poseidon: POSEIDON,
  //     publicKey: fetchedOfferUtxo.appData.recipient,
  //     assetLookupTable: aliceUser.provider.lookUpTables.assetLookupTable,
  //     amounts: [
  //       offerUtxo.amounts[0].sub(aliceUser.provider.relayer.relayerFee),
  //     ],
  //     assets: [SystemProgram.programId],
  //   });

  //   const emptySignerUtxo = new Utxo({
  //     poseidon: POSEIDON,
  //     publicKey: aliceUser.account.pubkey,
  //     assetLookupTable: aliceUser.provider.lookUpTables.assetLookupTable,
  //     amounts: [BN_0],
  //     assets: [SystemProgram.programId],
  //   });

  //   const pspTransactionInput: PspTransactionInput = {
  //     proofInputs: {
  //       cancelInstruction: new BN(1),
  //     },
  //     path: circuitPath,
  //     verifierIdl: IDL,
  //     circuitName: "swaps",
  //     checkedInUtxos: [
  //       { utxoName: "offerUtxo", utxo: fetchedOfferUtxo },
  //       { utxoName: "cancelSignerUtxo", utxo: emptySignerUtxo },
  //     ],
  //     outUtxos: [cancelOutputUtxo],
  //   };

  //   const inputUtxos = [fetchedOfferUtxo, emptySignerUtxo];
  //   const outputUtxos = [cancelOutputUtxo];

  //   const txParams = new TransactionParameters({
  //     inputUtxos,
  //     outputUtxos,
  //     transactionMerkleTreePubkey: MerkleTreeConfig.getTransactionMerkleTreePda(
  //       new BN(0),
  //     ),
  //     eventMerkleTreePubkey: MerkleTreeConfig.getEventMerkleTreePda(new BN(0)),
  //     action: Action.TRANSFER,
  //     poseidon: POSEIDON,
  //     relayer: RELAYER,
  //     verifierIdl: IDL_LIGHT_PSP4IN4OUT_APP_STORAGE,
  //     account: aliceUser.account,
  //     verifierState: getVerifierStatePda(
  //       verifierProgramId,
  //       RELAYER.accounts.relayerPubkey,
  //     ),
  //   });

  //   await txParams.getTxIntegrityHash(POSEIDON);

  //   /**
  //    * Proves PSP logic
  //    * returns proof and it's public inputs
  //    */

  //   const proofInputs = createProofInputs({
  //     poseidon: POSEIDON,
  //     transaction: txParams,
  //     pspTransaction: pspTransactionInput,
  //     account: aliceUser.account,
  //     solMerkleTree: aliceUser.provider.solMerkleTree,
  //   });

  //   const systemProof = await getSystemProof({
  //     account: aliceUser.account,
  //     transaction: txParams,
  //     systemProofInputs: proofInputs,
  //   });

  //   /**
  //    * Proves PSP logic
  //    * returns proof and it's public inputs
  //    */

  //   const completePspProofInputs = setUndefinedPspCircuitInputsToZero(
  //     proofInputs,
  //     IDL,
  //     pspTransactionInput.circuitName,
  //   );
  //   const pspProof = await aliceUser.account.getProofInternal(
  //     pspTransactionInput.path,
  //     pspTransactionInput,
  //     completePspProofInputs,
  //     false,
  //   );
  //   /**
  //    * Create solana transactions.
  //    * We send 3 transactions because it is too much data for one solana transaction (max 1232 bytes).
  //    * Data:
  //    * - systemProof: 256 bytes,
  //    * - pspProof: 256 bytes,
  //    * - systemProofPublicInputs:
  //    * -
  //    */
  //   const solanaTransactionInputs: SolanaTransactionInputs = {
  //     systemProof,
  //     pspProof,
  //     transaction: txParams,
  //     pspTransactionInput,
  //   };

  //   const res = await sendAndConfirmShieldedTransaction({
  //     solanaTransactionInputs,
  //     provider: aliceUser.provider,
  //     confirmOptions: ConfirmOptions.spendable,
  //   });
  //   console.log("tx Hash : ", res.txHash);

  //   // check that the utxos are part of the users balance now
  //   const balance = await aliceUser.getBalance();
  //   assert(
  //     aliceUser.getUtxo(cancelOutputUtxo.getCommitment(POSEIDON)) !==
  //       undefined,
  //   );
  //   assert.equal(
  //     balance.totalSolBalance.toNumber(),
  //     cancelOutputUtxo.amounts[0].toNumber(),
  //   );
  // });
});