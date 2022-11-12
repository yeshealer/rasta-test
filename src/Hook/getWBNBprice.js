import axios from "axios";

const getWBNBprice = async () => {
    const token_detail = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd`)
    const price = token_detail.data.binancecoin.usd;
    return price
}

export default getWBNBprice