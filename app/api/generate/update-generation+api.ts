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

    const { generation_id, output_data } = await request.json();

    if (!generation_id || !output_data) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify ownership
    const { data: gen } = await supabaseAdmin.from('generations').select('user_id').eq('id', generation_id).single();
    if (!gen || gen.user_id !== user.id) {
      return Response.json({ error: 'Generation not found or unauthorized' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('generations')
      .update({ output_data })
      .eq('id', generation_id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
