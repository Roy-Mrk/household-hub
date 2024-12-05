import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { category, amount } = req.body;

    // Data validation
    if (!category || !amount) {
      return res.status(400).json({ error: '支出の内容と金額が必要です' });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('expense')
        .insert([{ source, amount }]);

      if (error) {
        throw error;
      }

    res.status(200).json({ message: '支出データが保存されました', data });
  } catch (error) {
      res.status(200).json({ error: 'データの保存中にエラーが発生しました' });
  }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}