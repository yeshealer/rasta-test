import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { ethers } from 'ethers'
import getMrastaPrice from '../Hook/getMrastaPrice'
import getContract from '../Hook/getContracts'
import MasterChefABI from '../ABIs/MasterChefABI.json'
import SinglePoolABI from '../ABIs/SinglePoolABI.json'
import LPABI from '../ABIs/LPABI.json'
import TokenABI from '../ABIs/TokenABI.json'

const getConnectedContract = (CONTRACT_ADDRESS, abi) => {
  const { ethereum } = window;
  if (ethereum) {
    const provider = new ethers.providers.Web3Provider(ethereum)
    const signer = provider.getSigner()
    const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

    return connectedContract
  }
}

export default function Home() {
  const [mcPoolLength, setMCPoolLength] = useState(0);
  const [mcActivePoolLength, setMCActivePoolLength] = useState(0);
  const [mcActivePoolDetail, setMCActivePoolDetail] = useState([]);
  const MasterChefAddress = "0xec89Be665c851FfBAe2a8Ded03080F3E64116539";
  const MasterChefContract = getConnectedContract(MasterChefAddress, MasterChefABI);

  const getPoolLength = async () => {
    const poolLength = await MasterChefContract.poolLength();
    return poolLength.toNumber()
  }

  const getTotalPools = async () => {
    let mcTotalPools = []
    const mcPoolLength = await getPoolLength()
    for (let i = 0; i < mcPoolLength; i++) {
      const rastaPool = await MasterChefContract.poolInfo(i)
      mcTotalPools.push(rastaPool)
    }
    return mcTotalPools
  }

  const getActivePools = async () => {
    let mcActivePools = []
    const mcTotalPools = await getTotalPools()
    for (let i = 0; i < mcTotalPools.length; i++) {
      if (mcTotalPools[i].allocPoint.toNumber() > 0) {
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
        activePoolContract = getConnectedContract(mcActivePools[i].lpToken, LPABI)
        // token0
        const token0 = await activePoolContract.token0()
        const token0Contract = getConnectedContract(token0, TokenABI)
        const token0_symbol = await token0Contract.symbol()
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
        const token0_decimal = await token0Contract.decimals()
        const token0_balance_decimal = await token0Contract.balanceOf(mcActivePools[i].lpToken)
        const token0_balance = parseInt(token0_balance_decimal._hex) / (Math.pow(10, token0_decimal))
        // token1
        const token1 = await activePoolContract.token1()
        const token1Contract = getConnectedContract(token1, TokenABI)
        const token1_symbol = await token1Contract.symbol()
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
        const token1_decimal = await token1Contract.decimals()
        const token1_balance_decimal = await token1Contract.balanceOf(mcActivePools[i].lpToken)
        const token1_balance = parseInt(token1_balance_decimal._hex) / (Math.pow(10, token1_decimal))
        // symbol
        const symbol = await activePoolContract.symbol()
        // config
        const total_staked_decimal = await activePoolContract.balanceOf(MasterChefAddress)
        const total_supply_decimal = await activePoolContract.totalSupply()
        const total_staked = parseInt(total_staked_decimal._hex) / Math.pow(10, 18)
        const total_supply = parseInt(total_supply_decimal._hex) / Math.pow(10, 18)
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
        activePoolContract = getConnectedContract(mcActivePools[i].lpToken, SinglePoolABI)
        const tokenAddress = mcActivePools[i].lpToken
        const symbol = await activePoolContract.symbol()
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
          const decimal = await activePoolContract.decimals()
          const balance_decimal = await activePoolContract.balanceOf(MasterChefAddress)
          const balance = parseInt(balance_decimal._hex) / (Math.pow(10, decimal))

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
      <div style={{ fontSize: '30px', fontWeight: 'bold' }}>Total Pools: {mcPoolLength}</div>
      <div style={{ fontSize: '30px', fontWeight: 'bold' }}>Pools with Multiplier: {mcActivePoolLength}</div>
      <div style={{ fontSize: '30px', fontWeight: 'bold' }}>Active Pools: {mcActivePoolDetail.length}</div>
      <div style={{ fontSize: '30px', fontWeight: 'bold' }}>TVL: ${TotalValueLocked}</div>
      <div style={{ fontSize: '30px', fontWeight: 'bold' }}>Details:</div>
      {mcActivePoolDetail.map((mcActivePool, index) => {
        if (mcActivePool.type === 'Single') {
          return (
            <div key={index}>
              <div style={{ fontSize: '20px' }}>PoolName: {mcActivePool.symbol}</div>
              <div style={{ fontSize: '20px' }}>Token Price: ${mcActivePool.lpPrice}</div>
              <div style={{ fontSize: '20px' }}>Token Address: {mcActivePool.lpAddress}</div>
              <div style={{ fontSize: '20px' }}>Total Staked: {mcActivePool.totalStacked}</div>
              <div style={{ fontSize: '20px' }}>TVL: ${mcActivePool.TVL}</div>
              <div>--------------------------------------------------------------------------------</div>
            </div>
          )
        } else {
          return (
            <div key={index}>
              <div style={{ fontSize: '20px' }}>LP Name: {mcActivePool.symbol}</div>
              <div style={{ fontSize: '20px' }}>LP Address: {mcActivePool.lpAddress}</div>
              <div style={{ fontSize: '20px' }}>Token0: {mcActivePool.token0}</div>
              <div style={{ fontSize: '20px' }}>Token1: {mcActivePool.token1}</div>
              <div style={{ fontSize: '20px' }}>Token0 price: ${mcActivePool.token0_price}</div>
              <div style={{ fontSize: '20px' }}>Token1 price: ${mcActivePool.token1_price}</div>
              <div style={{ fontSize: '20px' }}>LP price: ${mcActivePool.lpPrice}</div>
              <div style={{ fontSize: '20px' }}>Total Staked: {mcActivePool.totalStacked}</div>
              <div style={{ fontSize: '20px' }}>TVL: ${mcActivePool.TVL}</div>
              <div>--------------------------------------------------------------------------------</div>
            </div>
          )
        }
      })}
    </div>
  )
}
