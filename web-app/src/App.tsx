import { useState, useEffect } from 'react';
import initSync, { generate_adi_commitment, generate_vote_batch, build_transaction_payload } from 'client-wasm';
import './index.css';

interface Candidate {
  id: string;
  name: string;
  party: string;
  emoji: string;
}

const CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Alice Smith', party: 'Progressive Alliance', emoji: '👩‍💼' },
  { id: 'c2', name: 'Bob Johnson', party: 'Conservative Party', emoji: '👨‍💼' },
  { id: 'c3', name: 'Charlie Davis', party: 'Independent', emoji: '🧑‍🚀' },
  { id: 'c4', name: 'Diana Prince', party: 'Justice League', emoji: '👸' },
  { id: 'c5', name: 'Ethan Hunt', party: 'Mission Force', emoji: '🕵️' },
  { id: 'c6', name: 'Fiona Gallagher', party: 'South Side', emoji: '👩‍🎤' },
  { id: 'c7', name: 'George Costanza', party: 'Vandelay Ind.', emoji: '👨‍💼' },
  { id: 'c8', name: 'Hannah Abbott', party: 'Hufflepuff', emoji: '👩‍🎓' },
  { id: 'c9', name: 'Ian Malcolm', party: 'Chaos Theory', emoji: '🦖' },
  { id: 'c10', name: 'Julia Roberts', party: 'Pretty Woman', emoji: '🎭' }
];

function App() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetedDummyId] = useState<string | null>('c2'); // Mock: Coerced to vote for Bob Johnson
  const [step, setStep] = useState<number>(1);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [txId, setTxId] = useState<string>('');

  // Wasmの初期化
  useEffect(() => {
    const loadWasm = async () => {
      try {
        await initSync();
        setIsWasmLoaded(true);
      } catch (e) {
        console.error("Failed to load WASM", e);
      }
    };
    loadWasm();
  }, []);

  const handleSubmit = async () => {
    if (!selectedId || !isWasmLoaded) return;

    setStep(2);
    setProcessingStep(1);

    const selectedName = CANDIDATES.find(c => c.id === selectedId)?.name || '';
    const targetedDummyName = CANDIDATES.find(c => c.id === targetedDummyId)?.name;
    const candidateNames = CANDIDATES.map(c => c.name);

    // Simulate ADI generation delay
    await new Promise(r => setTimeout(r, 800));
    const dummyStateJs = JSON.stringify({
      screen_id: "Web-App-Client",
      layout_hash: "react_ui_layout_v1"
    });
    const adi = generate_adi_commitment(dummyStateJs, selectedName);
    console.log("Generated ADI:", adi);

    setProcessingStep(2);
    await new Promise(r => setTimeout(r, 800));

    // Generate batch with dummies (1 real + 1 target dummy + others = max 10 total)
    // The Wasm engine will dynamically reduce the number of dummies based on the candidate list.
    const batchJs = generate_vote_batch(selectedName, targetedDummyName, JSON.stringify(candidateNames), 10);
    console.log(`Generated Batch (Real: ${selectedName}, Targeted Dummy: ${targetedDummyName || 'None'}):`, JSON.parse(batchJs));

    setProcessingStep(3);
    await new Promise(r => setTimeout(r, 800));

    // Build Payload
    const payloadJs = build_transaction_payload(batchJs, adi, "valid_stark_proof_mock");
    console.log("Tx Payload (To Node Core):", JSON.parse(payloadJs));

    // Generate Hash
    const mockHash = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setTxId(`tx_${mockHash.substring(0, 16)}...`);

    // Simulate Backend processing logs
    setTimeout(() => {
      console.log(`[NodeCore Simulation] Registered Tx: tx_${mockHash.substring(0, 16)}...`);
      console.log(`[Tally Simulation] Last-vote-valid triggered.`);
      console.log(`[Tally Simulation] Valid Vote for User: ${selectedName} counted. Earlier votes are pruned.`);
    }, 1000);

    setStep(3);
  };

  const handleRestart = () => {
    setSelectedId(null);
    setProcessingStep(0);
    setStep(1);
  };

  return (
    <>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="app-container">
        <header>
          <div className="logo">
            <span className="icon">🗳️</span>
            <h1>BitBallot</h1>
          </div>
          <div className="status-badge secure">
            <span className="dot"></span>
            {isWasmLoaded ? "ADI Engine Ready" : "Loading Engine..."}
          </div>
        </header>

        {step === 1 && (
          <main className="step active">
            <div className="step-header">
              <h2>Select Your Candidate</h2>
              <p>Choose 1 out of 3 candidates. You can override your vote later anytime.</p>
            </div>

            <div className="candidate-grid">
              {CANDIDATES.map((c) => (
                <div
                  key={c.id}
                  className={`candidate-card ${selectedId === c.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="candidate-info">
                    <div className="avatar">{c.emoji}</div>
                    <div className="details">
                      <h3>{c.name}</h3>
                      <span>{c.party}</span>
                    </div>
                  </div>
                  <div className="check"></div>
                </div>
              ))}
            </div>

            <div className="action-footer">
              <button
                className="btn primary"
                disabled={!selectedId || !isWasmLoaded}
                onClick={handleSubmit}
              >
                <span className="btn-text">Confirm Vote</span>
                <span className="btn-icon">🔒</span>
              </button>
            </div>
          </main>
        )}

        {step === 2 && (
          <main className="step active">
            <div className="processing-container">
              <div className="spinner"></div>
              <h2>Securing Vote</h2>
              <p>Generating proofs and dummy actions...</p>
              <div className="progress-steps">
                <div className={`progress-step ${processingStep >= 1 ? 'active' : ''} ${processingStep > 1 ? 'done' : ''}`}>1. Generating ADI Commitment...</div>
                <div className={`progress-step ${processingStep >= 2 ? 'active' : ''} ${processingStep > 2 ? 'done' : ''}`}>2. Creating Dummy Batch...</div>
                <div className={`progress-step ${processingStep >= 3 ? 'active' : ''}`}>3. Building ZK Proofs...</div>
              </div>
            </div>
          </main>
        )}

        {step === 3 && (
          <main className="step active">
            <div className="success-container">
              <div className="check-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2>Vote Submitted!</h2>
              <p>Your vote has been securely encrypted and transmitted to the BlockDAG.</p>

              <div className="receipt-card">
                <div className="receipt-row">
                  <span className="label">Transaction ID</span>
                  <span className="value tx-hash">{txId}</span>
                </div>
                <div className="receipt-row">
                  <span className="label">Status</span>
                  <span className="value success">Pending Confirmation</span>
                </div>
              </div>

              <div className="disclaimer">
                <span className="shield">🛡️</span>
                <p><strong>Anti-Coercion Active:</strong> You can vote again anytime before the tally. Only your last valid vote will be counted.</p>
              </div>

              <button className="btn secondary" onClick={handleRestart}>Vote Again (Override)</button>
            </div>
          </main>
        )}
      </div>
    </>
  );
}

export default App;
