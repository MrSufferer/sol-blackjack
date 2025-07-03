use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 8, // discriminator + authority + next_game_id
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init,
        payer = signer,
        space = 8 + 8 + 32 + 33 + 8 + 1 + 1, // discriminator + game_id + player_one + player_two (Option<Pubkey>) + bet_amount + is_game_active + is_single_player
        seeds = [b"game", global_state.next_game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        init,
        payer = signer,
        space = 8 + 8 + 8, // discriminator + game_id + bet
        seeds = [b"player", signer.key().as_ref(), global_state.next_game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init,
        payer = player_one,
        space = 8 + 8 + 32 + 33 + 8 + 1 + 1, // discriminator + game_id + player_one + player_two (Option<Pubkey>) + bet_amount + is_game_active + is_single_player
        seeds = [b"game", global_state.next_game_id.to_le_bytes().as_ref()],
        bump
    )]
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
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawBet<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub next_game_id: u64,
}

#[account]
pub struct Game {
    pub game_id: u64,
    pub player_one: Pubkey,
    pub player_two: Option<Pubkey>,
    pub bet_amount: u64,
    pub is_game_active: bool,
    pub is_single_player: bool,
}

#[account]
pub struct Player {
    pub game_id: u64,
    pub bet: u64,
}

#[event]
pub struct GameCreated {
    pub player1_address: Pubkey,
    pub bet: u64,
}

#[event]
pub struct PlayerJoined {
    pub player2_address: Pubkey,
    pub game_id: u64,
}

#[event]
pub struct GameEnded {
    pub game_id: u64,
    pub final_bet: u64,
}
