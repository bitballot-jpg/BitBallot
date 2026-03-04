use shared::{VotePayload, AdiCommitment};

/// クライアントが提出したバッチやADI Commitmentに対して
/// STARK等のゼロ知識証明が正当であるかを検証するモック関数。
pub fn verify_stark_proof_for_vote(payload: &VotePayload) -> bool {
    // モック検証: proof が "valid_proof" から始まっていれば通過とする
    payload.proof.starts_with("valid_proof")
}

/// 選挙集計結果が入力された全有効票から正しく完了したことのSTARK証明モック検証。
pub fn verify_aggregated_tally_proof(proof: &str) -> bool {
    proof.starts_with("valid_tally_proof")
}
