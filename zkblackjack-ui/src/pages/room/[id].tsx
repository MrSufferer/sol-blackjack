// Removed ethers import - using Solana instead
import type { NextPage } from "next"
import { useRouter } from "next/router"
import { Game } from "../../components/Game"
import { PublicKey } from "@solana/web3.js"
import { AnchorProvider } from "@coral-xyz/anchor"

interface IProps {
  account: PublicKey
  library: AnchorProvider
  setIsLoading: (val: boolean) => void
  isLoading: boolean
}

const Room: NextPage<IProps> = ({
  account,
  library,
  setIsLoading,
  isLoading,
}) => {
  const router = useRouter()

  const { id } = router.query

  const room = id?.toString() ?? ""

  return (
    <div className="h-screen w-fit lg:overflow-hidden">
      <Game
        setIsLoading={setIsLoading}
        isLoading={isLoading}
        room={room}
        account={account}
        library={library}
      />
    </div>
  )
}

export default Room
