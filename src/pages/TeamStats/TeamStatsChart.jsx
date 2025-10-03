import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './TeamStatsChart.css';

export const TeamStatsChart = ({ data }) => {
  const matchResultsData = [
    { name: 'Wins', value: data.wins, color: '#28a745' },
    { name: 'Draws', value: data.draws, color: '#ffc107' },
    { name: 'Losses', value: data.losses, color: '#dc3545' }
  ];

  const goalsData = [
    { name: 'Goals For', value: data.goalsFor, color: '#007bff' },
    { name: 'Goals Against', value: data.goalsAgainst, color: '#dc3545' }
  ];

  const monthlyData = [
    { month: 'Jan', goals: 8, points: 9 },
    { month: 'Feb', goals: 12, points: 12 },
    { month: 'Mar', goals: 6, points: 6 },
    { month: 'Apr', goals: 10, points: 7 },
    { month: 'May', goals: 9, points: 9 }
  ];

  return (
    <div className="team-stats-chart">
      <h3>Performance Analysis</h3>
      
      <div className="charts-grid">
        <div className="chart-container">
          <h4>Match Results</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={matchResultsData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {matchResultsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h4>Goals Comparison</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={goalsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#007bff" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container full-width">
          <h4>Monthly Performance</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="goals" fill="#007bff" name="Goals" />
              <Bar yAxisId="right" dataKey="points" fill="#28a745" name="Points" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
