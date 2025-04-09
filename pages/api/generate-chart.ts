import { NextApiRequest, NextApiResponse } from 'next';

// Chart oluşturma API endpoint'i
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { results } = req.body;

    if (!results || !results.columns || !results.rows || results.rows.length === 0) {
      return res.status(400).json({ error: 'Geçersiz veri formatı' });
    }

    // Veriyi chart için formatlama
    const chartData = formatDataForChart(results);

    // Formatlanmış veriyi doğrudan döndür
    return res.status(200).json({ chartData });
  } catch (error: any) {
    console.error('Grafik verisi hazırlama hatası:', error);
    return res.status(500).json({ error: error.message || 'Grafik verisi hazırlanırken bir hata oluştu' });
  }
}

// Veriyi chart için formatlama yardımcı fonksiyonu
function formatDataForChart(results: { columns: string[], rows: any[] }) {
  // Veriyi analiz et
  const columnCount = results.columns.length;
  
  // İlk sütunu kategori, ikinci sütunu değer olarak varsayıyoruz
  // Ancak daha fazla sütun varsa, çoklu seriler oluşturabiliriz
  const labels = results.rows.map((row: any[]) => row[0]?.toString() || '');
  
  // Tüm sayısal sütunlar için veri setleri oluştur
  const datasets = [];
  
  // İlk sütunu kategori olarak kullan, diğer sütunlar için veri setleri oluştur
  for (let i = 1; i < columnCount; i++) {
    // Sadece sayısal değerler için veri setleri oluştur
    const values = results.rows.map((row: any[]) => {
      const val = row[i];
      return typeof val === 'number' ? val : 
             !isNaN(parseFloat(val)) ? parseFloat(val) : 0;
    });
    
    // Rastgele bir renk oluştur
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    
    datasets.push({
      label: results.columns[i] || `Seri ${i}`,
      data: values,
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.5)`,
      borderColor: `rgb(${r}, ${g}, ${b})`,
      borderWidth: 1,
    });
  }
  
  return {
    labels,
    datasets,
    title: "Sorgu Sonucu"
  };
}