import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import { UserEvent, ContextType, Track } from '../types';
import { calculateUserVector } from '../services/recommendationEngine';

interface ZunoBrainProps {
  logs: UserEvent[];
  context: ContextType;
  history: Track[];
}

const ZunoBrain: React.FC<ZunoBrainProps> = ({ logs, context, history }) => {
  const userVector = calculateUserVector(history);
  
  // Data for Radar Chart (User Profile vs Context Ideal)
  const radarData = [
    { subject: 'Energy', A: userVector.energy * 100, B: context === ContextType.Workout ? 90 : context === ContextType.Rainy ? 20 : 50, fullMark: 100 },
    { subject: 'Happy', A: userVector.valence * 100, B: context === ContextType.Party ? 90 : 50, fullMark: 100 },
    { subject: 'BPM (Norm)', A: (userVector.bpm / 180) * 100, B: context === ContextType.Workout ? 80 : 30, fullMark: 100 },
  ];

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-indigo-500">🧠</span> ZUNO Engine Visualization
        </h1>
        <p className="text-zinc-400">Real-time view of the recommendation pipeline layers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Card 1: Vector Space */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 text-white">Layer 1: Vector Space Matching</h3>
            <p className="text-xs text-zinc-500 mb-4">Comparing User History (Blue) vs. Current Context Ideal (Purple)</p>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="User Profile" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar name="Context Ideal" dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                    />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Card 2: Live Event Log */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-white">Layer 0: Data Collection</h3>
            <p className="text-xs text-zinc-500 mb-4">Streaming raw events to Data Lake</p>
            
            <div className="flex-1 overflow-y-auto bg-black/40 rounded-lg p-4 font-mono text-xs border border-zinc-800/50 h-64">
                {logs.length === 0 ? (
                    <div className="text-zinc-600 italic">Waiting for user interaction...</div>
                ) : (
                    logs.slice().reverse().map((log, i) => (
                        <div key={i} className="mb-2 border-l-2 border-indigo-500 pl-2">
                            <span className="text-zinc-500">[{log.timestamp}]</span>{' '}
                            <span className="text-indigo-400">{log.event.toUpperCase()}</span>{' '}
                            <span className="text-zinc-300">track:{log.trackId}</span>{' '}
                            <span className="text-zinc-600">ctx:{log.context}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Card 3: Architecture Diagram (Simulated with text/css for simplicity vs complex D3 here) */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
        <h3 className="text-lg font-bold mb-8 text-white">System Architecture</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
            
            <div className="flex-1 p-4 bg-zinc-950 rounded border border-zinc-800 relative group hover:border-indigo-500 transition">
                <div className="text-2xl mb-2">👤</div>
                <h4 className="font-bold">User</h4>
                <p className="text-[10px] text-zinc-500">Action: Play/Skip</p>
                <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-zinc-700 md:hidden"></div>
                <div className="absolute -right-4 top-1/2 h-0.5 w-4 bg-zinc-700 hidden md:block"></div>
            </div>

            <div className="flex-1 p-4 bg-zinc-950 rounded border border-zinc-800 relative group hover:border-emerald-500 transition">
                <div className="text-2xl mb-2">📡</div>
                <h4 className="font-bold">Collector</h4>
                <p className="text-[10px] text-zinc-500">Kafka / Event Bus</p>
                <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-zinc-700 md:hidden"></div>
                <div className="absolute -right-4 top-1/2 h-0.5 w-4 bg-zinc-700 hidden md:block"></div>
            </div>

            <div className="flex-1 p-4 bg-indigo-900/20 rounded border border-indigo-500/50 relative shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <div className="text-2xl mb-2">🧠</div>
                <h4 className="font-bold text-indigo-300">ZUNO Engine</h4>
                <p className="text-[10px] text-indigo-200/50">Hybrid Filtering + LLM</p>
                <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-zinc-700 md:hidden"></div>
                <div className="absolute -right-4 top-1/2 h-0.5 w-4 bg-zinc-700 hidden md:block"></div>
            </div>

            <div className="flex-1 p-4 bg-zinc-950 rounded border border-zinc-800 relative group hover:border-purple-500 transition">
                <div className="text-2xl mb-2">📱</div>
                <h4 className="font-bold">UI Client</h4>
                <p className="text-[10px] text-zinc-500">React + Context</p>
            </div>

        </div>
      </div>

    </div>
  );
};

export default ZunoBrain;