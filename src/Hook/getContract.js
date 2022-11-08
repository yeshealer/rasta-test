import Web3 from 'web3'

export default function getContract(CONTRACT_ADDRESS, abi) {
    const { ethereum } = window
    if (ethereum) {
        const web3 = new Web3(ethereum)
        const ConnectedContract = new web3.eth.Contract(abi, CONTRACT_ADDRESS)
        return ConnectedContract
    }
}
