import React from 'react';

interface ResultsTableProps {
  results: {
    columns: string[];
    rows: any[];
  };
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const { columns, rows } = results;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {Array.isArray(row) ? (
                // Handle array rows
                row.map((cell, cellIndex) => (
                  <td key={cellIndex}>
                    {cell !== null && cell !== undefined ? String(cell) : ''}
                  </td>
                ))
              ) : (
                // Handle object rows
                columns.map((column, cellIndex) => (
                  <td key={cellIndex}>
                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-500 mt-2">
        {rows.length} satır gösteriliyor
      </p>
    </div>
  );
};

export default ResultsTable; 