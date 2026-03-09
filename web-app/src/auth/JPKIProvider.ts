import type { IdentityProvider, AuthResult } from './types';

export const JPKIProvider: IdentityProvider = {
    id: 'jpki',
    name: 'マイナンバーカード (JPKI)',
    description: 'NFCリーダーまたはスマートフォンを使用して公的個人認証を行います。',
    icon: '💳',

    authenticate: async (): Promise<AuthResult> => {
        // 実際の運用ではNFC読み込みライブラリを呼び出して署名を作成します。
        // 今回はモック実装として数秒待機したあと、ランダムなハッシュを返します。
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockCertHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                const mockSignature = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                const voterId = `voter_jpki_${mockCertHash.substring(0, 8)}`;

                resolve({
                    voter_id: voterId,
                    proof: {
                        provider: 'JPKI',
                        cert_hash: mockCertHash,
                        signature: mockSignature
                    }
                });
            }, 1500);
        });
    }
};
