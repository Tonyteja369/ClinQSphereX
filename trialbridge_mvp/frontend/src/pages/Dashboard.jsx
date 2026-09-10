import React, { useEffect, useState } from "react";
import { getJSON, postJSON } from "../api";
import Study from "./Study";

export default function Dashboard({ token, logout }){
  const [studies, setStudies] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(()=>{ fetchStudies(); }, []);

  async function fetchStudies(){
    try{
      const s = await getJSON("/studies", token);
      setStudies(s);
      if(s.length) setSelected(s[0].id);
    }catch(e){ alert("Error loading studies: "+e.message); }
  }

  async function createStudy(){
    const title = prompt("Study title");
    if(!title) return;
    try{
      await postJSON("/studies/", { title }, token);
      fetchStudies();
    }catch(e){ alert("Create failed: "+e.message); }
  }

  return (
    <div className="container">
      <header>
        <h1>TrialBridge MVP</h1>
        <div>
          <button onClick={createStudy}>Create Study</button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      <div className="two-col">
        <aside>
          <h3>Studies</h3>
          <ul>
            {studies.map(s => <li key={s.id}><button onClick={()=>setSelected(s.id)} className={selected===s.id?"active":""}>{s.title || `Study ${s.id}`}</button></li>)}
          </ul>
        </aside>
        <main>
          {selected ? <Study studyId={selected} token={token}/> : <div>No study selected</div>}
        </main>
      </div>
    </div>
  );
}
