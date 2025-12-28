// src/lib/uploadProviderLogo.ts
import { supabasePublic } from './supabase';

interface UploadProviderLogoParams {
  file: File;
  providerId?: string | null;
}

export async function uploadProviderLogo({
  file,
  providerId,
}: UploadProviderLogoParams): Promise<{ publicUrl: string }> {
  const bucket = 'provider-logos'; // TROCAR se seu bucket tiver outro nome

  const fileExt = file.name.split('.').pop();
  const fileName = `${providerId || 'new'}-${Date.now()}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabasePublic.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('[uploadProviderLogo] erro no upload', uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabasePublic.storage.from(bucket).getPublicUrl(filePath);

  return { publicUrl };
}
