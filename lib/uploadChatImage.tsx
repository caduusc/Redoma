// src/lib/uploadChatImage.ts
import { supabasePublic } from './supabase';

function getExt(name: string) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
}

export async function uploadChatImage(params: {
  file: File;
  conversationId: string;
  senderType: 'client' | 'agent';
}) {
  const { file, conversationId, senderType } = params;
  const ext = getExt(file.name);
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');

  const path = `conversations/${conversationId}/${senderType}/${Date.now()}_${safeName}.${ext}`;

  const { error } = await supabasePublic.storage
    .from('chat-uploads')
    .upload(path, file, {
      contentType: file.type || 'image/*',
      upsert: false,
      cacheControl: '3600',
    });

  if (error) {
    console.error('[uploadChatImage]', error);
    throw error;
  }

  const { data } = supabasePublic.storage.from('chat-uploads').getPublicUrl(path);
  return {
    publicUrl: data.publicUrl,
    path,
  };
}
