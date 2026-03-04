use shared::Transaction;
use std::collections::HashMap;

/// 指定したブロック高間のBitBallot関連トランザクションを取得（モック）
pub fn fetch_bitballot_transactions(start_height: u64, end_height: u64) -> Vec<Transaction> {
    println!("L1インデクサ: {} から {} までのトランザクションを検索中...", start_height, end_height);
    // モックとしては外部から注入されるので、コアロジックは状態管理（Last-vote-valid）に集中
    vec![]
}

/// 抽出したトランザクションのリストから Last-vote-valid（最終投票有効）のルールを適用し、
/// 各投票者における有効な最終票のみを決定します。
pub fn resolve_last_valid_votes(transactions: Vec<Transaction>) -> HashMap<String, Transaction> {
    let mut effective_votes: HashMap<String, Transaction> = HashMap::new();

    for tx in transactions {
        let voter_id = tx.voter_id.clone();
        
        let should_update = match effective_votes.get(&voter_id) {
            Some(existing) => tx.block_height > existing.block_height,
            None => true,
        };

        if should_update {
            effective_votes.insert(voter_id, tx);
        }
    }

    effective_votes
}

/// 最終票として残ったものの中から、不正な（検証に通らない）票を取り除きます。
/// vprog-mock 等を利用します。
pub fn prune_invalid_submissions<F>(effective_votes: HashMap<String, Transaction>, verifier: F) -> HashMap<String, Transaction> 
where 
    F: Fn(&shared::VotePayload) -> bool
{
    effective_votes
        .into_iter()
        .filter(|(_, tx)| verifier(&tx.payload))
        .collect()
}
