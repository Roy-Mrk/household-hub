// 2. pages/expense.js - Expense Entry Page
import React, { useState } from 'react';

export default function Expense() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Expense Category: ${category}, Amount: ${amount}`);
    // TODO: Implement logic to save the expense data, e.g., API call
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">支出の入力</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="支出の内容"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
          className="bg-red-500 text-white py-2 rounded hover:bg-red-600">
          保存
        </button>
      </form>
    </div>
  );
}
