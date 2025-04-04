import { useState } from "react";
import { ODataMetadataParser } from "../util/parser";

export default function ODataMetadataUploader({ children }: { children: (parser: ODataMetadataParser) => React.ReactNode }) {
    const [parser, setParser] = useState<ODataMetadataParser | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setError(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                const xmlContent = e.target?.result as string;
                try {
                    setParser(new ODataMetadataParser(xmlContent));
                } catch (error) {
                    setError(error instanceof Error ? error.message : 'Unknown error occurred');
                    setParser(null);
                }
            };
            reader.onerror = () => {
                setError('Error reading file');
                setParser(null);
            };
            reader.readAsText(file);
        }
    };

    return parser ? children(parser) : (<>
        {/* File upload section */}
        <div className="w-full h-full flex items-center justify-center p-12">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">OData Metadata Viewer</h2>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Upload OData Metadata XML
                    </label>
                    <input
                        type="file"
                        accept=".xml"
                        onChange={handleFileUpload}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {error && (
                    <div className="text-red-500 text-sm mt-2">
                        {error}
                    </div>
                )}
            </div>
        </div>
    </>)
}