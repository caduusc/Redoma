
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

export const supabase = createClient(supabaseUrl, supabaseKey);
