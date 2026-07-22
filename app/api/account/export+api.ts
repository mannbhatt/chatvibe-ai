import { supabaseAdmin } from '../../../lib/server-utils';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [profile, generations, saved, achievements] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', user.id).single(),
      supabaseAdmin.from('generations').select('*').eq('user_id', user.id),
      supabaseAdmin.from('saved_results').select('*').eq('user_id', user.id),
      supabaseAdmin.from('user_achievements').select('*').eq('user_id', user.id),
    ]);

    return Response.json({
      exported_at: new Date().toISOString(),
      profile: profile.data,
      generations: generations.data,
      saved_results: saved.data,
      achievements: achievements.data,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Something went wrong, please try again' }, { status: 500 });
  }
}
