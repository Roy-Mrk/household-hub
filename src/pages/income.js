import React, { useState } from 'react';

export default function Income() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');

  const handleSubmit = async function(e) {
    e.preventDefault();
    console.log(`Income Source: ${source}, Amount: ${amount}`);
    try {
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source, amount }),
      });
      if (!response.ok) {
        throw new Error('Failed to save income data');
      }
      console.log('Income data saved successfully');
    } catch (error) {
      console.error('Error:', error);
    }
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
