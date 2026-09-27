const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: pq, error: pqErr } = await supabase
    .from('published_quizzes')
    .select('*')
    .eq('topic_id', 'general-principles');
  console.log('published_quizzes:', pq, pqErr);

  if (pq && pq.length > 0) {
    const { data: qq, error: qqErr } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, sort_order, stem, type, options')
      .eq('quiz_id', pq[0].id);
    console.log('quiz_questions:', qq ? qq.length : null, qqErr);
  }
}

test();
