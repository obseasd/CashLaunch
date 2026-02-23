import { ElectrumNetworkProvider } from 'cashscript';

let provider: ElectrumNetworkProvider | null = null;

export function getProvider(): ElectrumNetworkProvider {
  if (!provider) {
    provider = new ElectrumNetworkProvider('chipnet');
  }
  return provider;
}
