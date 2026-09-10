import React, { useState } from "react";
import { postJSON, getJSON } from "../api";

export default function Candidate({ cand, token, refresh }){
  const [loading, setLoading] = useState(false);
  const [explain, setExplain] = useState(null);

  async function confirm(){
    setLoading(true);
    try{
      await postJSON(`/candidates/${cand.id}/confirm`, { confirm: true }, token);
      refresh();
    }catch(e){ alert("Confirm failed: "+e.message); }finally{ setLoading(false); }
  }
  async function consent(){
    setLoading(true);
    try{
      await postJSON(`/candidates/${cand.id}/consent`, { consent: true }, token);
      refresh();
    }catch(e){ alert("Consent failed: "+e.message); }finally{ setLoading(false); }
  }

  async function explainMe(){
    setLoading(true);
    try{
      const res = await getJSON(`/candidates/${cand.id}/explain`, token);
      setExplain(res.explanation);
    }catch(e){ alert("Explain failed: "+e.message); }finally{ setLoading(false); }
  }

  return (
    <div className="card candidate">
      <div><strong>ID:</strong> {cand.id}</div>
      <div>Age: {cand.age} | BMI: {cand.bmi.toFixed(1)} | SBP: {cand.systolic_bp.toFixed(0)}</div>
      <div>HbA1c: {cand.hba1c.toFixed(2)} | Symptom: {cand.symptom_score}</div>
      <div>Eligibility Confirmed: {String(cand.eligibility_confirmed)}</div>
      <div>Consent Signed: {String(cand.consent_signed)}</div>
      <div className="cand-actions">
        <button onClick={confirm} disabled={loading}>Confirm Eligibility</button>
        <button onClick={consent} disabled={loading}>Sign Consent</button>
        <button onClick={explainMe} disabled={loading}>Explain (SHAP)</button>
      </div>

      {explain && (
        <div style={{ marginTop: 8 }}>
          <h4>SHAP Explanation (top features)</h4>
          <ul>
            {explain.map(item => (
              <li key={item.feature} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: "600" }}>{item.feature} — value: {item.value}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                      height: 12,
                      width: `${Math.min(100, Math.abs(item.shap) * 100).toFixed(0)}%`,
                      background: item.shap >= 0 ? "#e53e3e" : "#3182ce",
                      borderRadius: 4
                    }} />
                  <div style={{ fontSize: 12 }}>{item.shap.toFixed(3)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
