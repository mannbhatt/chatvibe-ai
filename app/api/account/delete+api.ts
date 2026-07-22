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

    // Deleting the auth user cascades to all app tables automatically,
    // since every table's user_id column already has
    // "references users(id) on delete cascade" in your schema.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Account deletion error:', deleteError);
      return Response.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Something went wrong, please try again' }, { status: 500 });
  }
}
