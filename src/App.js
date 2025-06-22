// src/App.jsx
import React, { useState, useEffect } from "react";
import "./App.css";
import { CSVLink } from "react-csv";
import { useSwipeable } from "react-swipeable";

const LSMRCalculator = () => {
  const [teams, setTeams] = useState([]);
  const [b, setB] = useState(100000);
  const [totalTeams, setTotalTeams] = useState(20);
  const [shareVector, setShareVector] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [showPredictionSection, setShowPredictionSection] = useState(false);
  const [error, setError] = useState("");
  const [updatedProbs, setUpdatedProbs] = useState([]);
  const [results, setResults] = useState([]);
  const [lpSeeding, setLpSeeding] = useState(false);
  const [screenIndex, setScreenIndex] = useState(0);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setScreenIndex((prev) => Math.min(prev + 1, 2)),
    onSwipedRight: () => setScreenIndex((prev) => Math.max(prev - 1, 0))
  });

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("access");
    const config = queryParams.get("config");
    if (token === "xyz123") {
      setIsAuthenticated(true);
    }
    if (config) {
      try {
        const decoded = JSON.parse(atob(config));
        if (decoded.teams) setTeams(decoded.teams);
        if (decoded.b) setB(decoded.b);
        if (decoded.lpSeeding !== undefined) setLpSeeding(decoded.lpSeeding);
      } catch (e) {
        console.error("Invalid config format");
      }
    }
  }, []);

  const generateShareLink = () => {
    const payload = { teams, b, lpSeeding };
    const encoded = btoa(JSON.stringify(payload));
    const link = `${window.location.origin}?access=xyz123&config=${encoded}`;
    navigator.clipboard.writeText(link);
    alert("Configuration link copied to clipboard!");
  };

  const lmsrCost = (qOld, qNew) => {
    const expSumOld = qOld.reduce((sum, q) => sum + Math.exp(q / b), 0);
    const expSumNew = qNew.reduce((sum, q) => sum + Math.exp(q / b), 0);
    const cost = b * (Math.log(expSumNew) - Math.log(expSumOld));
    return parseFloat(cost.toFixed(3));
  };

  const computeProbabilities = (qVec) => {
    const expValues = qVec.map(q => Math.exp(q / b));
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    return expValues.map(v => ((v / sumExp) * 100).toFixed(2));
  };

  const handleTeamChange = (index, field, value) => {
    const newTeams = [...teams];
    newTeams[index][field] = field === "probability" ? parseFloat(value) : value;
    setTeams(newTeams);
  };

  const handlePredictionChange = (index, field, value) => {
    const newPredictions = [...predictions];
    newPredictions[index][field] = field === "shares" ? parseFloat(value) : value;
    setPredictions(newPredictions);
  };

  const addTeam = () => {
    setTeams([...teams, { name: "", probability: 0 }]);
  };

  const removeTeam = (index) => {
    const newTeams = [...teams];
    newTeams.splice(index, 1);
    setTeams(newTeams);
  };

  const beginPrediction = () => {
    const totalProb = teams.reduce((sum, t) => sum + (parseFloat(t.probability) || 0), 0);
    if (!lpSeeding && Math.abs(totalProb - 100) > 0.1) {
      setError("Total probability must sum to 100% (±0.1%)");
      return;
    }
    setError("");
    setPredictions(teams.map((team) => ({ name: team.name, direction: "YES", shares: 0 })));

    let adjustedShares;
    if (lpSeeding) {
      adjustedShares = Array(teams.length).fill(b);
    } else {
      const probs = teams.map(t => t.probability / 100);
      adjustedShares = probs.map(p => b * Math.log(p));
    }
    setShareVector(adjustedShares);
    setShowPredictionSection(true);
    setUpdatedProbs(computeProbabilities(adjustedShares));
  };

  const handleSimulate = () => {
    let qCurrent = [...shareVector];

    const updatedResults = predictions.map((prediction) => {
      const teamIndex = teams.findIndex((t) => t.name === prediction.name);
      if (teamIndex === -1) return null;

      const qOld = [...qCurrent];
      const qNew = [...qCurrent];
      const shares = prediction.shares;

      if (prediction.direction === "YES") {
        qNew[teamIndex] += shares;
      } else {
        const distribute = shares / (qNew.length - 1);
        qNew.forEach((_, i) => {
          if (i !== teamIndex) qNew[i] += distribute;
        });
      }

      const cost = lmsrCost(qOld, qNew);
      const payout = shares;
      const net = payout - cost;

      qCurrent = [...qNew];

      return {
        ...prediction,
        probability: teams[teamIndex].probability,
        cost,
        payout,
        net
      };
    }).filter(Boolean);

    setResults(updatedResults);
    setUpdatedProbs(computeProbabilities(qCurrent));
  };

  const exportData = results.map(res => ({
    Team: res.name,
    Direction: res.direction,
    Cost: res.cost,
    Payout: res.payout,
    Net: res.net.toFixed(2),
    "Final Probability (%)": updatedProbs[teams.findIndex(t => t.name === res.name)]
  }));

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-800 via-black to-gray-900 text-white animate-fade-in">
        <div className="text-center text-xl shadow-lg p-8 border border-purple-400 rounded-xl bg-opacity-70">
          🔒 Access Denied<br />Use <code>?access=xyz123</code> in URL
        </div>
      </div>
    );
  }

  return (
    <div {...swipeHandlers} className="min-h-screen bg-white text-gray-900 p-4 pb-20 animate-slide-in">
      <div className="max-w-4xl mx-auto">
        {screenIndex === 0 && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center">⚡ Predyx Profit Simulator</h1>
            <button onClick={generateShareLink} className="mb-4 w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded shadow-md hover:bg-blue-600 transition">🔗 Copy Config Link</button>

            <div className="mb-4">
              <label className="block">Liquidity (b value in sats)</label>
              <input type="number" value={b} onChange={e => setB(Number(e.target.value))} placeholder="e.g. 100000" />

              <label className="block mt-4">Total Number of Teams</label>
              <input type="number" value={totalTeams} onChange={e => setTotalTeams(Number(e.target.value))} placeholder="e.g. 20" />

              <div className="flex items-center mt-2">
                <input type="checkbox" checked={lpSeeding} onChange={() => setLpSeeding(!lpSeeding)} className="mr-2" />
                <label>Enable LP Seeding Mode</label>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Enter Team Probabilities</h3>
              {teams.map((team, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                  <input placeholder="Team Name" value={team.name} onChange={e => handleTeamChange(index, "name", e.target.value)} />
                  <input type="number" placeholder="Probability %" value={team.probability} onChange={e => handleTeamChange(index, "probability", e.target.value)} />
                  <button onClick={() => removeTeam(index)} className="bg-red-500 text-white">Remove</button>
                </div>
              ))}
              <button onClick={addTeam} className="mt-2">+ Add Team</button>
            </div>

            {error && <div className="text-red-600 font-semibold mb-4">{error}</div>}

            <button onClick={beginPrediction} className="mt-4 animate-click">Proceed to Prediction</button>
          </div>
        )}

        {screenIndex === 1 && showPredictionSection && (
          <div>
            <h3 className="text-xl font-bold mb-2">Prediction Section</h3>
            {predictions.map((p, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                <select value={p.name} onChange={e => handlePredictionChange(index, "name", e.target.value)}>
                  {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
                <select value={p.direction} onChange={e => handlePredictionChange(index, "direction", e.target.value)}>
                  <option>YES</option>
                  <option>NO</option>
                </select>
                <input type="number" value={p.shares} onChange={e => handlePredictionChange(index, "shares", e.target.value)} placeholder="Shares to Buy" />
              </div>
            ))}
            <button onClick={handleSimulate} className="mt-2 animate-click">🔮 Simulate</button>
          </div>
        )}

        {screenIndex === 2 && results.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4">Simulation Results</h3>
            <ul>
              {results.map((res, idx) => (
                <li key={idx} className="mb-2">
                  <strong>{res.name}</strong> [{res.direction}] — Cost: {res.cost} sats, Payout: {res.payout} sats, Net: {res.net.toFixed(2)} sats
                </li>
              ))}
            </ul>
            <h4 className="mt-4 font-semibold">Updated Market Probabilities</h4>
            <ul>
              {updatedProbs.map((prob, idx) => (
                <li key={idx}>{teams[idx].name}: {prob}%</li>
              ))}
            </ul>
            <CSVLink data={exportData} className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition">📥 Export CSV</CSVLink>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t border-gray-300 py-2">
        <button onClick={() => setScreenIndex(0)} className={screenIndex === 0 ? "text-blue-600 font-bold" : "text-gray-500"}>🏁 Setup</button>
        <button onClick={() => setScreenIndex(1)} className={screenIndex === 1 ? "text-blue-600 font-bold" : "text-gray-500"}>📊 Predict</button>
        <button onClick={() => setScreenIndex(2)} className={screenIndex === 2 ? "text-blue-600 font-bold" : "text-gray-500"}>📥 Export</button>
      </div>
    </div>
  );
};

export default LSMRCalculator;
