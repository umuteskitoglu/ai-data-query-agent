# AI Data Query Agent

A Next.js application that converts natural language queries into SQL and executes them against a Microsoft SQL Server database.

## Features

- Natural language to SQL conversion using Google's Gemini API
- SQL query validation and sanitization
- Interactive query interface
- Database schema auto-detection

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- Microsoft SQL Server instance
- Google Gemini API key

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/umuteskitoglu/ai-data-query-agent.git
   cd ai-data-query-agent
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your configuration
   ```
   MSSQL_USER=your_username
   MSSQL_PASSWORD=your_password
   MSSQL_DATABASE=your_database
   MSSQL_SERVER=your_server
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Run the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

| Variable | Description |
|----------|-------------|
| MSSQL_USER | SQL Server username |
| MSSQL_PASSWORD | SQL Server password |
| MSSQL_DATABASE | Database name |
| MSSQL_SERVER | SQL Server hostname/IP |
| GEMINI_API_KEY | Your Google Gemini API key |

## Özellikler

- Doğal dil ile veritabanı sorgulama
- SQL sorgularının otomatik oluşturulması
- Sonuçları tablo veya grafik olarak görüntüleme
- Güvenlik kontrolü ile SQL injection önleme

## Teknolojiler

- Frontend: Next.js (React Framework)
- AI Model: Google Gemini API (Doğal Dil -> SQL çevirisi için)
- Backend: Next.js API Routes
- Veritabanı: PostgreSQL
- Veri Görselleştirme: Chart.js ve react-chartjs-2

## Kullanım

1. Metin alanına doğal dille sorgunuzu yazın (örn. "Son 3 aydaki toplam satışları göster").
2. "Sorguyu Çalıştır" butonuna tıklayın.
3. Sonuçları tablo veya grafik görünümünde inceleyebilirsiniz.

## Örnekler

Aşağıdaki örnek sorguları deneyebilirsiniz:

- "Son 3 aydaki toplam satışları göster"
- "En çok satan 5 ürünü listele"
- "Siparişleri göster"

## Güvenlik Notları

- Uygulama, SQL injection saldırılarına karşı koruma sağlar.
- Sadece SELECT tipi sorgulara izin verilir.
- Güvenlik için tüm SQL sorguları doğrulanır ve temizlenir.

## Dağıtım (Deploy)

Uygulamayı Vercel gibi servisler üzerinde dağıtabilirsiniz:

```bash
npm run build
vercel --prod
```

## Lisans

MIT 