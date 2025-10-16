'use client';
import { useState, useEffect } from 'react';
// Helper to calculate gallons
function calculateGallons(pool: any) {
  const length = Number(pool.length) || 0;
  const width = Number(pool.width) || 0;
  const shallow = Number(pool.shallow) || 0;
  const deep = Number(pool.deep) || 0;
  // Simple average depth formula
  const avgDepth = (shallow + deep) / 2;
  return Math.round(length * width * avgDepth * 7.48); // 7.48 gallons per cubic foot
}

const chlorineSteps = [0, 1, 2, 3, 5, 7.5, 10];
const chemicalFields = [
  { key: 'chlorine', label: 'Chlorine (Cl)', min: 0, max: 10, step: 1 },
  { key: 'pH', label: 'pH', min: 7.0, max: 8.0, step: 0.2 },
  { key: 'alkalinity', label: 'Alkalinity', min: 0, max: 150, step: 10 },
  { key: 'calcium', label: 'Calcium', min: 0, max: 400, step: 10 },
  { key: 'CYA', label: 'CYA', min: 0, max: 100, step: 10 },
  { key: 'salt', label: 'Salt', min: 0, max: 3800, step: 200 },
];

const defaultIdeal = {
  chlorine: 3,
  pH: 7.4,
  alkalinity: 80,
  calcium: 250,
  CYA: 30,
  salt: 3000,
};

const defaultCurrent = {
  chlorine: 0,
  pH: 7.0,
  alkalinity: 0,
  calcium: 0,
  CYA: 0,
  salt: 0,
};


export default function HomePage() {
  const [ideal, setIdeal] = useState(defaultIdeal);
  const [current, setCurrent] = useState(defaultCurrent);
  const [currentTouched, setCurrentTouched] = useState({
    chlorine: false,
    pH: false,
    alkalinity: false,
    calcium: false,
    CYA: false,
    salt: false,
  });
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolIdx, setSelectedPoolIdx] = useState<number | null>(null);
  const [showAddPool, setShowAddPool] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch pools from cookie
  useEffect(() => {
    async function fetchPools() {
      const res = await fetch('/api/pooldata');
      const data = await res.json();
      setPools(data.poolData || []);
      const poolList = data.poolData || [];
      setPools(poolList);
      if (poolList.length === 0) {
        setShowAddPool(true);
      }
      setSelectedPoolIdx(poolList.length > 0 ? 0 : null);
    }
    fetchPools();
  }, []); 


  const selectedGallons = pools[selectedPoolIdx ?? 0]?.gallons;
  // chemCalc(label, current[label as keyof typeof current], ideal[label as keyof typeof ideal])
  const chemCalc = (key: string, label: string, currentLevel: number, idealLevel: number, poolGallons: number, mode: 'text' | 'jsx' = 'jsx') => {
    const diff = idealLevel - currentLevel;

    const textOutput = (message: string) => `${label}: ${message}`;
    const jsxOutput = (message: string) => <p key={key}>{label}: {message}</p>;
    const output = mode === 'text' ? textOutput : jsxOutput;

    if (key === 'chlorine') {
      return output(diff > 0 ? `Add some shock` : `Don't add chlorine until you reach your ideal level`);
    }
    if (key === 'pH') {
      return output(
        diff < 0
          ? `Add ${((0.328125 / 1) * -diff * (poolGallons / 10000)).toFixed(2)} gallons of acid or ${(
              ((0.328125 / 1) * -diff * (poolGallons / 10000) * (128 / 1) * (6.33 / 24))
            ).toFixed(0)} seconds of pour`
          : diff > 0
          ? `Add ${((30 / 10000) * diff * poolGallons * (6.33 / 24)).toFixed(0)} seconds of pouring pH Up`
          : 'same current and ideal levels'
      );
    }
    if (key === 'alkalinity') {
      return output(
        diff < 0
          ? `Pour some acid, check your pH and adjust as needed`
          : diff > 0
          ? `Add ${((1.5 / 10) * (poolGallons / 10000) * (diff / 1) * (16 / 25)).toFixed(2)} scoops of bicarb (using blue scooper)`
          : 'same current and ideal levels'
      );
    }
    if (key === 'calcium') {
      return output(
        diff > 0
          ? `Add ${((1 / 50) * (1.1 / 10) * diff * (poolGallons / 10000)).toFixed(2)} bags of Calcium`
          : diff < 0
          ? `Drain some of the pool water if you badly need to lower. (brush first!)`
          : 'same current and ideal levels'
      );
    }
    if (key === 'CYA') {
      return output(
        diff > 0
          ? `Add ${((1 / 30) * (1 / 4000) * poolGallons * (16 / 25) * diff).toFixed(2)} scoops of stabilizer granule`
          : 'stop using Chlorine tabs and wait for CYA to naturally drop, or drain some water if you badly need to lower level'
      );
    }
    if (key === 'salt') {
      return output(
        diff > 0
          ? `Add ${((13 / 8000) * (poolGallons / 200) * (diff / 1) * (1 / 40)).toFixed(2)} bags of salt`
          : 'drain pool or wait for dilution from rain'
      );
    }
  };

  function handleIdealChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setIdeal({ ...ideal, [name]: Number(value) });
  }

  function handleCurrentChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setCurrent({ ...current, [name]: Number(value) });
    setCurrentTouched({ ...currentTouched, [name]: true });
  }

  // Add/Edit/Delete pool handlers
  async function handleDeletePool(idx: number) {
    const newPools = pools.filter((_, i) => i !== idx);
    await fetch('/api/pooldata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool: null, pools: newPools }),
    });
    setPools(newPools);
    if (selectedPoolIdx === idx) setSelectedPoolIdx(null);
  }

  // For demo: Add/Edit pool UI is basic
  function PoolForm({ onSave, initial }: { onSave: (pool: any) => void; initial?: any }) {
  const [form, setForm] = useState(initial || { name: '', length: '', width: '', shallow: '', deep: '', gallons: '' });
  const [manualGallons, setManualGallons] = useState(false);
  const [showGallonsOnly, setShowGallonsOnly] = useState(false);

    // Calculate gallons if not in manual mode
    const calculatedGallons = (!manualGallons && form.length && form.width && form.shallow && form.deep)
      ? Math.round(Number(form.length) * Number(form.width) * ((Number(form.shallow) + Number(form.deep)) / 2) * 7.48)
      : '';

    // If user types in gallons, switch to manual mode (but don't erase dimensions)
    function handleGallonsChange(e: React.ChangeEvent<HTMLInputElement>) {
      setManualGallons(true);
      setForm({ ...form, gallons: e.target.value });
    }

    function handleGallonsBlur() {
      // If gallons is empty, restore dimension fields
      if (!form.gallons || form.gallons === '') {
        setManualGallons(false);
        setShowGallonsOnly(false);
      }
    }

    // If user types in any dimension, switch to auto mode (but don't erase gallons)
    function handleDimensionChange(field: string, value: string) {
      setManualGallons(false);
      setForm({ ...form, [field]: value });
    }

    return (
      <div className="p-4 border rounded bg-white bg-opacity-80 shadow-md">
        <h3 className="font-bold mb-2">{initial ? 'Edit Pool' : 'Add New Pool'}</h3>
        <div className="space-y-2">
          <input className="border p-1 w-full" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          {/* Show dimensions and calculated gallons unless in gallons-only mode */}
          {!showGallonsOnly && (
            <>
              {/* Only show dimensions if not in manual gallons mode */}
              {!manualGallons && (
                <>
                  <div className="flex items-center space-x-2">
                    <span>Size: </span>
                    <div className="relative w-1/6">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="border p-1 pr-4 w-full"
                        value={form.length}
                        onChange={e => handleDimensionChange('length', e.target.value)}
                        onKeyDown={e => {
                          if (
                            !/[0-9]/.test(e.key) &&
                            !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '.', '-'].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">ft</span>
                    </div>
                    <span>X</span>
                    <div className="relative w-1/6">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="border p-1 pr-4 w-full"
                        value={form.width}
                        onChange={e => handleDimensionChange('width', e.target.value)}
                        onKeyDown={e => {
                          if (
                            !/[0-9]/.test(e.key) &&
                            !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '.', '-'].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">ft</span>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <span>Shallow End: </span>
                    <div className="relative w-1/7">
                      <input
                        type="number"
                        inputMode="numeric"
                        className="border p-1 pr-5 w-full"
                        value={form.shallow}
                        onChange={e => handleDimensionChange('shallow', e.target.value)}
                        onKeyDown={e => {
                          if (
                            !/[0-9]/.test(e.key) &&
                            !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '.', '-'].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">ft</span>
                    </div>
                    <span>Deep End:</span>
                    <div className="relative w-1/7">
                      <input
                        type="number"
                        inputMode="numeric"
                        className="border p-1 pr-4 w-full"
                        value={form.deep}
                        onChange={e => handleDimensionChange('deep', e.target.value)}
                        onKeyDown={e => {
                          if (
                            !/[0-9]/.test(e.key) &&
                            !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '.', '-'].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">ft</span>
                    </div>
                  </div>
                </>
              )}
              {/* Calculated gallons display and manual button */}
              <div className="flex items-center space-x-2 mt-2">
                <span>Calculated gallons: <span className="font-semibold">{calculatedGallons || '--'}</span></span>
              </div>
              <div className="flex items-center mt-2">
                <button
                  type="button"
                  className="bg-gray-200 px-2 py-1 rounded text-blue-700 hover:bg-blue-100 border border-blue-300"
                  onClick={() => { setShowGallonsOnly(true); setManualGallons(true); }}
                >Manually Add Gallons</button>
              </div>
            </>
          )}

          {/* Gallons input only view */}
          {showGallonsOnly && (
            <div className="flex flex-col items-start space-y-2">
              <label className="mb-1">Manual gallons entry:</label>
              <div className='relative w-full'>
                <input
                  type="number"
                  inputMode="numeric"
                  className="border p-1 pr-10 w-full bg-gray-100 text-gray-500 focus:bg-gray-200 focus:text-gray-700"
                  placeholder="Gallons"
                  value={form.gallons}
                  onChange={handleGallonsChange}
                  onBlur={handleGallonsBlur}
                  style={{ opacity: 0.8 }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">gal</span>
              </div>
              <button
                type="button"
                className="bg-gray-200 px-2 py-1 rounded text-blue-700 hover:bg-blue-100 border border-blue-300 mt-2"
                  onClick={() => {
                    setShowGallonsOnly(false);
                    setManualGallons(false);
                  }}
              >Go to Gallons Calculator</button>
            </div>
          )}

          <button className="bg-blue-500 text-white px-3 py-1 rounded mt-4" onClick={() => {
            const poolToSave = { ...form };
            if (showGallonsOnly) {
              // Save manual gallons
              poolToSave.gallons = form.gallons;
            } else {
              // Save calculated gallons
              poolToSave.gallons = calculatedGallons || '';
            }

            onSave(poolToSave);
            setSelectedPoolIdx(pools.length)
          }}>{initial ? 'Save' : 'Add'}</button>
        </div>
      </div>
    );
  }

  async function handleAddPool(pool: any) {
    // Always update gallons before saving
    const poolToSave = { ...pool };
    if (!poolToSave.name || poolToSave.name.trim() === '') {
      poolToSave.name = 'Unnamed Pool';
    }
    if (!poolToSave.gallons || poolToSave.gallons === '') {
      const length = Number(poolToSave.length) || 0;
      const width = Number(poolToSave.width) || 0;
      const shallow = Number(poolToSave.shallow) || 0;
      const deep = Number(poolToSave.deep) || 0;
      if (length && width && shallow && deep) {
        const avgDepth = (shallow + deep) / 2;
        poolToSave.gallons = Math.round(length * width * avgDepth * 7.48);
      }
    }
    const newPools = [...pools, poolToSave];
    await fetch('/api/pooldata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool: poolToSave }),
    });
    setPools(newPools);
    setShowAddPool(false);
  }

  async function handleEditPool(pool: any) {
    if (editIdx === null) return;
    // Always update gallons before saving
    const poolToSave = { ...pool };
    if (!poolToSave.name || poolToSave.name.trim() === '') {
      poolToSave.name = 'Unnamed Pool';
    }
    if (!poolToSave.gallons || poolToSave.gallons === '') {
      const length = Number(poolToSave.length) || 0;
      const width = Number(poolToSave.width) || 0;
      const shallow = Number(poolToSave.shallow) || 0;
      const deep = Number(poolToSave.deep) || 0;
      if (length && width && shallow && deep) {
        const avgDepth = (shallow + deep) / 2;
        poolToSave.gallons = Math.round(length * width * avgDepth * 7.48);
      }
    }
    const newPools = pools.map((p, i) => (i === editIdx ? poolToSave : p));
    await fetch('/api/pooldata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ pool: null, pools: newPools }),
    });
    setPools(newPools);
    setEditIdx(null);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Pool Chemical Calculator</h1>
      {/* Pool Selector Dropdown */}
      <div className="mb-8 w-full max-w-xl mx-auto">
        <div className="flex items-center gap-4">
          <select
            className="border border-blue-300 bg-white text-gray-700 px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition w-full"
            value={selectedPoolIdx ?? ''}
            onChange={e => setSelectedPoolIdx(e.target.value === '' ? null : Number(e.target.value))}
          >
            {/* <option value="">Select a pool...</option> */}
            {pools.map((pool, idx) => (
              pool && pool.name ? (
                <option key={idx} value={idx}>
                  {pool.name}, {pool.gallons} gallons
                </option>
              ) : null
            ))}
          </select>
        </div>
        {/* Centered icon actions below dropdown */}
        <div className="flex justify-center gap-8 mt-4">
          <button
            aria-label="Share Pool Data"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow flex items-center justify-center"
            onClick={() => {
              if (selectedPoolIdx === null) {
                alert('No pool selected to share.');
                return;
              }
              const pool = pools[selectedPoolIdx];

              const chemicalLevels = Object.entries(current)
                .filter(([key]) => currentTouched[key as keyof typeof currentTouched])
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');

              const suggestedChemicals = chemicalFields
                .filter(field => currentTouched[field.key as keyof typeof currentTouched])
                .map(field => chemCalc(
                  field.key,
                  field.label,
                  current[field.key as keyof typeof current],
                  ideal[field.key as keyof typeof ideal],
                  pool.gallons,
                  'text'
                ))
                .filter(Boolean)
                .join('\n');

              const currentDate = new Date().toLocaleDateString();

              const shareText =
                `Pool name: ${pool.name}\n` +
                `Pool gallons: ${pool.gallons}\n` +
                `Date: ${currentDate}\n` +
                `Time: ${new Date().toLocaleTimeString()}\n` +
                `Current pool chemical levels:\n${chemicalLevels}\n` +
                `Suggested chemicals to add:\n${suggestedChemicals}`;

              if (navigator.share) {
                navigator.share({
                  title: `Pool Data: ${pool.name}`,
                  text: shareText,
                })
                  .then(() => console.log('Shared successfully'))
                  .catch(err => console.error('Error sharing:', err));
              } else {
                alert('Sharing is not supported on this device.');
              }
            }}
            style={{ width: 44, height: 44 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4m-4-4l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>

          <button
            aria-label="Add Pool"
            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-2 shadow flex items-center justify-center"
            onClick={() => setShowAddPool(true)}
            style={{ width: 44, height: 44 }}
          >
            {/* Plus icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button
            aria-label="Edit Pool"
            className={`bg-yellow-400 hover:bg-yellow-500 text-white rounded-full p-2 shadow flex items-center justify-center${selectedPoolIdx === null ? ' opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => selectedPoolIdx !== null && setEditIdx(selectedPoolIdx)}
            disabled={selectedPoolIdx === null}
            style={{ width: 44, height: 44 }}
          >
            {/* Pencil icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.661,19.113,3,21l1.887-5.661ZM20.386,7.388a2.1,2.1,0,0,0,0-2.965l-.809-.809a2.1,2.1,0,0,0-2.965,0L6.571,13.655l3.774,3.774Z" /></svg>
          </button>
          <button
            aria-label="Delete Pool"
            className={`bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow flex items-center justify-center${selectedPoolIdx === null ? ' opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => selectedPoolIdx !== null && setShowDeleteConfirm(true)}
            disabled={selectedPoolIdx === null}
            style={{ width: 44, height: 44 }}
          >
            {/* Trash icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.5,4H16.86l-.69-2.06A1.37,1.37,0,0,0,14.87,1H10.13a1.37,1.37,0,0,0-1.3.94L8.14,4H4.5a.5.5,0,0,0,0,1h.34l1,17.59A1.45,1.45,0,0,0,7.2,24H17.8a1.45,1.45,0,0,0,1.41-1.41L20.16,5h.34a.5.5,0,0,0,0-1ZM9.77,2.26A.38.38,0,0,1,10.13,2h4.74a.38.38,0,0,1,.36.26L15.81,4H9.19Zm8.44,20.27a.45.45,0,0,1-.41.47H7.2a.45.45,0,0,1-.41-.47L5.84,5H19.16Z" /></svg>
          </button>
        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm mx-auto flex flex-col items-center">
              <h3 className="text-lg font-semibold mb-4">
                Are you sure you want to delete the pool {selectedPoolIdx !== null && pools[selectedPoolIdx] ? pools[selectedPoolIdx].name : ''}?
              </h3>
              <div className="flex gap-4">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={() => {
                    if (selectedPoolIdx !== null) handleDeletePool(selectedPoolIdx);
                    setShowDeleteConfirm(false);
                  }}
                >Delete</button>
                <button
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  onClick={() => setShowDeleteConfirm(false)}
                >Cancel</button>
              </div>
            </div>
          </div>
        )}
        </div>
        {/* Add/Edit Pool Modal */}
        {showAddPool && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="relative rounded-lg p-6 w-full max-w-md mx-auto">
              <PoolForm onSave={handleAddPool} />
              {pools.length !== 0 && <button className="absolute top-2 left-3 bg-red-200 px-3 py-1 rounded-lg shadow hover:bg-red-400" onClick={() => setShowAddPool(false)}>Close</button>}
            </div>
          </div>
        )}
        {editIdx !== null && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="relative rounded-lg p-6 w-full max-w-md mx-auto">
              <PoolForm initial={pools[editIdx]} onSave={handleEditPool} />
              <button className="absolute top-2 left-3 bg-red-200 px-3 py-1 rounded-lg shadow hover:bg-red-400" onClick={() => setEditIdx(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
  <form className="space-y-4 p-4 border rounded bg-white/80 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-2">Current Pool Chemical Levels</h2>
          {chemicalFields.map(({ key, label, min, max, step }) => (
            <div key={key}>
              <label className="mr-2">{label}: {currentTouched[key as keyof typeof currentTouched] ? current[key as keyof typeof current] : <span className="text-gray-400">--</span>}</label>
              {key === 'chlorine' ? (
                <>
                  <input
                    type="range"
                    name={key}
                    min={0}
                    max={chlorineSteps.length - 1}
                    step={1}
                    value={currentTouched.chlorine ? chlorineSteps.indexOf(current.chlorine) : 0}
                    onChange={e => {
                      const idx = Number(e.target.value);
                      setCurrent({ ...current, chlorine: chlorineSteps[idx] });
                      setCurrentTouched({ ...currentTouched, chlorine: true });
                    }}
                    style={{ opacity: currentTouched.chlorine ? 1 : 0.5 }}
                    className="w-full h-8 accent-blue-500 slider-thumb-lg slider-track-lg"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{chlorineSteps[0]}</span>
                    <span>{chlorineSteps[Math.floor(chlorineSteps.length/2)]}</span>
                    <span>{chlorineSteps[chlorineSteps.length-1]}</span>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="range"
                    name={key}
                    min={min}
                    max={max}
                    step={step}
                    value={currentTouched[key as keyof typeof currentTouched] ? current[key as keyof typeof current] : min}
                    onChange={handleCurrentChange}
                    style={{ opacity: currentTouched[key as keyof typeof currentTouched] ? 1 : 0.5 }}
                    className="w-full h-8 accent-blue-500 slider-thumb-lg slider-track-lg value-inside-thumb"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{min}</span>
                    <span>{Math.round((min + max) / 2)}</span>
                    <span>{max}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </form>
        
  <form className="space-y-4 p-4 border rounded bg-white/80 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-2">Ideal Chemical Levels</h2>
          {chemicalFields.map(({ key, label, min, max, step }) => (
            <div key={key}>
                <label className="mr-2">{label}: {ideal[key as keyof typeof ideal]}</label>
              {key === 'chlorine' ? (
                <>
                  <input
                    type="range"
                    name={key}
                    min={0}
                    max={chlorineSteps.length - 1}
                    step={1}
                    value={chlorineSteps.indexOf(ideal.chlorine)}
                    onChange={e => {
                      const idx = Number(e.target.value);
                      setIdeal({ ...ideal, chlorine: chlorineSteps[idx] 
                      });
                    }}
                    className="w-full h-8 accent-blue-500 slider-thumb-lg slider-track-lg value-inside-thumb"
                    data-value={ideal.chlorine}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{chlorineSteps[0]}</span>
                    <span>{chlorineSteps[Math.floor(chlorineSteps.length/2)]}</span>
                    <span>{chlorineSteps[chlorineSteps.length-1]}</span>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="range"
                    name={key}
                    min={min}
                    max={max}
                    step={step}
                    value={ideal[key as keyof typeof ideal]}
                    onChange={handleIdealChange}
                    className="w-full h-8 accent-blue-500 slider-thumb-lg slider-track-lg value-inside-thumb"
                    data-value={ideal[key as keyof typeof ideal]}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{min}</span>
                    <span>{Math.round((min + max) / 2)}</span>
                    <span>{max}</span>
                  </div>
                  </>
              )}
            </div>
          ))}
        </form>

  <div className="space-y-4 p-4 border rounded bg-white/80 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-2">Suggested Chemicals to Add</h2>
          <ul>
            {chemicalFields.map(({ key, label }) => {
              // Only show if user has interacted with the slider
              if (!currentTouched[key as keyof typeof currentTouched]) return null;
              const diff = ideal[key as keyof typeof ideal] - current[key as keyof typeof current];
              if (Math.abs(diff) < 0.01) return (
                <li key={key} className="text-gray-500">{label}: Current and Ideal levels are the same</li>
              );
              // if (label == "Chlorine (Cl)") {
              //   return (
              //     <li key={key} className="text-gray-500">{label}: {diff > 0 ? `Add some
              //   );
              // }

              return (
                <li key={key}>
                  {/* edge case (you shouldn't be seeing this) */}
                  {/* {label}: {diff > 0 ? `Add ${diff}` : `Remove ${Math.abs(diff)}`} */}
                  {chemCalc(key, label, current[key as keyof typeof current], ideal[key as keyof typeof ideal], selectedGallons)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <style jsx global>{`
        input[type='range'].slider-thumb-lg::-webkit-slider-thumb {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #3b82f6;
            
            cursor: pointer;
            position: relative;
            /* Center thumb vertically in Safari */
            transform: translateY(-16px);
        }
        input[type='range'].slider-thumb-lg::-webkit-slider-thumb::after {
          content: attr(data-value);
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          color: #fff;
          font-size: 1rem;
          font-weight: bold;
          pointer-events: none;
        }
        input[type='range'].slider-thumb-lg::-moz-range-thumb {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        input[type='range'].slider-thumb-lg::-ms-thumb {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        input[type='range'].slider-track-lg::-webkit-slider-runnable-track {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
        }
        input[type='range'].slider-track-lg::-moz-range-track {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
        }
        input[type='range'].slider-track-lg::-ms-fill-lower,
        input[type='range'].slider-track-lg::-ms-fill-upper {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
        }
      `}</style>
    </main>
  );
}
