import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Class IDs
  const class2nd = 'fe634e96-b5b6-4207-b9c8-b273a313c8a3';
  const class3rd = 'dea01e69-e7c2-470f-badf-742a767a00c7';

  console.log('Soft-deleting students for Muta 2nd Year...');
  const { data: d1, error: e1 } = await supabase
    .from('students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('class_id', class2nd)
    .gt('roll_number', '6007')
    .is('deleted_at', null);
  
  if (e1) console.error('Error 2nd:', e1);
  else console.log('Updated 2nd Year.');

  console.log('Soft-deleting students for Muta 3rd Year...');
  const { data: d2, error: e2 } = await supabase
    .from('students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('class_id', class3rd)
    .gt('roll_number', '7007')
    .is('deleted_at', null);

  if (e2) console.error('Error 3rd:', e2);
  else console.log('Updated 3rd Year.');
}

run();
