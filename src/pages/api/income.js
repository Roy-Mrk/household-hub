// 1. pages/api/income.js - API Route for Income
export default function handler(req, res) {
    if (req.method === 'POST') {
      const { source, amount } = req.body;
  
      // Data validation
      if (!source || !amount) {
        return res.status(400).json({ error: '収入の内容と金額が必要です' });
      }
  
      // TODO: Save data to database
      console.log(`収入データ: 内容=${source}, 金額=${amount}`);
  
      res.status(200).json({ message: '収入データが保存されました' });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }
  