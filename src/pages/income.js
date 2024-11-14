// 1. pages/income.js - Income Entry Page
import React, { useState } from 'react';

export default function Income() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Income Source: ${source}, Amount: ${amount}`);
    // TODO: Implement logic to save the income data, e.g., API call
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">収入の入力</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="収入の内容"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="p-2 border border-gray-300 rounded"
        />
        <input
          type="number"
          placeholder="金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="p-2 border border-gray-300 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
          保存
        </button>
      </form>
    </div>
  );
}