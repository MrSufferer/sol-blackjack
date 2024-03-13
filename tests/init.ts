
/*
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Blackjack } from "../target/types/blackjack";

describe("blackjack-sol", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Blackjack as Program<Blackjack>;

  console.log(program)

  it("Is initialized!", async () => {
    const user = anchor.web3.Keypair.generate();

    // Airdrop SOL to the user to pay for transactions
    await anchor.getProvider().connection.confirmTransaction(
      await anchor.getProvider().connection.requestAirdrop(user.publicKey, 1000000000),
      "confirmed"
    );

    // Derive the address (public key) of the global state account using the program ID and seeds
    const [globalStateAddress, _] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("global_state"))],
        program.programId
      );

    // Send the transaction
    const tx = await program.methods
      .initialize()
      .accounts({
        globalState: globalStateAddress,
        user: user.publicKey,
      })
      .signers([user]) // Include if the global state account needs to sign the transaction
      .rpc();
    console.log("Your transaction signature", tx);
  })
});
*/