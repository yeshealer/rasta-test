import axios from 'axios'
import getContract from './getContracts'
import TokenABI from '../ABIs/TokenABI.json'

const getMrastaPrice = async () => {
    const RastaAddress = '0xE3e8cC42DA487d1116D26687856e9FB684817c52'
    const MrastaAddress = '0xEAA4A2469a8471bD8314b2FF63c1d113FE8114bA'
    const LPAddress = '0xbea61686d11aed2d078885d77ccaeda352bb1fe4'
    const RastaContract = getContract(RastaAddress, TokenABI)
    const MrastaContract = getContract(MrastaAddress, TokenABI)
    const rastaBalance_decimal = await RastaContract.balanceOf(LPAddress)
    const mrastaBalance_decimal = await MrastaContract.balanceOf(LPAddress)
    const rastaBalance = parseInt(rastaBalance_decimal._hex) / Math.pow(10, 18)
    const mrastaBalance = parseInt(mrastaBalance_decimal._hex) / Math.pow(10, 18)
    const rasta_detail = await axios.get(`https://api.pancakeswap.info/api/v2/tokens/${RastaAddress}`)
    const rasta_price = rasta_detail.data.data.price
    const rasta_tvl = rastaBalance * rasta_price
    const mrastaPrice = rasta_tvl / mrastaBalance
    return mrastaPrice
}

export default getMrastaPrice