import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kusynbwplwmglyqcdqur.supabase.co';
const supabaseKey = 'sb_publishable_X5MSa5H8Zh7CgCKKkMvKCg_gWBfFrqF';

export const supabase = createClient(supabaseUrl, supabaseKey);