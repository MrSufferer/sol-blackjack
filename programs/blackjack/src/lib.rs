use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_lang::system_program;
pub mod psp_accounts;
pub use psp_accounts::*;
pub mod auto_generated_accounts;
pub use auto_generated_accounts::*;
pub mod processor;
pub use processor::*;
pub mod verifying_key_blackjack;
use light_psp4in4out_app_storage::Psp4In4OutAppStorageVerifierState;
pub use verifying_key_blackjack::*;

declare_id!("8SRFsA98f7HikQZusHLEHEqvK26dQXb4XDWSzX2wL8vE");

#[program]
pub mod blackjack {
    use super::*;

    /// This instruction is the first step of a shielded transaction.
    /// It creates and initializes a verifier state account to save state of a verification during
    /// computation verifying the zero-knowledge proof (ZKP). Additionally, it stores other data
    /// such as leaves, amounts, recipients, nullifiers, etc. to execute the protocol logic
    /// in the last transaction after successful ZKP verification. light_verifier_sdk::light_instruction::LightInstruction2

    pub fn light_instruction_first<'a, 'b, 'c, 'info>(
        ctx: Context<
            'a,
            'b,
            'c,
            'info,
            LightInstructionFirst<'info, { VERIFYINGKEY_BLACKJACK.nr_pubinputs }>,
        >,
        inputs: Vec<u8>,
    ) -> Result<()> {
        let inputs_des: InstructionDataLightInstructionFirst =
            InstructionDataLightInstructionFirst::try_deserialize_unchecked(
                &mut [vec![0u8; 8], inputs].concat().as_slice(),
            )?;

        let mut program_id_hash = hash(&ctx.program_id.to_bytes()).to_bytes();
        program_id_hash[0] = 0;

        let mut verifier_state = ctx.accounts.verifier_state.load_init()?;
        verifier_state.signer = *ctx.accounts.signing_address.key;
        let verifier_state_data = Psp4In4OutAppStorageVerifierState {
            nullifiers: inputs_des.input_nullifier,
            leaves: inputs_des.output_commitment.try_into().unwrap(),
            public_amount_spl: inputs_des.public_amount_spl,
            public_amount_sol: inputs_des.public_amount_sol,
            relayer_fee: inputs_des.relayer_fee,
            encrypted_utxos: inputs_des.encrypted_utxos.try_into().unwrap(),
            merkle_root_index: inputs_des.root_index,
        };
        let mut verifier_state_vec = Vec::new();
        Psp4In4OutAppStorageVerifierState::serialize(&verifier_state_data, &mut verifier_state_vec)
            .unwrap();
        verifier_state.verifier_state_data = [verifier_state_vec, vec![0u8; 1024 - 848]]
            .concat()
            .try_into()
            .unwrap();

        verifier_state.checked_public_inputs[0] = program_id_hash;
        verifier_state.checked_public_inputs[1] = inputs_des.transaction_hash;

        Ok(())
    }

    pub fn light_instruction_second<'a, 'b, 'c, 'info>(
        ctx: Context<
            'a,
            'b,
            'c,
            'info,
            LightInstructionSecond<'info, { VERIFYINGKEY_BLACKJACK.nr_pubinputs }>,
        >,
        inputs: Vec<u8>,
    ) -> Result<()> {
        let mut verifier_state = ctx.accounts.verifier_state.load_mut()?;
        inputs.chunks(32).enumerate().for_each(|(i, input)| {
            let mut arr = [0u8; 32];
            arr.copy_from_slice(input);
            verifier_state.checked_public_inputs[2 + i] = arr
        });
        Ok(())
    }

    /// This instruction is the third step of a shielded transaction.
    /// The proof is verified with the parameters saved in the first transaction.
    /// At successful verification protocol logic is executed.
    pub fn light_instruction_third<'a, 'b, 'c, 'info>(
        ctx: Context<
            'a,
            'b,
            'c,
            'info,
            LightInstructionThird<'info, { VERIFYINGKEY_BLACKJACK.nr_pubinputs }>,
        >,
        inputs: Vec<u8>,
    ) -> Result<()> {
        verify_program_proof(&ctx, &inputs)?;
        cpi_verifier_two(&ctx, &inputs)
    }

    /// Close the verifier state to reclaim rent in case the proofdata is wrong and does not verify.
    pub fn close_verifier_state<'a, 'b, 'c, 'info>(
        _ctx: Context<'a, 'b, 'c, 'info, CloseVerifierState<'info, NR_CHECKED_INPUTS>>,
    ) -> Result<()> {
        Ok(())
    }

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.next_game_id = 1; // Starting game ID
        Ok(())
    }

    pub fn start_single_player_game(ctx: Context<StartGame>, bet_amount: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let game = &mut ctx.accounts.game;
        let player = &mut ctx.accounts.player;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.signer.to_account_info().clone(),
                to: ctx.accounts.betting_vault.to_account_info().clone(),
            },
        );
        system_program::transfer(cpi_context, bet_amount)?;

        // Increment the game ID for the next game
        global_state.next_game_id += 1;

        game.game_id = global_state.next_game_id;
        player.game_id = global_state.next_game_id;
        player.bet = bet_amount;

        game.player_one = *ctx.accounts.signer.key;
        game.bet_amount = bet_amount;
        game.is_game_active = true;
        game.is_single_player = true;

        emit!(GameCreated {
            player1_address: *ctx.accounts.signer.key,
            bet: bet_amount,
        });

        Ok(())
    }

    pub fn start_multiplayer_game(ctx: Context<StartGame>, bet_amount: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let game = &mut ctx.accounts.game;

        game.game_id = global_state.next_game_id;
        global_state.next_game_id += 1;

        game.player_one = *ctx.accounts.signer.key;
        game.bet_amount = bet_amount;
        game.is_game_active = true;
        game.is_single_player = false;

        emit!(GameCreated {
            player1_address: *ctx.accounts.signer.key,
            bet: bet_amount,
        });

        Ok(())
    }

    pub fn create_game(ctx: Context<CreateGame>, bet_amount: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let game = &mut ctx.accounts.game;

        game.game_id = global_state.next_game_id;
        global_state.next_game_id += 1; // Prepare the next game ID

        game.player_one = *ctx.accounts.player_one.key;
        game.bet_amount = bet_amount;
        game.is_game_active = true;

        emit!(GameCreated {
            player1_address: *ctx.accounts.player_one.key,
            bet: bet_amount,
        });

        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        if game.bet_amount != ctx.accounts.player.bet {
            return Err(ErrorCode::BetAmountMismatch.into());
        }
        game.player_two = Some(ctx.accounts.player.to_account_info().key());

        emit!(PlayerJoined {
            player2_address: ctx.accounts.player.to_account_info().key(),
            game_id: game.game_id,
        });
        Ok(())
    }

    pub fn end_game(ctx: Context<EndGame>, game_id: u16, final_bet: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        // Placeholder for determining the winner logic
        let winner_address = game.player_one; // Simplified for example purposes
        let player = &mut ctx.accounts.player;
        emit!(GameEnded {
            winner_address,
            total_prize: game.bet_amount * 2,
        });
        game.is_game_active = false;
        player.bet = final_bet;
        Ok(())
    }

    pub fn withdraw_bet(ctx: Context<WithdrawBet>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.game.is_game_active == false,
            ErrorCode::GameActive
        );
        require!(
            ctx.accounts.player.bet >= amount,
            ErrorCode::InsufficientBalance
        );

        // Example for transferring SOL. For SPL tokens, you would use the Token program
        **ctx
            .accounts
            .betting_vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .signer
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        // Reset player's bet or adjust accordingly
        ctx.accounts.player.bet -= amount;

        emit!(GameEnded {
            winner_address: ctx.accounts.player.key(),
            total_prize: amount,
        });

        Ok(())
    }

}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 2, seeds = [b"global_state".as_ref()], bump)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub next_game_id: u16,
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>, // Add this
    #[account(init, payer = player_one, space = 8 + 8 + 8 + 1 + 32 + 32 + 8)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player_one: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Account<'info, Player>,
    // Removed has_one = player_one as it's not correctly applicable here
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Account<'info, Player>,
}

#[derive(Accounts)]
pub struct WithdrawBet<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub betting_vault: Account<'info, BettingVault>,
    #[account(mut)]
    pub signer: Signer<'info>,
    // Include other necessary account references here
}

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init,
        payer = signer,
        space = 8 + 8 + 32 + 32 + 8 + 1 + 1 + 8,
        seeds = [b"game", global_state.next_game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 8, // Adjust space as needed for player account data
        seeds = [b"player", signer.key().as_ref()],
        bump,
    )]
    pub player: Account<'info, Player>,
    #[account(
        init,
        payer = signer,
        seeds = [b"betting_vault", signer.key().as_ref()],
        bump,
        space = 8 + 8 // Adjust the space as needed
    )]
    pub betting_vault: Account<'info, BettingVault>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Game {
    pub game_id: u16,
    pub player_one: Pubkey,
    pub player_two: Option<Pubkey>,
    pub bet_amount: u64,
    pub is_game_active: bool,
    pub is_single_player: bool,
}

#[account]
pub struct Player {
    pub bet: u64,
    pub game_id: u16, // Include other player-related fields
}

#[account]
pub struct BettingVault {
    pub lamports: u64,
}

#[event]
pub struct GameCreated {
    pub player1_address: Pubkey,
    pub bet: u64,
}

#[event]
pub struct PlayerJoined {
    pub player2_address: Pubkey,
    pub game_id: u16,
}

#[event]
pub struct GameEnded {
    pub winner_address: Pubkey,
    pub total_prize: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The bet amount does not match the game's bet amount.")]
    BetAmountMismatch,
    #[msg("Game is currently active.")]
    GameActive,
    #[msg("Insufficient balance.")]
    InsufficientBalance,
    // Add other error codes as necessary
}
