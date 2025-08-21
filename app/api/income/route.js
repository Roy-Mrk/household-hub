import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
      const { source, amount } = await request.json();

    if (!source || !amount) {
      return res.status(400).json({ error: '収入の内容と金額が必要です' });
    }

      const { data, error } = await supabaseAdmin
        .from('income') // 収入履歴登録
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

// 疎通確認用: GETでデータを取得
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('income')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}
