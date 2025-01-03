import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { source, amount } = req.body;

    if (!source || !amount) {
      return res.status(400).json({ error: '収入の内容と金額が必要です' });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('income')
        .insert([{ source, amount }]);

      if (error) {
        throw error;
      }

      res.status(200).json({ message: '収入データが保存されました', data });
    } catch (error) {
      res.status(500).json({ error: 'データの保存中にエラーが発生しました' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
