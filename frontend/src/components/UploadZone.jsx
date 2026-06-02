import React, { useCallback, useState, useEffect } from 'react';
import { FileText, X, CheckCircle } from 'lucide-react';

export default function UploadZone({ onFilesChange, uploadedCandidates }) {
  const [files, setFiles] = useState([]);
  const [dragover, setDragover] = useState(false);

  // Notify parent after state update, not during render
  useEffect(() => {
    onFilesChange(files);
  }, [files]);

  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      ['.pdf', '.doc', '.docx'].some(ext => f.name.toLowerCase().endsWith(ext))
    );
    setFiles(prev => {
      const merged = [...prev];
      valid.forEach(f => { if (!merged.find(m => m.name === f.name)) merged.push(f); });
      return merged;
    });
  }, []);

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragover ? 'dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={e => { e.preventDefault(); setDragover(false); addFiles(e.dataTransfer.files); }}
      >
        <input type="file" multiple accept=".pdf,.doc,.docx" onChange={e => addFiles(e.target.files)} />
        <div className="upload-icon">📄</div>
        <h3>Drop resumes here or click to browse</h3>
        <p>Supports PDF, DOC, DOCX — upload multiple at once</p>
      </div>

      {files.length > 0 && (
        <div className="file-chips">
          {files.map(f => {
            const uploaded = uploadedCandidates.find(c => c.filename === f.name);
            return (
              <div key={f.name} className="file-chip">
                {uploaded ? <CheckCircle size={12} color="var(--green)" /> : <FileText size={12} />}
                <span>{f.name}</span>
                <button onClick={() => removeFile(f.name)}><X size={10} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
