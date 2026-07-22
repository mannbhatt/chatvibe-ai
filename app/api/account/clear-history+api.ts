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

    // Delete from generations and saved_results
    const [genRes, savedRes] = await Promise.all([
      supabaseAdmin.from('generations').delete().eq('user_id', user.id),
      supabaseAdmin.from('saved_results').delete().eq('user_id', user.id),
    ]);

    if (genRes.error || savedRes.error) {
      console.error('Clear history error:', genRes.error, savedRes.error);
      return Response.json({ error: 'Failed to clear history' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Something went wrong, please try again' }, { status: 500 });
  }
}
