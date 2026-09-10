import React, { useState } from "react";
import { postJSON } from "../api";

export default function Login({ onLogin }){
  const [email, setEmail] = useState("admin@trialbridge.local");
  const [password, setPassword] = useState("adminpass");
  const [loading, setLoading] = useState(false);

  async function handleLogin(){
    setLoading(true);
    try{
      const res = await postJSON("/auth/token", { email, password });
      onLogin(res.access_token);
    }catch(e){
      alert("Login failed: " + e.message);
    }finally{ setLoading(false); }
  }

  return (
    <div className="center">
      <h2>TrialBridge MVP — Login</h2>
      <div className="card">
        <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <button onClick={handleLogin} disabled={loading}>{loading? "Logging in...":"Login"}</button>
      </div>
    </div>
  );
}
