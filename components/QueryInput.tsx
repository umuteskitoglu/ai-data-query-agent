import React from 'react';

interface QueryInputProps {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const QueryInput: React.FC<QueryInputProps> = ({ query, setQuery, onSubmit, loading }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="query" className="block text-gray-700 text-sm font-bold mb-2">
          Sorgunuzu doğal dilde yazın:
        </label>
        <textarea
          id="query"
          className="input"
          placeholder="Örn: Son 3 aydaki toplam satışları göster"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          disabled={loading}
        />
        <p className="text-sm text-gray-500 mt-1">
          Sorgunuzu normal bir şekilde, sanki bir kişiye soruyormuş gibi yazabilirsiniz.
        </p>
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary" 
        disabled={loading || !query.trim()}
      >
        {loading ? (
          <span>İşleniyor...</span>
        ) : (
          <span>Sorguyu Çalıştır</span>
        )}
      </button>
    </form>
  );
};

export default QueryInput; 