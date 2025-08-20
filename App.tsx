import React, { useState, useRef } from 'react';
import { Prediction } from './types';

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // NEW STATE: To hold the aspect ratio of the uploaded image
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9); // Default to a standard 16:9
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setPredictions([]);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file.');
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  // UPDATED FUNCTION: Now sets the aspect ratio when the image preview loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    setAspectRatio(img.naturalWidth / img.naturalHeight);
  };

  const handleDetect = async () => {
    if (!imageFile) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setPredictions([]);
    setError(null);

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const response = await fetch('https://ehsanulhaque92-drone-detection-api.hf.space/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();

      if (data.status === 'success' && data.predictions) {
        const formattedPredictions: Prediction[] = data.predictions.map((pred: any) => ({
          box: {
            x1: pred.box[0],
            y1: pred.box[1],
            x2: pred.box[2],
            y2: pred.box[3],
          },
          label: pred.label,
          score: pred.score,
        }));
        setPredictions(formattedPredictions);
      } else {
        throw new Error(data.message || 'Invalid data structure received from API.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // SIMPLIFIED AND CORRECTED SCALING FUNCTION
  const getBoundingBoxStyle = (box: Prediction['box']): React.CSSProperties => {
    if (!imageRef.current) return {};
    
    // The parent container is now perfectly sized, so we can use simple percentages.
    // The model's input size was 600x600.
    const modelInputSize = 600;

    const left = (box.x1 / modelInputSize) * 100;
    const top = (box.y1 / modelInputSize) * 100;
    const width = ((box.x2 - box.x1) / modelInputSize) * 100;
    const height = ((box.y2 - box.y1) / modelInputSize) * 100;

    return {
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, entering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(entering);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e, false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-8 flex flex-col items-center w-full">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
          Drone Detection System
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Upload an image to identify and locate drones.
        </p>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Control Panel */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl border border-slate-700 p-6 flex flex-col gap-6 h-fit">
          <label
            htmlFor="file-upload"
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-slate-500">PNG, JPG or GIF</p>
            </div>
            <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>

          {imageFile && (
            <div className="text-center text-sm text-slate-300">
              Selected: <span className="font-medium text-cyan-400">{imageFile.name}</span>
            </div>
          )}

          <button
            onClick={handleDetect}
            disabled={!imageFile || isLoading}
            className="w-full bg-cyan-400 text-slate-900 font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out hover:bg-cyan-300 active:scale-95 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transform"
          >
            {isLoading ? 'Detecting...' : 'Detect Drones'}
          </button>
          {error && <p className="text-red-400 text-center">{error}</p>}
        </div>

        {/* Right Column: Display Area */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl border border-slate-700 p-6 flex items-center justify-center">
          <div 
            className="relative w-full"
            // This inline style dynamically sets the container's aspect ratio to match the image
            style={{ aspectRatio: aspectRatio }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-slate-700 rounded-lg animate-pulse"></div>
            )}
            {!isLoading && !imagePreview && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                Image preview will appear here
              </div>
            )}
            {imagePreview && (
                <img
                    ref={imageRef}
                    src={imagePreview}
                    alt="Drone detection preview"
                    onLoad={handleImageLoad}
                    // This className ensures the image fills the perfectly-sized container
                    className="absolute top-0 left-0 w-full h-full object-contain" 
                />
            )}
            {!isLoading && predictions.map((pred, index) => (
              <div
                key={index}
                style={getBoundingBoxStyle(pred.box)}
                className="border-2 border-cyan-400 transition-opacity duration-500 animate-fade-in"
              >
                <div className="absolute -top-6 left-0 bg-cyan-400 text-slate-900 text-xs font-semibold px-2 py-0.5 rounded-t-md whitespace-nowrap">
                  {pred.label}: {(pred.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;