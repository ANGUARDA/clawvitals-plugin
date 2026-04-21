import type { NetworkResult } from '../../types';
export declare const MANAGEMENT_PORTS: Array<{
    port: number;
    service: string;
}>;
export declare function collectNetwork(ports?: Array<{
    port: number;
    service: string;
}>): Promise<NetworkResult>;
//# sourceMappingURL=network.d.ts.map