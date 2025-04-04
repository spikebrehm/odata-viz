import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ODataMetadataUploader from './components/ODataMetadataUploader';
import ODataMetadataViewer from './components/ODataMetadataViewer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">OData Metadata Visualizer</h1>
          </div>
        </header>
        <main>
          <ODataMetadataUploader>{(parser) => (
            <Routes>
              <Route path="/" element={<Navigate to="/entity" replace />} />
              <Route path="/entity" element={<ODataMetadataViewer parser={parser} />} />
              <Route path="/entity/:selectedEntityType" element={<ODataMetadataViewer parser={parser} />} />
            </Routes>
          )}</ODataMetadataUploader>
        </main>
      </div>
    </Router>
  );
}

export default App;
