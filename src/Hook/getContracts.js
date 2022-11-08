import { ethers } from 'ethers'

const getContract = (CONTRACT_ADDRESS, abi) => {
    const { ethereum } = window;
    if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum)
        const signer = provider.getSigner()
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

        return connectedContract
    }
}

export default getContract