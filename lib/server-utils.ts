import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function enforceUsageLimits(userId: string) {
  const { data: success, error } = await supabaseAdmin.rpc('increment_generation_limit', { p_user_id: userId });
  
  if (error || !success) {
    throw new Error('limit_exceeded');
  }
  return true;
}

export async function trackGeneration(userId: string, featureType: string, inputType: string, inputData: string, styleMode: string, outputData: any, aiModel: string) {
  // Save Generation
  const { data: generation, error: genError } = await supabaseAdmin
    .from('generations')
    .insert({
      user_id: userId,
      feature_type: featureType,
      input_type: inputType,
      input_data: inputData,
      style_mode: styleMode,
      output_data: outputData,
      ai_model: aiModel,
    })
    .select()
    .single();

  if (genError) {
    console.error('Error saving generation:', genError);
  }

  return generation;
}
