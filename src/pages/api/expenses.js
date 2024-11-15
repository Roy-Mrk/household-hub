export default function handler(req, res) {
    if (req.method === 'POST') {
      const { category, amount } = req.body;
  
      // Data validation
      if (!category || !amount) {
        return res.status(400).json({ error: '支出の内容と金額が必要です' });
      }
  
      // TODO: Save data to database
      console.log(`支出データ: カテゴリ=${category}, 金額=${amount}`);
  
      res.status(200).json({ message: '支出データが保存されました' });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }