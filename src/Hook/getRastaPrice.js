import axios from 'axios';

const getRastaPrice = async () => {
    const token_detail = await axios.get(`https://api.pancakeswap.info/api/v2/tokens/0xE3e8cC42DA487d1116D26687856e9FB684817c52`)
    const price = token_detail.data.data.price;
    return price
}

export default getRastaPrice