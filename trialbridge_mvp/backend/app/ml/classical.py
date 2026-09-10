import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB

def train_logistic_regression(X_train, y_train, random_state=42):
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, random_state=random_state)),
    ])
    pipeline.fit(X_train, y_train)
    return pipeline

def train_gaussian_nb(X_train, y_train):
    clf = GaussianNB()
    clf.fit(X_train, y_train)
    return clf

def predict_proba(model, X):
    if hasattr(model, "predict_proba"):
        return model.predict_proba(X)[:, 1]
    if hasattr(model, "decision_function"):
        scores = model.decision_function(X)
        probs = 1 / (1 + np.exp(-scores))
        return probs
    return model.predict(X)
