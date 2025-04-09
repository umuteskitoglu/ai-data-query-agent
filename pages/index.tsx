import { useState } from 'react';
import Head from 'next/head';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import QueryInput from '../components/QueryInput';
import ResultsTable from '../components/ResultsTable';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface QueryResult {
  columns: string[];
  rows: any[];
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);

  const handleQuerySubmit = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSqlQuery(null);
    setChartData(null);
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sorgu işlenirken bir hata oluştu');
      }

      setResults(data.results);
      setSqlQuery(data.sqlQuery);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const generateChart = async () => {
    if (!results || results.rows.length === 0) return;
    
    setChartLoading(true);
    try {
      const response = await fetch('/api/generate-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Grafik oluşturulurken bir hata oluştu');
      }

      setChartData(data.chartData);
    } catch (err: any) {
      setError(err.message || 'Grafik oluşturulurken bir hata oluştu');
    } finally {
      setChartLoading(false);
    }
  };

  // When switching to chart view, generate the chart
  const handleViewModeChange = (mode: 'table' | 'chart') => {
    setViewMode(mode);
    if (mode === 'chart' && !chartData && results) {
      generateChart();
    }
  };

  const renderChart = () => {
    if (chartLoading) {
      return <div className="flex justify-center items-center h-64">Grafik oluşturuluyor...</div>;
    }
    
    if (!chartData) {
      return <div className="flex justify-center items-center h-64">Grafik oluşturulamadı</div>;
    }

    // Eğer veri seti boşsa veya sadece bir değer varsa bilgilendir
    if (chartData.labels.length <= 1 || chartData.datasets.length === 0) {
      return (
        <div className="chart-container p-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <h3 className="font-semibold">Grafik Oluşturulamadı:</h3>
            <p>Yeterli veri bulunamadı veya veri grafikleştirmeye uygun değil.</p>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Not: Anlamlı bir grafik oluşturabilmek için farklı kategorilere sahip veriler gereklidir.
              Farklı bir sorgu ile daha kategorik veriler elde etmeyi deneyebilirsiniz.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="chart-container" style={{ height: '400px' }}>
        <Bar 
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: chartData.title || 'Sorgu Sonucu',
                font: {
                  size: 16
                }
              },
              legend: {
                position: 'top' as const,
              }
            },
          }}
        />
      </div>
    );
  };

  return (
    <div className="container">
      <Head>
        <title>AI Destekli Veri Sorgulama Agent'ı</title>
        <meta name="description" content="Doğal dil ile veritabanı sorgulaması yapın" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="text-3xl font-bold text-center mb-8">
          AI Destekli Veri Sorgulama Agent'ı
        </h1>
        
        <div className="card mb-6">
          <QueryInput 
            query={query}
            setQuery={setQuery}
            onSubmit={handleQuerySubmit}
            loading={loading}
          />
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        {sqlQuery && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-2">Oluşturulan SQL Sorgusu:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {sqlQuery}
            </pre>
          </div>
        )}

        {results && results.rows.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sorgu Sonuçları:</h2>
              
              <div className="flex space-x-2">
                <button
                  className={`btn ${viewMode === 'table' ? 'btn-primary' : 'bg-gray-200'}`}
                  onClick={() => handleViewModeChange('table')}
                >
                  Tablo
                </button>
                <button
                  className={`btn ${viewMode === 'chart' ? 'btn-primary' : 'bg-gray-200'}`}
                  onClick={() => handleViewModeChange('chart')}
                >
                  Grafik
                </button>
              </div>
            </div>

            {viewMode === 'table' ? (
              <ResultsTable results={results} />
            ) : (
              renderChart()
            )}
          </div>
        )}
      </main>
    </div>
  );
}