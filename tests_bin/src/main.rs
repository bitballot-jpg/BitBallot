use shared::{Ballot, DisplayState, VoteBatch, VotePayload, Transaction};
use client_wasm::{generate_vote_batch, build_transaction_payload, generate_adi_commitment};
use vprog_mock::{verify_stark_proof_for_vote, verify_aggregated_tally_proof};
use node_core::{resolve_last_valid_votes, prune_invalid_submissions};
use tally::{dkg_setup, decrypt_batch, execute_tally, construct_tally_proof};

fn main() {
    println!("--- BitBallot End-to-End Pipeline Mock Simulation ---");

    // 1. Initial Data
    let candidates = vec!["Alice".to_string(), "Bob".to_string(), "Charlie".to_string()];
    let candidates_js = serde_json::to_string(&candidates).unwrap();

    // ===============
    // Voter 1: Aliceに投票
    // ===============
    let display_1 = DisplayState {
        screen_id: "Terminal-A".to_string(),
        layout_hash: "hash_layout_A".to_string(),
    };
    let display_1_js = serde_json::to_string(&display_1).unwrap();
    
    // クライアントでADI生成 (モックWasm API)
    let adi_1 = generate_adi_commitment(display_1_js, "Alice".to_string()).unwrap();
    
    // バッチ生成（ダミー9枚を含む合計10枚）
    let batch_1_js = generate_vote_batch("Alice".to_string(), None, candidates_js.clone(), 10).unwrap();
    
    // ZKPモック
    let zkp_1 = "valid_proof_voter_1".to_string();
    
    // トランザクション構築
    let tx_payload_1_js = build_transaction_payload(batch_1_js, adi_1, zkp_1).unwrap();
    let payload_1: VotePayload = serde_json::from_str(&tx_payload_1_js).unwrap();

    let tx_1 = Transaction {
        tx_id: "tx-001".to_string(),
        voter_id: "Voter1".to_string(),
        block_height: 100,
        payload: payload_1,
    };

    // ===============
    // Voter 2: Bobに投票した後、Charlieへ再投票（Last-vote-valid）
    // ===============
    let display_2 = DisplayState {
        screen_id: "Terminal-B".to_string(),
        layout_hash: "hash_layout_B".to_string(),
    };
    let display_2_js = serde_json::to_string(&display_2).unwrap();
    let display_2_js_revote = serde_json::to_string(&display_2).unwrap();

    // 最初の投票: Bob
    // 最初の投票: Bob (ダミー9枚を含む合計10枚)
    let adi_2_1 = generate_adi_commitment(display_2_js, "Bob".to_string()).unwrap();
    let batch_2_1_js = generate_vote_batch("Bob".to_string(), None, candidates_js.clone(), 10).unwrap();
    let tx_payload_2_1_js = build_transaction_payload(batch_2_1_js, adi_2_1, "valid_proof_v2_1".to_string()).unwrap();
    
    let tx_2_1 = Transaction {
        tx_id: "tx-002".to_string(),
        voter_id: "Voter2".to_string(),
        block_height: 110,
        payload: serde_json::from_str(&tx_payload_2_1_js).unwrap(),
    };

    // 再投票: Charlie
    // 再投票: Charlie (ダミー9枚を含む合計10枚)
    let adi_2_2 = generate_adi_commitment(display_2_js_revote, "Charlie".to_string()).unwrap();
    let batch_2_2_js = generate_vote_batch("Charlie".to_string(), None, candidates_js.clone(), 10).unwrap();
    let tx_payload_2_2_js = build_transaction_payload(batch_2_2_js, adi_2_2, "valid_proof_v2_2".to_string()).unwrap();
    
    let tx_2_2 = Transaction {
        tx_id: "tx-003".to_string(),
        voter_id: "Voter2".to_string(),
        block_height: 125, // より新しいブロック高
        payload: serde_json::from_str(&tx_payload_2_2_js).unwrap(),
    };

    // === L1 Network (BlockDAG) ===
    let submitted_txs = vec![tx_1, tx_2_1, tx_2_2];

    // === Node Core (State Management) ===
    println!("--- Resolution Phase (Node Core) ---");
    let effective_votes = resolve_last_valid_votes(submitted_txs);
    println!("有効な最後の投票数: {}", effective_votes.len());
    
    // Voter 2はより新しいheightを持つtx_2_2が残るはず
    assert_eq!(effective_votes.get("Voter2").unwrap().block_height, 125);

    // vProg ZKPスタブを用いて不正票を除去
    let valid_votes_map = prune_invalid_submissions(effective_votes, verify_stark_proof_for_vote);
    let valid_votes: Vec<_> = valid_votes_map.into_values().collect();
    
    println!("検証にパスした有効な投票数: {}", valid_votes.len());
    assert_eq!(valid_votes.len(), 2);

    // === Tally Phase (Guardians) ===
    println!("--- Tally Phase (Guardians) ---");
    let guardians = vec!["G1", "G2", "G3"];
    let _mpk = dkg_setup(&guardians);

    let mut decrypted_batches = Vec::new();
    for tx in valid_votes {
        // 各有効票の暗号データを閾値で復号 (モック)
        let decrypted = decrypt_batch(&tx.payload.ciphertexts, &guardians).unwrap();
        decrypted_batches.push(decrypted);
    }

    // ダミー票から本命を抽出して集計実行
    let results = execute_tally(&decrypted_batches);
    println!("集計結果: {:?}", results);

    assert_eq!(*results.get("Alice").unwrap(), 1);
    assert_eq!(results.get("Bob"), None); // 最初の投票は上書きされたため0（またはNone）
    assert_eq!(*results.get("Charlie").unwrap(), 1);

    // 集計証明の検証
    let tally_proof = construct_tally_proof(&results);
    let is_tally_valid = verify_aggregated_tally_proof(&tally_proof);
    println!("集計結果の証明検証: {}", if is_tally_valid { "成功" } else { "失敗" });
    assert!(is_tally_valid);

    // ===============
    // 検証: 候補者が少ない場合の動的サイズ調整 (3 candidates, request 10)
    // ===============
    println!("--- Dynamic Batch Size Adjustment Test (3 candidates, request 10) ---");
    let small_candidates = vec!["Alice".to_string(), "Bob".to_string(), "Charlie".to_string()];
    let small_candidates_js = serde_json::to_string(&small_candidates).unwrap();
    let dynamic_batch_js = generate_vote_batch("Charlie".to_string(), Some("Alice".to_string()), small_candidates_js, 10).unwrap();
    let dynamic_batch: VoteBatch = serde_json::from_str(&dynamic_batch_js).unwrap();
    println!("Requested 10, but Generated Batch Size: {}", dynamic_batch.ballots.len());
    for b in &dynamic_batch.ballots {
        println!("  - Candidate: {}, Dummy: {}", b.candidate, b.is_dummy);
    }

    println!("--- End-to-End Test Passed Successfully ---");
}
