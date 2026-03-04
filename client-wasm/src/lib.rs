use shared::{Ballot, DisplayState, VoteBatch, VotePayload};
use sha2::{Sha256, Digest};
use wasm_bindgen::prelude::*;
use rand::seq::SliceRandom;
use rand::rngs::StdRng;
use rand::SeedableRng;

/// 指定した画面状態レイアウトおよび候補者選択意図からハッシュ化コミットメントを生成します
#[wasm_bindgen]
pub fn generate_adi_commitment(display_state_js: String, selected_candidate: String) -> Result<String, wasm_bindgen::JsValue> {
    let display_state: DisplayState = serde_json::from_str(&display_state_js)
        .map_err(|e| wasm_bindgen::JsValue::from_str(&e.to_string()))?;
    
    // JSON文字列等に直列化してハッシュを取るアプローチ
    // 注: 本格的なSTARK証明体系ではPoseidonハッシュ等のCircuit-Friendlyな手段を用います
    let payload = format!("{}:{}", display_state.layout_hash, selected_candidate);
    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    let result = hasher.finalize();
    
    Ok(format!("{:x}", result)) // AdiCommitment
}

/// 指定した候補者から本命とダミーを合成し、シャッフルしたバッチデータを作出します
/// 候補者数が batch_size 未満の場合は、候補者数に合わせてバッチを縮小します（無駄な票を排除）
#[wasm_bindgen]
pub fn generate_vote_batch(true_candidate: String, targeted_dummy: Option<String>, candidates_js: String, batch_size: usize) -> Result<String, wasm_bindgen::JsValue> {
    let candidates: Vec<String> = serde_json::from_str(&candidates_js)
        .map_err(|e| wasm_bindgen::JsValue::from_str(&e.to_string()))?;
    
    let mut other_candidates: Vec<String> = candidates.into_iter().filter(|c| c != &true_candidate).collect();
    if other_candidates.is_empty() && batch_size > 1 {
        return Err(wasm_bindgen::JsValue::from_str("Not enough candidates to form dummies"));
    }

    let mut rng = StdRng::seed_from_u64(42);
    let mut ballots = Vec::new();
    
    // 1. 本命票の追加
    ballots.push(Ballot {
        candidate: true_candidate.clone(),
        is_dummy: false,
    });

    // 実際のダミー票数を決定（指定されたバッチサイズ上限 or 全候補者数 - 1 の小さい方）
    let max_dummies = batch_size.saturating_sub(1);
    let mut target_dummy_count = std::cmp::min(max_dummies, other_candidates.len());
    
    // 2. 指定されたダミー（強要先など）がある場合、それを優先的に追加
    if let Some(target) = targeted_dummy {
        if target != true_candidate {
            if let Some(pos) = other_candidates.iter().position(|c| c == &target) {
                ballots.push(Ballot {
                    candidate: other_candidates.remove(pos),
                    is_dummy: true,
                });
                target_dummy_count = target_dummy_count.saturating_sub(1);
            }
        }
    }

    // 3. 残りの枠をランダムな候補者（重複なし）で埋める
    other_candidates.shuffle(&mut rng);
    for _ in 0..target_dummy_count {
        if let Some(dummy_candidate) = other_candidates.pop() {
            ballots.push(Ballot {
                candidate: dummy_candidate,
                is_dummy: true,
            });
        }
    }

    ballots.shuffle(&mut rng);

    let batch = VoteBatch { ballots };
    serde_json::to_string(&batch).map_err(|e| wasm_bindgen::JsValue::from_str(&e.to_string()))
}

/// 暗号化データ、ADI、およびZK Proofモックをバンドルし、トランザクションペイロードを構築します
#[wasm_bindgen]
pub fn build_transaction_payload(encrypted_batch_js: String, adi_commitment: String, proof_mock: String) -> Result<String, wasm_bindgen::JsValue> {
    let batch: VoteBatch = serde_json::from_str(&encrypted_batch_js)
        .map_err(|e| wasm_bindgen::JsValue::from_str(&e.to_string()))?;
    
    let payload = VotePayload {
        ciphertexts: batch,
        adi_commitment,
        proof: proof_mock, // e.g. "valid_stark_proof"
    };

    serde_json::to_string(&payload).map_err(|e| wasm_bindgen::JsValue::from_str(&e.to_string()))
}
