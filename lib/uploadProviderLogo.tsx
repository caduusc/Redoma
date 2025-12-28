// src/lib/uploadProviderLogo.ts
import { supabaseMaster } from './supabase';

interface UploadProviderLogoParams {
  file: File;
  providerId?: string | null;
}

interface UploadProviderLogoResult {
  path: string;
  publicUrl: string;
}

export async function uploadProviderLogo(
  params: UploadProviderLogoParams
): Promise<UploadProviderLogoResult> {
  const { file, providerId } = params;

  // id base pra path
  const baseId =
    providerId ||
    (typeof crypto !== 'undefined' &&
      'randomUUID' in crypto &&
      crypto.randomUUID())
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 11);

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}.${ext}`;
  const filePath = `${baseId}/${fileName}`;

  // IMPORTANTE: bucket deve existir no Supabase com esse nome
  const bucketName = 'provider-logos';

  const { error: uploadError } = await supabaseMaster.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[uploadProviderLogo] erro no upload', uploadError);
    throw uploadError;
  }

  const { data: publicData } = supabaseMaster.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    console.error('[uploadProviderLogo] não retornou publicUrl', publicData);
    throw new Error('Falha ao obter URL pública da logo.');
  }

  return {
    path: filePath,
    publicUrl: publicData.publicUrl,
  };
}
