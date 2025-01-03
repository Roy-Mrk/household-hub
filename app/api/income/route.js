import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
      const { source, amount } = await request.json();

    if (!source || !amount) {
      return res.status(400).json({ error: '収入の内容と金額が必要です' });
    }

      const { data, error } = await supabaseAdmin
        .from('income')
        .insert([{ source, amount }]);

      if (error) {
        throw error;
      }
      console.log('Data inserted successfully:', data);

      return NextResponse.json({ message: '収入データが保存されました', data }, { status: 200 });

    } catch (error) {
      console.error('Error saving data:', error);
      return NextResponse.json({ error: 'データの保存中にエラーが発生しました' }, { status: 500 });
    }
}
