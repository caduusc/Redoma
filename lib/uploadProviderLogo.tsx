// src/lib/uploadProviderLogo.ts
import { supabaseMaster } from '../lib/supabase';

/**
 * Faz upload da logo do fornecedor no bucket `provider-logos`
 * e devolve a URL pública.
 *
 * - Se não tiver arquivo, devolve a URL já existente (se houver)
 */
export const uploadProviderLogo = async (
  file: File | null,
  existingUrl?: string | null
): Promise<string | null> => {
  // Se não recebeu arquivo novo, mantém logo atual
  if (!file) return existingUrl ?? null;

  // Garante extensão bonitinha
  const ext = file.name.split('.').pop() || 'png';

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  // Caminho dentro do bucket
  const filePath = `logos/${fileName}`;

  const { data, error } = await supabaseMaster.storage
    .from('provider-logos')            // 👈 bucket precisa EXISTIR com esse nome
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('[uploadProviderLogo] erro no upload', error);
    throw error;
  }

  const path = data?.path || filePath;

  const {
    data: publicData,
  } = supabaseMaster.storage.from('provider-logos').getPublicUrl(path);

  return publicData.publicUrl ?? null;
};
