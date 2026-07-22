import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function checkUserTokens(userId: string, cost: number) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('tokens_used_today, daily_token_limit, is_premium')
    .eq('id', userId)
    .single();

  if (user) {
    if (user.is_premium) return true;
    const remaining = Math.max(0, user.daily_token_limit - (user.tokens_used_today || 0));
    if (remaining < cost) {
      throw new Error(`limit_exceeded:${cost}:${remaining}`);
    }
    return true;
  }
  throw new Error('limit_exceeded');
}

export async function spendUserTokens(userId: string, cost: number) {
  const { data: success, error } = await supabaseAdmin.rpc('spend_tokens', { p_user_id: userId, p_cost: cost });
  
  if (error) {
    console.error('Error spending tokens:', error);
    throw new Error('error_spending_tokens');
  }

  if (!success) {
    // If failed, fetch their current limit to provide a detailed error
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('tokens_used_today, daily_token_limit')
      .eq('id', userId)
      .single();

    if (user) {
      const remaining = Math.max(0, user.daily_token_limit - user.tokens_used_today);
      throw new Error(`limit_exceeded:${cost}:${remaining}`);
    } else {
      throw new Error('limit_exceeded');
    }
  }
  return true;
}

export async function refundUserTokens(userId: string, cost: number) {
  const { data: success, error } = await supabaseAdmin.rpc('refund_tokens', { p_user_id: userId, p_cost: cost });
  
  if (error) {
    console.error(`[CRITICAL] Failed to refund ${cost} tokens for user ${userId}. Error:`, error);
    return false;
  }

  if (!success) {
    console.error(`[CRITICAL] Refund RPC returned false for user ${userId}. Tokens (${cost}) were not refunded.`);
    return false;
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
