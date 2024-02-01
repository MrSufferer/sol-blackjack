import Image from "next/image"
import React from "react"

const Rules: React.FC = () => {
  return (
    <div className="w-4/5 md:w-fit lg:max-w-sm bg-gradient-to-b from-gray-900 overflow-hidden to-gray-600  transform transition-all  duration-400 bg-white  rounded-2xl shadow-2xl ">
      <div className="h-full  w-full">
        <Image
          src={"/playerss.svg"}
          className="bg-white rounded-xl"
          layout="responsive"
          objectFit="contain"
          width={385}
          height={230}
          loading="lazy"
        />
      </div>
      <div className="relative mt-2  rounded-lg  ">
        <div className="flex justify-center  text-center items-center pt-4 pb-2.5  ">
          <h3 className="text-2xl text-center text-white tracking-wider font-medium font-pacifico ">
            Game Rules
          </h3>
        </div>
        {/* <hr className="h-0.5 mx-auto w-12 relative bottom-1 bg-gray-400" /> */}
        <ul className="px-6 py-2 text-white space-y-3 text-">
          <li className="font-poppins  text-base">
            Entry fee is <span className="font-semibold ">0.01</span> Goerli
            ETH.
          </li>
          {/* <hr className="h-0.5  relative bottom-1 bg-gray-400" /> */}

          <li className="text-base font-poppins   ">
            If your game score is positive then you will win the game and get
            extra 0.01 Goerli ETH.
          </li>
          <li className="text-base font-poppins   ">
            Only first cards of the opponents can be seen and at the end of the
            round, cards will not shown.
          </li>
          <li className="text-base font-poppins   ">
            The winner of the round will be decided via Zero Knowledge Proofs
          </li>
          <li className="text-base font-poppins  pb-2 ">
            In single player mode; game continues till{" "}
            <span className="font-semibold">1 deck(52 cards)</span> is dealt, in
            multiplayer mode there are{" "}
            <span className="font-semibold">2 decks(104 cards)</span>.
          </li>
        </ul>
      </div>
    </div>

    // <div className="grid grid-cols-2 ">
    //   <div className="w-48 h-48 bg-gradient-to-r from-slate-200 to-slate-300  border-2   rounded-lg shadow-2xl">
    //     Game Rules
    //   </div>
    //   <div className="rounded-xl w-48 h-48 mx-auto   bg-gradient-to-r p-[4px] from-slate-100 via-slate-200 to-slate-300">
    //     <div className="flex flex-col justify-between h-full bg-white text-white rounded-lg p-4"></div>
    //   </div>

    //   <div className="w-48 h-48">asda</div>
    //   <div className="w-48 h-48">asda</div>
    //   <div className="w-48 h-48">asda</div>
    //   <div className="w-48 h-48">asda</div>
    // </div>
  )
}

export default Rules
