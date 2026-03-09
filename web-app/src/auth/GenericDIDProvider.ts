import type { IdentityProvider, AuthResult } from './types';

export const GenericDIDProvider: IdentityProvider = {
    id: 'generic_did',
    name: 'グローバルDID / e-Residency',
    description: 'エストニアe-Residencyやその他の分散型ID (W3C DID) を利用して認証します。',
    icon: '🌍',

    authenticate: async (): Promise<AuthResult> => {
        // モック実装として数秒待機したあと、ランダムなDIDを返します。
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockDidId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                const mockSignature = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                const did = `did:ethr:0x${mockDidId}`;
                const voterId = `voter_did_${mockDidId.substring(0, 8)}`;

                resolve({
                    voter_id: voterId,
                    proof: {
                        provider: 'GenericDID',
                        did: did,
                        signature: mockSignature
                    }
                });
            }, 1500);
        });
    }
};
