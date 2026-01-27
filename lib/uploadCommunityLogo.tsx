import { supabasePublic } from './supabase';

export async function uploadCommunityLogo(
  file: File,
  communityId: string
) {
  // gera nome único do arquivo
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const fileName = `community-${communityId}-${Date.now()}.${ext}`;
  const filePath = `communities/${fileName}`;

  // valida se é imagem
  if (!file.type.startsWith('image/')) {
    throw new Error('Envie apenas imagens.');
  }

  // upload pro bucket
  const { error } = await supabasePublic.storage
    .from('community-logos')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error('Erro no upload:', error);
    throw error;
  }

  // pega URL pública
  const { data } = supabasePublic.storage
    .from('community-logos')
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('Não foi possível gerar URL pública.');
  }

  return data.publicUrl;
}
