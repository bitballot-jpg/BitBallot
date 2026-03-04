use serde::{Deserialize, Serialize};

/// 投票者の画面表示状態を示す型。
/// 実際のアプリケーションでは、画面のレイアウト情報や表示内容そのもののハッシュを含みます。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DisplayState {
    pub screen_id: String,
    pub layout_hash: String,
}

/// 投票者が選択した候補者などの意図を示す型。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VoterSelection {
    pub candidate_id: String,
}

/// 単一の投票。`is_dummy`フラグは、vProg内部でのみ検証・評価され、
/// 外部の（L1などの）システムからは暗号化されているため見えません。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ballot {
    pub candidate: String,
    pub is_dummy: bool,
}

/// 復数の投票（ダミーと本命）をまとめたバッチ構造。
/// 外部からはどの票が特定のダミーであるか識別不可能になります（Indistinguishable）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteBatch {
    pub ballots: Vec<Ballot>,
}

/// Atomic Display Integrity (ADI) のコミットメント。
/// 画面表示状態(`DisplayState`)と選択(`VoterSelection`)を暗号学的にバインドしたハッシュ値など。
pub type AdiCommitment = String;

/// L1へ送信されるBitBallotトランザクションペイロード（暗号化前/モック用の平文表現可）。
/// 実際は `ciphertexts` に暗号化されたバッチが格納されます。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VotePayload {
    pub ciphertexts: VoteBatch, // モックのため平文のVoteBatchを保持
    pub adi_commitment: AdiCommitment,
    pub proof: String, // STARKなどのZKProof
}

/// ブロックチェーン（BlockDAG）上で抽出された、トランザクションのラッパー構造。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub tx_id: String,
    pub voter_id: String,
    pub block_height: u64,
    pub payload: VotePayload,
}
