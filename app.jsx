import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LSMRCalculator = () => {
  const [teams, setTeams] = useState([]);
  const [b, setB] = useState(1000);
  const [totalTeams, setTotalTeams] = useState(20);

  const calcCost = (teamProb, shares) => {
    const q_old = (teamProb / 100) * b;
    const q_new = q_old + shares;
    const c_old = b * Math.log(Math.exp(q_old / b) + (totalTeams - 1));
    const c_new = b * Math.log(Math.exp(q_new / b) + (totalTeams - 1));
    return Math.round(c_new - c_old);
  };

  const handleChange = (index, field, value) => {
    const newTeams = [...teams];
    newTeams[index][field] = field === "shares" || field === "probability" ? parseFloat(value) : value;
    setTeams(newTeams);
  };

  const addTeam = () => {
    setTeams([...teams, { name: "", probability: 0, shares: 0, direction: "YES" }]);
  };

  const removeTeam = (index) => {
    const newTeams = [...teams];
    newTeams.splice(index, 1);
    setTeams(newTeams);
  };

  const simulateProfit = () => {
    const results = teams.map((team) => {
      const cost = calcCost(team.probability, team.direction === "YES" ? team.shares : -team.shares);
      const winPayout = team.direction === "YES" ? 100 * team.shares : 0;
      const lossPayout = 0;
      const netProfit = winPayout - cost;
      return { ...team, cost, winPayout, netProfit };
    });
    return results;
  };

  const results = simulateProfit();

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Prediction Market Profit Calculator</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium">Total Outcomes in Market</label>
        <Input
          type="number"
          value={totalTeams}
          onChange={(e) => setTotalTeams(parseInt(e.target.value))}
          placeholder="e.g. 20 for FIFA, 10 for T20"
        />
      </div>

      <Button className="mb-4" onClick={addTeam}>Add Team/Outcome</Button>

      {teams.map((team, index) => (
        <div key={index} className="border p-3 rounded-xl mb-4">
          <div className="mb-2 font-semibold">Outcome {index + 1}</div>
          <div className="flex gap-2 mb-2">
            <Input
              type="text"
              value={team.name}
              onChange={(e) => handleChange(index, "name", e.target.value)}
              placeholder="Team/Outcome Name"
            />
            <Input
              type="number"
              value={team.probability}
              onChange={(e) => handleChange(index, "probability", e.target.value)}
              placeholder="Probability (%)"
            />
            <Input
              type="number"
              value={team.shares}
              onChange={(e) => handleChange(index, "shares", e.target.value)}
              placeholder="Shares"
            />
            <select
              className="border rounded px-2"
              value={team.direction}
              onChange={(e) => handleChange(index, "direction", e.target.value)}
            >
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
            <Button variant="destructive" onClick={() => removeTeam(index)}>
              ✕
            </Button>
          </div>
          <div className="text-sm text-gray-700">
            Cost: {calcCost(team.probability, team.direction === "YES" ? team.shares : -team.shares)} sats<br />
            Profit on Win: {results[index].winPayout} sats<br />
            Net Gain/Loss: {results[index].netProfit} sats
          </div>
        </div>
      ))}

      <Button onClick={() => alert("Profit/Loss simulated. See results below.")}>Simulate Profit</Button>
    </div>
  );
};

export default LSMRCalculator;
