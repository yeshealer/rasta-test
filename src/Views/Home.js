import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import CountUp from 'react-countup';
import getMrastaPrice from '../Hook/getMrastaPrice'
import getContractWeb3 from '../Hook/getContract'
import MasterChefABI from '../ABIs/MasterChefABI.json'
import DividendNFTABI from '../ABIs/DividendNFTABI.json'
import ZionBuilderNFTABI from '../ABIs/ZionBuilderNFTABI.json'
import SinglePoolABI from '../ABIs/SinglePoolABI.json'
import LPABI from '../ABIs/LPABI.json'
import TokenABI from '../ABIs/TokenABI.json'
import getRastaPrice from '../Hook/getRastaPrice'
import getWBNBprice from '../Hook/getWBNBprice'

const Home = () => {
  const currentRef = useRef(null);
  const [rastaPrice, setRastaPrice] = useState(0)
  const [dividendNFTTotalReward, setDividendNFTTotalReward] = useState();
  const [zionBuilderNFTTotalReward, setZionBuilderNFTTotalReward] = useState();
  const [mcPoolLength, setMCPoolLength] = useState();
  const [mcActivePoolLength, setMCActivePoolLength] = useState();
  const [mcActivePoolDetail, setMCActivePoolDetail] = useState([]);
  const MasterChefAddress = "0xec89Be665c851FfBAe2a8Ded03080F3E64116539";
  const DividendNFTAddress = "0xcc406fdA6ea668ca89C0F7a6c70658a875Af082C";
  const ZionBuilderNFTAddress = "0xF5475159CeE27693ad975286Ab51848afA332E27";
  const MasterChefContract = getContractWeb3(MasterChefAddress, MasterChefABI);
  const DividendNFTContract = getContractWeb3(DividendNFTAddress, DividendNFTABI);
  const ZionBuilderNFTContract = getContractWeb3(ZionBuilderNFTAddress, ZionBuilderNFTABI)

  const getDividendNFTTotalReward = async () => {
    const defaultPrice_decimal = await DividendNFTContract.methods.defaultPrice().call();
    const userCount = await DividendNFTContract.methods.totalSupply().call();
    const defaultPrice = defaultPrice_decimal / Math.pow(10, 18);
    return [defaultPrice, userCount]
  }

  const getZionBuilderNFTTotalReward = async () => {
    const totalReward_decimal = await ZionBuilderNFTContract.methods.totalReward().call();
    const rewardRate_decimal = await DividendNFTContract.methods.rewardRate().call();
    const totalReward = totalReward_decimal / Math.pow(10, 18);
    const rewardRate = rewardRate_decimal / Math.pow(10, 18)
    return [totalReward, rewardRate]
  }

  const getPoolLength = async () => {
    const poolLength = await MasterChefContract.methods.poolLength().call();
    return poolLength;
  }

  const getTotalPools = async () => {
    let mcTotalPools = []
    const mcPoolLength = await getPoolLength()
    for (let i = 0; i < mcPoolLength; i++) {
      const rastaPool = await MasterChefContract.methods.poolInfo(i).call()
      mcTotalPools.push(rastaPool)
    }
    return mcTotalPools
  }

  const getActivePools = async () => {
    let mcActivePools = []
    const mcTotalPools = await getTotalPools();
    for (let i = 0; i < mcTotalPools.length; i++) {
      if (mcTotalPools[i].allocPoint > 0) {
        mcActivePools.push(mcTotalPools[i])
      }
    }
    return mcActivePools
  }

  const getActivePoolsDetail = async () => {
    let activePoolsDetail = []
    const mcActivePools = await getActivePools();
    for (let i = 0; i < mcActivePools.length; i++) {
      let activePoolContract;
      try {
        activePoolContract = getContractWeb3(mcActivePools[i].lpToken, LPABI)
        // token0
        const token0 = await activePoolContract.methods.token0().call()
        const token0Contract = getContractWeb3(token0, TokenABI)
        const token0_symbol = await token0Contract.methods.symbol().call()
        let token0_price;
        if (token0_symbol === 'WBNB') {
          const token0_detail = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd`)
          token0_price = token0_detail.data.binancecoin.usd;
        } else if (token0_symbol !== 'MRASTA') {
          const token0_detail = await axios.get(`https://api.pancakeswap.info/api/v2/tokens/${token0}`)
          token0_price = token0_detail.data.data.price;
        } else {
          token0_price = await getMrastaPrice();
        }
        const token0_decimal = await token0Contract.methods.decimals().call()
        const token0_balance_decimal = await token0Contract.methods.balanceOf(mcActivePools[i].lpToken).call()
        const token0_balance = token0_balance_decimal / (Math.pow(10, token0_decimal))
        // token1
        const token1 = await activePoolContract.methods.token1().call()
        const token1Contract = getContractWeb3(token1, TokenABI)
        const token1_symbol = await token1Contract.methods.symbol().call()
        let token1_price;
        if (token1_symbol === 'WBNB') {
          const token1_detail = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd`)
          token1_price = token1_detail.data.binancecoin.usd;
        } else if (token1_symbol !== 'MRASTA') {
          const token1_detail = await axios.get(`https://api.pancakeswap.info/api/v2/tokens/${token1}`)
          token1_price = token1_detail.data.data.price;
        } else {
          token1_price = await getMrastaPrice();
        }
        const token1_decimal = await token1Contract.methods.decimals().call()
        const token1_balance_decimal = await token1Contract.methods.balanceOf(mcActivePools[i].lpToken).call()
        const token1_balance = token1_balance_decimal / (Math.pow(10, token1_decimal))
        // symbol
        const symbol = await activePoolContract.methods.symbol().call()
        // config
        const total_staked_decimal = await activePoolContract.methods.balanceOf(MasterChefAddress).call()
        const total_supply_decimal = await activePoolContract.methods.totalSupply().call()
        const total_staked = total_staked_decimal / Math.pow(10, 18)
        const total_supply = total_supply_decimal / Math.pow(10, 18)
        const TVL = token0_price * token0_balance + token1_price * token1_balance
        const lpPrice = TVL / total_supply

        activePoolsDetail.push({
          lpAddress: mcActivePools[i].lpToken,
          token0: token0_symbol + "=>" + token0,
          token1: token1_symbol + "=>" + token1,
          token0_price: token0_price,
          token1_price: token1_price,
          symbol: token0_symbol + '-' + token1_symbol + ' ' + symbol,
          TVL: TVL,
          lpPrice: lpPrice,
          totalStacked: total_staked
        })
      } catch (error) {
        console.error(error)
        activePoolContract = getContractWeb3(mcActivePools[i].lpToken, SinglePoolABI)
        const tokenAddress = mcActivePools[i].lpToken
        const symbol = await activePoolContract.methods.symbol().call()
        if (symbol !== 'RX') {
          let token_price;
          if (symbol === 'WBNB') {
            const detail = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd`)
            token_price = detail.data.binancecoin.usd;
          } else if (symbol !== 'MRASTA') {
            const detail = await axios.get(`https://api.pancakeswap.info/api/v2/tokens/${tokenAddress}`)
            token_price = detail.data.data.price;
          } else {
            token_price = await getMrastaPrice();
          }
          const decimal = await activePoolContract.methods.decimals().call()
          const balance_decimal = await activePoolContract.methods.balanceOf(MasterChefAddress).call()
          const balance = balance_decimal / (Math.pow(10, decimal))

          const TVL = token_price * balance

          activePoolsDetail.push({
            symbol: symbol,
            lpAddress: mcActivePools[i].lpToken,
            lpPrice: token_price,
            totalStacked: balance,
            TVL: TVL,
            type: 'Single'
          })
        }
      }
    }
    return activePoolsDetail;
  }

  useEffect(() => {
    (async () => {
      const rasta_price = await getRastaPrice();
      const bnb_price = await getWBNBprice();
      setRastaPrice(rasta_price)
      const NFTTotalReward = await getDividendNFTTotalReward();
      setDividendNFTTotalReward(NFTTotalReward[0] * NFTTotalReward[1] * bnb_price);
      const zionNFTTotalReward = await getZionBuilderNFTTotalReward();
      setZionBuilderNFTTotalReward(zionNFTTotalReward[0] / zionNFTTotalReward[1] * rasta_price);
      const mcPoolLength = await getPoolLength();
      setMCPoolLength(mcPoolLength)
      const activePools = await getActivePools();
      setMCActivePoolLength(activePools.length)
      const activePoolDetail = await getActivePoolsDetail();
      setMCActivePoolDetail(activePoolDetail);
    })()
  }, [])

  let TotalValueLocked = 0
  for (let i = 0; i < mcActivePoolDetail.length; i++) {
    TotalValueLocked += mcActivePoolDetail[i].TVL
  }

  const TVL = TotalValueLocked + dividendNFTTotalReward + zionBuilderNFTTotalReward

  return (
    <div className='w-screen flex items-center justify-center h-screen bg-gradient-to-b from-transparent via-cyan-200 to-white'>
      <div className="relative w-full max-w-4xl flex items-center justify-center">
        <div className="absolute top-0 -left-4 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-4 -right-4 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute top-10 right-40 w-80 h-80 bg-rose-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-6000" />
        <div className="absolute -bottom-12 right-72 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        <div className='w-[700px] h-[500px] bg-[#00000030] rounded-2xl filter-blur-1 flex flex-col justify-between p-8'>
          <div>
            <div className='font-[Poppins] animate-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 bg-clip-text text-transparent text-5xl font-black'>Zion Labs TVL</div>
            <div className='mt-6'>
              <div className='filter-blur-1 w-full p-2 px-5 text-purple-500 font-[Poppins] text-xl flex justify-between'>
                DividendNFT Pool TVL
                {dividendNFTTotalReward ? <span className='font-bold tracking-wider'>${dividendNFTTotalReward}</span> : <div className='animate-pulse'><div className='w-24 h-full bg-[#00000040] rounded-md' /></div>}
              </div>
              <div className='filter-blur-1 w-full p-2 px-5 text-purple-500 font-[Poppins] text-xl flex justify-between mt-1'>
                ZionBuildersNFT Pool TVL
                {zionBuilderNFTTotalReward ? <span className='font-bold tracking-wider'>${zionBuilderNFTTotalReward}</span> : <div className='animate-pulse'><div className='w-24 h-full bg-[#00000040] rounded-md' /></div>}
              </div>
              <div className='filter-blur-1 w-full p-2 px-5 text-purple-500 font-[Poppins] text-xl mt-1'>
                <div className='flex justify-between'>
                  Total Pools
                  {mcPoolLength ? <span className='font-bold tracking-wider'>{mcPoolLength}</span> : <div className='animate-pulse'><div className='w-24 h-full bg-[#00000040] rounded-md' /></div>}
                </div>
                <div className='flex justify-between mt-2'>
                  Pools with Multiplier
                  {mcActivePoolLength ? <span className='font-bold tracking-wider'>{mcActivePoolLength}</span> : <div className='animate-pulse'><div className='w-24 h-full bg-[#00000040] rounded-md' /></div>}
                </div>
                <div className='flex justify-between mt-2'>
                  Active Pools
                  {mcActivePoolDetail.length ? <span className='font-bold tracking-wider'>{mcActivePoolDetail.length}</span> : <div className='animate-pulse'><div className='w-24 h-full bg-[#00000040] rounded-md' /></div>}
                </div>
              </div>
            </div>
          </div>
          {TVL ?
            <CountUp
              start={0}
              end={TVL.toFixed(2)}
              duration={1.5}
              separator=" "
              decimals={2}
              decimal="."
              prefix="$"
            >
              {({ countUpRef }) => (
                <div className='w-full flex justify-end'>
                  <span ref={countUpRef} className='text-5xl font-[Poppins] text-orange-500 font-bold text-right' />
                </div>
              )}
            </CountUp>
            :
            <div className='animate-pulse flex w-full justify-end'><div className='w-60 h-12 bg-[#00000040] rounded-md' /></div>
          }
        </div>
      </div>
      {/* <div className='text-[30px] font-bold'>DividendNFT Pool TVL: ${dividendNFTTotalReward}</div>
      <div className='text-[30px] font-bold'>ZionBuildersNFT Pool TVL: ${zionBuilderNFTTotalReward}</div>
      <div className='text-[30px] font-bold'>Total Pools: {mcPoolLength}</div>
      <div className='text-[30px] font-bold'>Pools with Multiplier: {mcActivePoolLength}</div>
      <div className='text-[30px] font-bold'>Active Pools: {mcActivePoolDetail.length}</div>
      <div className='text-[30px] font-bold'>TVL: ${TotalValueLocked + dividendNFTTotalReward + zionBuilderNFTTotalReward}</div>
      <div className='text-[30px] font-bold'>Details:</div>
      {mcActivePoolDetail.map((mcActivePool, index) => {
        if (mcActivePool.type === 'Single') {
          return (
            <div key={index}>
              <div className='text-xl'>PoolName: {mcActivePool.symbol}</div>
              <div className='text-xl'>Token Price: ${mcActivePool.lpPrice}</div>
              <div className='text-xl'>Token Address: {mcActivePool.lpAddress}</div>
              <div className='text-xl'>Total Staked: {mcActivePool.totalStacked}</div>
              <div className='text-xl'>TVL: ${mcActivePool.TVL}</div>
              <div>--------------------------------------------------------------------------------</div>
            </div>
          )
        } else {
          return (
            <div key={index}>
              <div className='text-xl'>LP Name: {mcActivePool.symbol}</div>
              <div className='text-xl'>LP Address: {mcActivePool.lpAddress}</div>
              <div className='text-xl'>Token0: {mcActivePool.token0}</div>
              <div className='text-xl'>Token1: {mcActivePool.token1}</div>
              <div className='text-xl'>Token0 price: ${mcActivePool.token0_price}</div>
              <div className='text-xl'>Token1 price: ${mcActivePool.token1_price}</div>
              <div className='text-xl'>LP price: ${mcActivePool.lpPrice}</div>
              <div className='text-xl'>Total Staked: {mcActivePool.totalStacked}</div>
              <div className='text-xl'>TVL: ${mcActivePool.TVL}</div>
              <div>--------------------------------------------------------------------------------</div>
            </div>
          )
        }
      })} */}
    </div>
  )
}

export default Home