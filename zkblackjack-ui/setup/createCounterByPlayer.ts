
import {
    Keypair,
    PublicKey,
    Connection,
    Transaction,
    sendAndConfirmTransaction,
    TransactionInstruction,
  } from "@solana/web3.js";
  
  import {
    SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    SPL_NOOP_PROGRAM_ID,
  } from "@solana/spl-account-compression";
  
  import {
    PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
    MetadataArgs,
    createMintToCollectionV1Instruction,
  } from "@metaplex-foundation/mpl-bubblegum";
  
  import {
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  } from "@metaplex-foundation/mpl-token-metadata";
  
  export async function mintCompressedNFT(
    connection: Connection,
    payer: Keypair,
    treeAddress: PublicKey,
    collectionMint: PublicKey,
    collectionMetadata: PublicKey,
    collectionMasterEditionAccount: PublicKey,
    compressedNFTMetadata: MetadataArgs,
    receiverAddress?: PublicKey
  ) {
    const [treeAuthority, ] = PublicKey.findProgramAddressSync([treeAddress.toBuffer()], BUBBLEGUM_PROGRAM_ID);
  
    const [bubblegumSigner, ] = PublicKey.findProgramAddressSync(
      [Buffer.from("collection_cpi", "utf8")],
      BUBBLEGUM_PROGRAM_ID
    );
  
    const mintInstructions: TransactionInstruction[] = [];
  
    const metadataArgs = Object.assign(compressedNFTMetadata, {
      collection: { key: collectionMint, verified: false },
    });
  
    mintInstructions.push(
      createMintToCollectionV1Instruction(
        {
          payer: payer.publicKey,
  
          merkleTree: treeAddress,
          treeAuthority,
          treeDelegate: payer.publicKey,
          leafOwner: receiverAddress || payer.publicKey,
          leafDelegate: payer.publicKey,
  
          collectionAuthority: payer.publicKey,
          collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,
          collectionMint: collectionMint,
          collectionMetadata: collectionMetadata,
          editionAccount: collectionMasterEditionAccount,
  
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          bubblegumSigner: bubblegumSigner,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        },
        {
          metadataArgs,
        }
      )
    );
  
    try {
      const txt = new Transaction().add(...mintInstructions);
  
      txt.feePayer = payer.publicKey;
  
      const transactionSignature = await sendAndConfirmTransaction(connection, txt, [payer], {
        commitment: "confirmed",
        skipPreflight: true,
      });
  
      console.log(`Successfully minted a cNFT with the txt sig: ${transactionSignature}`);
  
    } catch (error: any) {
      console.error(`Failed to mint cNFT with error: ${error}`);
    }
  }
  