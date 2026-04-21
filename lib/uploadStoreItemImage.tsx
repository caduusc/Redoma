import { supabaseMaster } from './supabase';

interface UploadStoreItemImageParams {
  file: File;
  itemId?: string | null;
}

export async function uploadStoreItemImage({
  file,
  itemId,
}: UploadStoreItemImageParams): Promise<{ publicUrl: string }> {
  const bucket = 'store-item-images';

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${itemId || 'new'}-${Date.now()}.${ext}`;
  const filePath = `items/${fileName}`;

  const { error: uploadError } = await supabaseMaster.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[uploadStoreItemImage] erro no upload', uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabaseMaster.storage.from(bucket).getPublicUrl(filePath);

  return { publicUrl };
}
