// src/lib/uploadProviderLogo.ts
import { supabaseMaster } from './supabase';

interface UploadProviderLogoParams {
  file: File;
  providerId?: string | null;
}

export async function uploadProviderLogo({
  file,
  providerId,
}: UploadProviderLogoParams): Promise<{ publicUrl: string }> {
  // 🔹 CONFERE ESSE NOME: precisa ser exatamente o nome do bucket no Supabase
  const bucket = 'provider-logos';

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${providerId || 'new'}-${Date.now()}.${ext}`;
  const filePath = `logos/${fileName}`;

  // 👉 usando supabaseMaster: service role, ignora RLS
  const { error: uploadError } = await supabaseMaster.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[uploadProviderLogo] erro no upload', uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabaseMaster.storage.from(bucket).getPublicUrl(filePath);

  console.log('[uploadProviderLogo] publicUrl gerada:', publicUrl);

  return { publicUrl };
}
