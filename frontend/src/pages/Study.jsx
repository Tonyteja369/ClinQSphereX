import React, { useEffect, useState } from "react";
import { getJSON, postJSON } from "../api";
import Candidate from "./Candidate";

export default function Study({ studyId, token }){
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roc, setRoc] = useState(null);

  useEffect(()=>{ fetchCandidates(); }, [studyId]);

  async function fetchCandidates(){
    try{
      const res = await getJSON(`/candidates/study/${studyId}`, token);
      setCandidates(res);
    }catch(e){ alert("load failed: "+e.message); }
  }

  async function genCandidates(){
    setLoading(true);
    try{
      await postJSON(`/candidates/generate?study_id=${studyId}&n=120`, {}, token);
      fetchCandidates();
    }catch(e){ alert("gen failed: "+e.message); }finally{ setLoading(false); }
  }

  async function ingestSynthea(){
    setLoading(true);
    try{
      // call ingest without file to use sample on server
      const res = await postJSON(`/candidates/ingest_synthea?study_id=${studyId}`, {}, token);
      alert(`Ingested ${res.created} records from sample Synthea`);
      fetchCandidates();
    }catch(e){ alert("ingest failed: "+e.message); }finally{ setLoading(false); }
  }

  async function runTrain(){
    setLoading(true);
    try{
      const res = await postJSON(`/train/run?study_id=${studyId}&n_samples=300&n_qubits=4&run_classical=true&run_quantum=true`, {}, token);
      if(res.roc_image_base64) setRoc(`data:image/png;base64,${res.roc_image_base64}`);
      alert("Training finished. See metrics in console.");
      console.log("Classical", res.classical_metrics, "Quantum", res.quantum_metrics);
    }catch(e){ alert("train failed: "+e.message); }finally{ setLoading(false); }
  }

  return (
    <div>
      <h2>Study {studyId}</h2>
      <div className="actions">
        <button onClick={genCandidates} disabled={loading}>Generate Candidates</button>
        <button onClick={ingestSynthea} disabled={loading}>Ingest sample Synthea</button>
        <button onClick={fetchCandidates}>Refresh</button>
        <button onClick={runTrain} disabled={loading}>Run Training (Classical+Quantum)</button>
      </div>
      <div className="cands">
        {candidates.map(c => <Candidate key={c.id} cand={c} token={token} refresh={fetchCandidates}/>)}
      </div>
      <div className="roc-area">
        {roc ? <img src={roc} alt="ROC"/> : <div>No ROC yet</div>}
      </div>
    </div>
  );
}
