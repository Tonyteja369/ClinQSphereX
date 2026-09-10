# TrialBridge MVP — Project Structure

```text
trialbridge_mvp/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── db.py
│       ├── models.py
│       ├── schemas.py
│       ├── auth.py
│       ├── seed_admin.py
│       ├── routes_auth.py
│       ├── routes_studies.py
│       ├── routes_candidates.py
│       ├── routes_train.py
│       ├── utils.py
│       ├── data/
│       │   └── synthea_sample.json
│       └── ml/
│           ├── __init__.py
│           ├── data_gen.py
│           ├── classical.py
│           ├── quantum_kernel.py
│           └── trainer.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── styles.css
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Study.jsx
│           └── Candidate.jsx
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── PROJECT_STRUCTURE.md
```

## Important
This is a hackathon MVP. Do not use it with real patient data without appropriate security, privacy, legal, and ethical review.
