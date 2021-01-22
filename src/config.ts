import BitcoinNetworks from '@liquality/bitcoin-networks';
import EthereumNetworks from '@liquality/ethereum-networks';

export type NetworkType = 'mainnet' | 'testnet';

export const NetworkConfig = {
  BTC: {
    testnet: BitcoinNetworks.bitcoin_testnet,
    mainnet: BitcoinNetworks.bitcoin
  },
  ETH: {
    testnet: EthereumNetworks.rinkeby,
    mainnet: EthereumNetworks.mainnet
  },
  RBTC: {
    testnet: EthereumNetworks.rsk_testnet,
    mainnet: EthereumNetworks.rsk_mainnet
  }
}