use anchor_lang::prelude::*;
use anchor_lang::system_program;
pub mod processor;
pub use processor::*;

declare_id!("5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny");

#[program]
pub mod blackjack {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.global_state.authority = *ctx.accounts.signer.key;
        ctx.accounts.global_state.next_game_id = 1; // Starting game ID
        Ok(())
    }

    pub fn start_single_player_game(ctx: Context<StartGame>, bet_amount: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let player = &mut ctx.accounts.player;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.signer.to_account_info().clone(),
                to: ctx.accounts.game.to_account_info().clone(),
            },
        );
        system_program::transfer(cpi_context, bet_amount)?;

        // Increment the game ID for the next game
        global_state.next_game_id += 1;

        let game = &mut ctx.accounts.game;

        game.game_id = global_state.next_game_id;
        player.game_id = global_state.next_game_id;
        player.bet = bet_amount;

        game.player_one = *ctx.accounts.signer.key;
        game.bet_amount = bet_amount;
        game.is_game_active = true;

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

    pub fn end_game(ctx: Context<EndGame>, game_id: u64, final_bet: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.is_game_active = false;

        emit!(GameEnded {
            game_id: game_id,
            final_bet: final_bet,
        });
        Ok(())
    }

    pub fn withdraw_bet(ctx: Context<WithdrawBet>, amount: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        if game.is_game_active {
            return Err(ErrorCode::GameActive.into());
        }
        if **game.to_account_info().lamports.borrow() < amount {
            return Err(ErrorCode::InsufficientBalance.into());
        }

        **game.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }
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
