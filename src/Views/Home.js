import React, { useEffect, useState } from 'react'
import axios from 'axios'
import getMrastaPrice from '../Hook/getMrastaPrice'
import getContractWeb3 from '../Hook/getContract'
import MasterChefABI from '../ABIs/MasterChefABI.json'
import SinglePoolABI from '../ABIs/SinglePoolABI.json'
import LPABI from '../ABIs/LPABI.json'
import TokenABI from '../ABIs/TokenABI.json'

const Home = () => {
  const [mcPoolLength, setMCPoolLength] = useState(0);
  const [mcActivePoolLength, setMCActivePoolLength] = useState(0);
  const [mcActivePoolDetail, setMCActivePoolDetail] = useState([]);
  const MasterChefAddress = "0xec89Be665c851FfBAe2a8Ded03080F3E64116539";
  const MasterChefContract = getContractWeb3(MasterChefAddress, MasterChefABI);

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
        console.log(activePoolsDetail)
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

  return (
    <div>
      <div className='text-[30px] font-bold'>Total Pools: {mcPoolLength}</div>
      <div className='text-[30px] font-bold'>Pools with Multiplier: {mcActivePoolLength}</div>
      <div className='text-[30px] font-bold'>Active Pools: {mcActivePoolDetail.length}</div>
      <div className='text-[30px] font-bold'>TVL: ${TotalValueLocked}</div>
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
      })}
    </div>
  )
}

export default Home