import { useState, useEffect } from 'react';
import initSync, { generate_adi_commitment, generate_vote_batch, build_transaction_payload } from 'client-wasm';
import type { IdentityProvider, AuthResult } from './auth/types';
import { JPKIProvider } from './auth/JPKIProvider';
import { GenericDIDProvider } from './auth/GenericDIDProvider';
import './index.css';

interface Candidate {
  id: string;
  name: string;
  party: string;
  emoji: string;
  primary_node_url: string;
  fallback_node_url: string;
}

const CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Alice Smith', party: 'Progressive Alliance', emoji: '👩‍💼', primary_node_url: 'https://node.prog-alliance.example/tx', fallback_node_url: 'https://neutral-node.election.org/tx' },
  { id: 'c2', name: 'Bob Johnson', party: 'Conservative Party', emoji: '👨‍💼', primary_node_url: 'https://node.conservative.example/tx', fallback_node_url: 'https://neutral-node.election.org/tx' },
  { id: 'c3', name: 'Charlie Davis', party: 'Independent', emoji: '🧑‍🚀', primary_node_url: 'https://neutral-node.election.org/tx', fallback_node_url: 'https://backup.election.org/tx' },
  { id: 'c4', name: 'Diana Prince', party: 'Justice League', emoji: '👸', primary_node_url: 'https://node.justice.example/tx', fallback_node_url: 'https://neutral-node.election.org/tx' },
  { id: 'c5', name: 'Ethan Hunt', party: 'Mission Force', emoji: '🕵️', primary_node_url: 'https://node.imf.example/tx', fallback_node_url: 'https://backup.election.org/tx' },
  { id: 'c6', name: 'Fiona Gallagher', party: 'South Side', emoji: '👩‍🎤', primary_node_url: 'https://node.southside.example/tx', fallback_node_url: 'https://neutral-node.election.org/tx' },
  { id: 'c7', name: 'George Costanza', party: 'Vandelay Ind.', emoji: '👨‍💼', primary_node_url: 'https://node.vandelay.example/tx', fallback_node_url: 'https://neutral-node.election.org/tx' },
  { id: 'c8', name: 'Hannah Abbott', party: 'Hufflepuff', emoji: '👩‍🎓', primary_node_url: 'https://node.hufflepuff.example/tx', fallback_node_url: 'https://neutral-node.election.org/tx' },
  { id: 'c9', name: 'Ian Malcolm', party: 'Chaos Theory', emoji: '🦖', primary_node_url: 'https://node.chaos.example/tx', fallback_node_url: 'https://neutral-node.election.org/tx' },
  { id: 'c10', name: 'Julia Roberts', party: 'Pretty Woman', emoji: '🎭', primary_node_url: 'https://node.prettywoman.example/tx', fallback_node_url: 'https://backup.election.org/tx' }
];

function App() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetedDummyId] = useState<string | null>('c2'); // Mock: Coerced to vote for Bob Johnson

  // Auth state
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedIdp, setSelectedIdp] = useState<string | null>(null);

  const [step, setStep] = useState<number>(0); // 0: Auth, 1: Vote, 2: Process, 3: Success
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [txId, setTxId] = useState<string>('');
  const [routedNode, setRoutedNode] = useState<string>('');

  const providers: IdentityProvider[] = [JPKIProvider, GenericDIDProvider];

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
    const authProofJs = authResult ? JSON.stringify(authResult.proof) : "{}";
    const payloadJs = build_transaction_payload(batchJs, adi, "valid_stark_proof_mock", authProofJs);
    console.log("Tx Payload (To Node Core):", JSON.parse(payloadJs));

    // Tx Broadcasting (Parallel to all nodes for maximum privacy and resilience)
    console.log(`[Network] Broadcasting Vote Batch (Real + Dummies) to all nodes...`);
    
    // Extract unique node URLs for all candidates
    const allNodes = Array.from(new Set([
      ...CANDIDATES.map(c => c.primary_node_url),
      "https://neutral-node.election.org/tx" // Always include at least one neutral node
    ]));

    // Simulate parallel broadcast
    const broadcastPromises = allNodes.map(async (nodeUrl) => {
        // Simulate network latency (200ms - 700ms)
        await new Promise(r => setTimeout(r, 200 + Math.random() * 500));
        const isNodeDown = Math.random() > 0.8; // 20% chance node is down
        if (isNodeDown) {
            console.warn(`[Network] ❌ ${nodeUrl} : Connection failed or Tx dropped.`);
            return { node: nodeUrl, success: false };
        } else {
            console.log(`[Network] ✅ ${nodeUrl} : Tx Accepted.`);
            return { node: nodeUrl, success: true };
        }
    });

    const results = await Promise.all(broadcastPromises);
    const successfulNodes = results.filter(r => r.success).length;
    
    console.log(`[Network] Tx successfully reached ${successfulNodes}/${allNodes.length} nodes. Any single node is enough for L1 propagation.`);

    setRoutedNode(`Reached ${successfulNodes}/${allNodes.length} Nodes`);

    // Generate Hash
    const mockHash = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setTxId(`tx_${mockHash.substring(0, 16)}...`);

    // Simulate Backend processing logs
    setTimeout(() => {
      console.log(`[NodeCore Simulation] Tx propagated to L1 Network: tx_${mockHash.substring(0, 16)}...`);
      console.log(`[Tally Simulation] Last-vote-valid triggered.`);
      console.log(`[Tally Simulation] Valid Vote for User: ${selectedName} counted. Earlier votes are pruned.`);
    }, 1000);

    setStep(3);
  };

  const handleRestart = () => {
    setSelectedId(null);
    setProcessingStep(0);
    setStep(1); // Go back to vote screen, auth is kept
  };

  const handleLogout = () => {
    setAuthResult(null);
    setSelectedId(null);
    setProcessingStep(0);
    setStep(0);
  };

  const handleAuth = async (provider: IdentityProvider) => {
    setIsAuthenticating(true);
    setSelectedIdp(provider.id);
    try {
      const result = await provider.authenticate();
      setAuthResult(result);
      setStep(1);
    } catch (error) {
      console.error("Auth failed", error);
    } finally {
      setIsAuthenticating(false);
      setSelectedIdp(null);
    }
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
          <div className="status-container">
            {authResult && (
              <div className="status-badge user-id" onClick={handleLogout} title="Click to logout">
                <span className="icon">👤</span>
                {authResult.voter_id.substring(0, 15)}...
              </div>
            )}
            <div className="status-badge secure">
              <span className="dot"></span>
              {isWasmLoaded ? "Engine Ready" : "Loading..."}
            </div>
          </div>
        </header>

        {step === 0 && (
          <main className="step active">
            <div className="step-header">
              <h2>Select Identity Provider</h2>
              <p>Please authenticate to verify your voter eligibility anonymously. Your identity is separated from your vote.</p>
            </div>

            <div className="idp-grid">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className={`idp-card ${isAuthenticating && selectedIdp === p.id ? 'loading' : ''} ${isAuthenticating && selectedIdp !== p.id ? 'disabled' : ''}`}
                  onClick={() => !isAuthenticating && handleAuth(p)}
                >
                  <div className="idp-icon">{p.icon}</div>
                  <div className="idp-content">
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                  </div>
                  {isAuthenticating && selectedIdp === p.id && <div className="spinner small"></div>}
                </div>
              ))}
            </div>

            <div className="security-notice">
              <span className="icon">🛡️</span>
              <p>This system uses ZK-STARKs. The authentication gateway issues an anonymous proof that you are eligible, preventing double-voting without tracking who you voted for.</p>
            </div>
          </main>
        )}

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
                  <span className="label">Routed Node</span>
                  <span className="value tx-hash">{routedNode}</span>
                </div>
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
