use anchor_lang::prelude::*;

declare_id!("8SRFsA98f7HikQZusHLEHEqvK26dQXb4XDWSzX2wL8vE");

#[program]
pub mod blackjack {
    use super::*;

    /*
    // Assuming you have a verifier program deployed on Solana
    const VERIFIER_PROGRAM_ID: &str = "VerifierProgramPubkeyHere";

    pub fn verify_round_win(ctx: Context<VerifyRoundWin>, proof: Proof) -> Result<()> {
        // Construct the message to send to the verifier program
        // This part depends on how your verifier program expects to receive data
        let verifier_program_id = Pubkey::from_str(VERIFIER_PROGRAM_ID).unwrap();
        let ix = Instruction {
            program_id: verifier_program_id,
            accounts: vec![/* Accounts needed by the verifier */],
            data: proof.to_bytes(), // Convert your proof data to a byte vector
        };

        // Simulate a cross-program invocation to the verifier
        // Note: Actual implementation may vary based on your verifier's API
        solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player.to_account_info(),
                // Add other accounts as required by the verifier
            ],
        )?;

        Ok(())
    }
    */
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.next_game_id = 1; // Starting game ID
        Ok(())
    }

    pub fn start_single_player_game(ctx: Context<StartGame>, bet_amount: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let game = &mut ctx.accounts.game;

        game.game_id = global_state.next_game_id;
        global_state.next_game_id += 1;

        game.player_one = *ctx.accounts.player.key;
        game.bet_amount = bet_amount;
        game.is_game_active = true;
        game.is_single_player = true;

        emit!(GameCreated {
            player1_address: *ctx.accounts.player.key,
            bet: bet_amount,
        });

        Ok(())
    }

    pub fn start_multiplayer_game(ctx: Context<StartGame>, bet_amount: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let game = &mut ctx.accounts.game;

        game.game_id = global_state.next_game_id;
        global_state.next_game_id += 1;

        game.player_one = *ctx.accounts.player.key;
        game.bet_amount = bet_amount;
        game.is_game_active = true;
        game.is_single_player = false;

        emit!(GameCreated {
            player1_address: *ctx.accounts.player.key,
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
    

    pub fn end_game(ctx: Context<EndGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        // Placeholder for determining the winner logic
        let winner_address = game.player_one; // Simplified for example purposes
        emit!(GameEnded {
            winner_address,
            total_prize: game.bet_amount * 2,
        });
        game.is_game_active = false;
        Ok(())
    }

    pub fn withdraw_bet(ctx: Context<WithdrawBet>, amount: u64) -> Result<()> {
        require!(ctx.accounts.game.is_game_active == false, ErrorCode::GameActive);
        require!(ctx.accounts.player.bet >= amount, ErrorCode::InsufficientBalance);
    
        // Example for transferring SOL. For SPL tokens, you would use the Token program
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += amount;
    
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
}

#[derive(Accounts)]
pub struct WithdrawBet<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Account<'info, Player>,
    // Include other necessary account references here
}

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    #[account(init, payer = player, space = 8 + 8 + 32 + 32 + 8 + 1 + 1 + 2)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Signer<'info>,
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
    // Include other player-related fields
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

