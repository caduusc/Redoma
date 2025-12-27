// src/lib/uploadProviderLogo.ts
import { supabaseMaster } from './supabase';

interface UploadProviderLogoParams {
  file: File;
  providerId?: string; // pode não existir ainda no "create"
}

export const uploadProviderLogo = async ({
  file,
  providerId,
}: UploadProviderLogoParams): Promise<{ publicUrl: string; path: string }> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}.${ext}`;
  const folder = providerId || 'new';
  const path = `providers/${folder}/${fileName}`;

  const { error } = await supabaseMaster.storage
    .from('provider-logos') // 👈 garante que você criou esse bucket
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('[uploadProviderLogo] error', error);
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabaseMaster.storage.from('provider-logos').getPublicUrl(path);

  return { publicUrl, path };
};
