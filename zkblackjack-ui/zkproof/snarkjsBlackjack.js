import { exportCallDataGroth16 } from "./snarkjsZkproof"

export async function blackjackCalldata(player, house) {
  const input = {
    sumPlayer: player,
    sumHouse: house,
  }

  let dataResult

  try {
    dataResult = await exportCallDataGroth16(
      input,
      "/zkproof/blackjack.wasm",
      "/zkproof/blackjack.zkey"
    )

    console.log("dataresult", dataResult)
  } catch (error) {
    console.log(error)
  }

  return dataResult
}
