import React from "react"
import { Wallet } from "./Wallet"
import { ethers } from "ethers"
import Link from "next/link"
import { useRouter } from "next/router"

interface IProps {
  account: string
  setAccount: (val: string) => void
  setProvider: any
  provider: any
  library: ethers.providers.Web3Provider
  setLibrary: (val: ethers.providers.Web3Provider) => void
}

export const Navbar: React.FC<IProps> = ({
  account,
  setAccount,
  setProvider,
  provider,
  setLibrary,
  library,
}) => {
  const router = useRouter()

  //tooltip rules for game pages

  return (
    <div className=" fixed z-10 top-0 w-full grid grid-cols-3 my-2 mx-1.5 md:mx-2 justify-center items-center">
      <Link href={"/"}>
        <h1 className="cursor-pointer text-3xl col-start-1 font-lobster text-white leading-normal font-bold  ">
          zkBlackjack
        </h1>
      </Link>

      <div className="col-start-3 text-end ">
        {/* {router.pathname !== "/" ? (
          <div className="w-full px-4 sm:w-1/2 lg:w-1/4">
            <div className="mb-14">
              <div className="group relative inline-block">
                <button className="bg-primary font-poppins inline-flex rounded py-2 px-[18px] text-base font-semibold text-white">
                  Rules
                </button>
                <div className="border-light text-body-color absolute top-full left-1/2 z-20 mt-3 -translate-x-1/2 whitespace-nowrap rounded border bg-white py-[6px] px-4 text-sm font-semibold opacity-0 group-hover:opacity-100">
                  <span className="border-light absolute -top-1 left-1/2 -z-10 h-2 w-2 -translate-x-1/2 rotate-45 rounded-sm border-t border-l bg-white"></span>
                  Tooltip Text
                </div>
              </div>
            </div>
          </div>
        ) : (
          ""
        )} */}
        <Wallet
          account={account}
          setAccount={setAccount}
          setProvider={setProvider}
          provider={provider}
          setLibrary={setLibrary}
          library={library!}
        />
      </div>
    </div>
  )
}
