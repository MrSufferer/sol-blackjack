# solBlackjack - Zero Knowledge Proofs x Solana


A blackjack game which harnesses Zero Knowledge Proofs(ZKP) for proving the result each round.

### `counter_cnft.rs`

This module defines the Counter cNFT object and provides methods to create and increment it.<br/>
The Counter cNFT is used as the VRF input for every game that a player plays.<br/>
The count always increases after use, ensuring a unique input for every game.<br/>
A player is required to create a Counter cNFT before playing their first game.<br/>
The UI can seemlessly create the Counter cNFT for the user by including the counter creation along with the game creation function in the same PTB.

- `setup/createCounterObjectByPlayer`: Creates a Counter cNFT object for the player. Should only run once if the player does not have a Counter cNFT object.

Used techstack

Backend

    Anchor (Solana)
    Circom
    Socket.io
    nodeJS

Frontend

    Next.js
    Snark.js

Testing

    Chai
    Mocha
