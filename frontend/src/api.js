import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000' });

export const uploadResumes = (files) => {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  return API.post('/api/upload-resumes', form);
};

export const saveJobDescription = (title, content) => {
  const form = new FormData();
  form.append('title', title);
  form.append('content', content);
  return API.post('/api/job-description', form);
};

export const analyzeResumes = (jdId, candidateIds) => {
  const form = new FormData();
  form.append('jd_id', jdId);
  form.append('candidate_ids', JSON.stringify(candidateIds));
  return API.post('/api/analyze', form);
};

export const exportCSV = (jdId) => {
  window.open(`http://localhost:8000/api/export/${jdId}`, '_blank');
};

export const resetData = () => API.delete('/api/reset');
