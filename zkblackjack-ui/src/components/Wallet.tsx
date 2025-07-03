import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import React from "react"

export const Wallet: React.FC = () => {
  const { publicKey, connected } = useWallet()

  return (
    <div>
      <WalletMultiButton 
        className="focus:outline-none font-poppins z-30 whitespace-nowrap text-white font-medium rounded-lg text-sm px-3 md:px-5 py-2.5 text-center mr-3  bg-[#ea5959] transition duration-300 ease-in-out hover:bg-[#de4646] focus:ring-blue-800"
      />
    </div>
  )
}
