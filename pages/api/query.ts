import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import sql from 'mssql';

// MSSQL bağlantı konfigürasyonu
const sqlConfig: sql.config = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || 'YourPassword',
  database: process.env.MSSQL_DATABASE || 'testdb',
  server: process.env.MSSQL_SERVER || 'localhost',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // Azure için genellikle true gereklidir
    trustServerCertificate: true // Lokal geliştirme için true, üretimde false olmalı
  }
};

// Veritabanı şemasını otomatik olarak çeken fonksiyon
async function fetchDatabaseSchema(): Promise<string> {
  try {
    // Veritabanına bağlan
    const pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    
    // Öncelikle SPI tablosunun tüm kolonlarını detaylı sorgula
    const spiColumnsResult = await pool.request().query(`
      SELECT 
        c.name AS ColumnName,
        ty.name AS DataType,
        c.max_length AS MaxLength,
        c.is_nullable AS IsNullable,
        ISNULL(ep.value, '') AS Description
      FROM 
        FINSAT671.sys.tables t
        INNER JOIN FINSAT671.sys.columns c ON t.object_id = c.object_id
        INNER JOIN FINSAT671.sys.types ty ON c.user_type_id = ty.user_type_id
        LEFT JOIN FINSAT671.sys.extended_properties ep ON 
          ep.major_id = t.object_id AND 
          ep.minor_id = c.column_id AND 
          ep.name = 'MS_Description'
      WHERE 
        t.name = 'SPI' AND 
        SCHEMA_NAME(t.schema_id) = 'FINSAT671'
      ORDER BY 
        c.column_id;
    `);
    
    // SPI tablosunun SQL CREATE ifadesini oluştur
    let schemaDefinition = `CREATE TABLE FINSAT671.SPI (\n`;
    
    if (spiColumnsResult.recordset && spiColumnsResult.recordset.length > 0) {
      const columnDefinitions = spiColumnsResult.recordset.map((col: any) => {
        let definition = `    ${col.ColumnName} ${col.DataType}`;
        
        // Veri tipine göre uzunluk ekle (VARCHAR gibi tipler için)
        if (col.DataType.includes('CHAR') && col.MaxLength > 0) {
          definition += `(${col.MaxLength === -1 ? 'MAX' : col.MaxLength / (col.DataType.toLowerCase().includes('nvarchar') ? 2 : 1)})`;
        }
        
        // NULL/NOT NULL durumu
        definition += col.IsNullable ? ' NULL' : ' NOT NULL';
        
        // Kolon açıklaması varsa ekle
        if (col.Description) {
          definition += ` -- ${col.Description}`;
        }
        
        return definition;
      });
      
      schemaDefinition += columnDefinitions.join(',\n');
    } else {
      // Sorgulanan kolon yoksa örnek kolonlar ekle
      schemaDefinition += `
    SIRA INT NOT NULL, -- Sipariş numarası 
    STARIHI DATETIME NULL, -- Sipariş tarihi
    STUMU DECIMAL(18, 2) NULL, -- Sipariş tutarı
    NETTUTAR DECIMAL(18, 2) NULL, -- Net tutar
    CARI_UNVAN NVARCHAR(100) NULL -- Müşteri adı/unvanı`;
    }
    
    schemaDefinition += '\n);\n\n';
    
    // Havuzu kapat
    await pool.close();
    
    console.log("Veritabanı şeması oluşturuldu");
    return schemaDefinition;
  } catch (error) {
    console.error('Şema çekilirken hata oluştu:', error);
    // Hata durumunda SPI tablosu için örnek şema döndür
    return `
CREATE TABLE FINSAT671.FINSAT671.SPI (
    SIRA INT NOT NULL, -- Sipariş numarası 
    STARIHI DATETIME NULL, -- Sipariş tarihi
    STUMU DECIMAL(18, 2) NULL, -- Sipariş tutarı
    NETTUTAR DECIMAL(18, 2) NULL, -- Net tutar
    CARI_UNVAN NVARCHAR(100) NULL, -- Müşteri adı/unvanı
    ADRES NVARCHAR(200) NULL, -- Teslimat adresi
    DURUM NVARCHAR(20) NULL, -- Sipariş durumu
    ODEME_SEKLI NVARCHAR(50) NULL -- Ödeme şekli
);`;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Invalid query' });
  }

  try {
    // Veritabanı şemasını otomatik olarak çek
    const dbSchema = await fetchDatabaseSchema();
    
    // Step 1: Convert natural language to SQL using Gemini API
    const sqlQuery = await convertToSQL(query, dbSchema);
    
    // Step 2: Validate and sanitize the SQL query
    if (!validateSQL(sqlQuery)) {
      return res.status(400).json({ 
        error: 'Oluşturulan SQL sorgusu güvenlik kontrolünden geçemedi', 
        sqlQuery 
      });
    }
    
    // Step 3: Execute the SQL query against the database
    const results = await executeQuery(sqlQuery);
    
    // Step 4: Return the results
    return res.status(200).json({ 
      success: true, 
      sqlQuery, 
      results 
    });
  } catch (error: any) {
    console.error('Error processing query:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

async function convertToSQL(query: string, dbSchema: string): Promise<string> {
  try {
    // Gemini API'yi kullanarak doğal dil sorgusunu SQL'e çevirme
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDVoQLTjls0hAm2ndxiPsLsQEYni4aWbPo',
      {
        contents: [{
          parts: [{
            text: `Sen bir Microsoft SQL Server için SQL sorgusu oluşturma uzmanısın. Aşağıdaki doğal dil sorgusunu SQL sorgusuna çevir.
            Sadece SQL sorgusunu döndür, başka bir şey yazma.
            
            Veritabanı şu şema bilgilerine sahip:
            Sipariş bilgileri FINSAT671.FINSAT671.SPI tablosunda tutuluyor.
            Bu tablonun başlıca kolonları:
            - EvrakNo: Sipariş numarası
            - Tarih: Sipariş tarihi int (OADate) değer olarak tutuluyor. Tarihe çevirebilirsin.
            - KayitTarih: Bu alan kayıt tarihidir ve int (OADate) değer olarak tutuluyor. Tarihe çevirebilirsin.
            - Tutar: Sipariş tutarı
            - Miktar: Sipariş miktarı
            - Birim: Sipariş birimi
            - Chk: Müşteri kodu
            
            Örnekler:
            - "Son 100 siparişi göster" için: SELECT TOP 100 * FROM FINSAT671.FINSAT671.SPI(NOLOCK) ORDER BY ROW_ID DESC
            - "En yüksek tutarlı 10 siparişi göster" için: SELECT TOP 10 * FROM FINSAT671.FINSAT671.SPI(NOLOCK) ORDER BY NETTUTAR DESC
            Ayrıca veritabanı şeması:
            ${dbSchema}
            
            Doğal dil sorgusu:
            ${query}
            
            Sadece SQL sorgusunu döndür, başka bir şey yazma.
            Sorgunun hatalı olmaması gerekiyor. Syntax hatalarını düzeltip döndür.
            Eğer distinct vesaire kullanılmıyor ise en fazla 1000 satır döndür.
            
            `
            
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
      }
    );

    // Gemini yanıtından SQL sorgusunu çıkar
    const generatedSQL = response.data.candidates[0].content.parts[0].text;
    
    // Markdown formatını (code blocks) kaldır
    let cleanSQL = generatedSQL.trim();
    // ```sql ve ``` gibi markdown code block formatlarını kaldır
    cleanSQL = cleanSQL.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("Gemini tarafından oluşturulan SQL sorgusu:", cleanSQL);
    
    return cleanSQL;
  } catch (error) {
    console.error('SQL oluşturulurken hata:', error);
    
    // Hata durumunda basit sorgu döndür (yedek plan)
    if (query.toLowerCase().includes('sipariş') || query.toLowerCase().includes('son')) {
      return `SELECT TOP 100 * FROM FINSAT671.FINSAT671.SPI ORDER BY STARIHI DESC`;
    } else if (query.toLowerCase().includes('en çok') || query.toLowerCase().includes('yüksek')) {
      return `SELECT TOP 10 * FROM FINSAT671.FINSAT671.SPI ORDER BY NETTUTAR DESC`;
    } else {
      return `SELECT TOP 10 * FROM FINSAT671.FINSAT671.SPI`;
    }
  }
}

function validateSQL(sql: string): boolean {
  // In a real application, you would implement robust SQL validation here
  // For demo purposes, this is a very simple check
  
  // Only allow SELECT statements
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
  
  // Disallow dangerous operations
  const hasDangerousKeywords = [
    'DROP', 
    'DELETE', 
    'UPDATE', 
    'INSERT', 
    'ALTER', 
    'TRUNCATE', 
    'CREATE', 
    'GRANT', 
    'EXECUTE',
    'EXEC',
    'SP_',
    'XP_'
  ].some(keyword => sql.toUpperCase().includes(keyword));
  
  return isSelect && !hasDangerousKeywords;
}

async function executeQuery(query: string) {
  try {
    // Veritabanına bağlan
    const pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    
    // Sorguyu çalıştır
    const result = await pool.request().query(query);
    
    // Havuzu kapat
    await pool.close();
    
    // Sonuç boşsa boş dön
    if (!result.recordset || result.recordset.length === 0) {
      return {
        columns: [],
        rows: []
      };
    }
    
    // Sütun adlarını al
    const columns = Object.keys(result.recordset[0]);
    
    // Satırları uygun formata dönüştür
    const rows = result.recordset.map(record => {
      return columns.map(col => {
        const value = record[col];
        // Tarih değerlerini string'e çevir
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
    });
    
    return {
      columns,
      rows
    };
  } catch (error) {
    console.error('Sorgu çalıştırılırken hata:', error);
    throw new Error('Veritabanı sorgusu çalıştırılırken bir hata oluştu');
  }
} 