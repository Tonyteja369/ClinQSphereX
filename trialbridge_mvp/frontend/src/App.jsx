import React, { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App(){
  const token = localStorage.getItem("tb_token");
  const [authToken, setAuthToken] = useState(token);

  return authToken ? <Dashboard logout={()=>{ localStorage.removeItem("tb_token"); setAuthToken(null); }} token={authToken}/> : <Login onLogin={(t)=>{ localStorage.setItem("tb_token", t); setAuthToken(t); }} />;
}
