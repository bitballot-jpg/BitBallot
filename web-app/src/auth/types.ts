export interface AuthProof {
    provider: 'JPKI' | 'GenericDID';
    // JPKI specific
    cert_hash?: string;
    signature?: string;
    // DID specific
    did?: string;
}

export interface AuthResult {
    voter_id: string; // The anonymized but unique ID for the voter
    proof: AuthProof;
}

export interface IdentityProvider {
    id: string;
    name: string;
    description: string;
    icon: string;
    authenticate(): Promise<AuthResult>;
}
