import { supabaseMaster } from './supabase';

interface UploadCommunityLogoParams {
  file: File;
  communityId?: string | null;
}

export async function uploadCommunityLogo({
  file,
  communityId,
}: UploadCommunityLogoParams): Promise<{ publicUrl: string }> {
  const bucket = 'community-logos';

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${communityId || 'new'}-${Date.now()}.${ext}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabaseMaster.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) {
    console.error('[uploadCommunityLogo] erro no upload', uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabaseMaster.storage.from(bucket).getPublicUrl(filePath);

  return { publicUrl };
}
