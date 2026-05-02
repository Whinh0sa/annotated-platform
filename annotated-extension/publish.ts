import { supabase } from "./supabaseClient"

export const publishAnnotation = async (
  userId: string, 
  compressedMedia: Uint8Array, 
  sourceUrl: string, 
  commentaryText: string,
  mediaType: 'video' | 'audio' = 'video'
) => {
  try {
    // 1. Generate a collision-resistant filename
    const fileExt = mediaType === 'video' ? 'mp4' : 'webm';
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `clips/${fileName}`;

    // 2. Upload the WASM-compressed payload to Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('annotations_media')
      .upload(filePath, compressedMedia, {
        contentType: `video/${fileExt}`,
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) throw new Error(`Storage failure: ${storageError.message}`);

    // 3. Retrieve the public URL for the Next.js landing page
    const { data: publicUrlData } = supabase.storage
      .from('annotations_media')
      .getPublicUrl(filePath);

    // 4. Insert the Node into the Social Graph
    const { data: annotationData, error: dbError } = await supabase
      .from('annotations')
      .insert([
        {
          user_id: userId,
          source_url: sourceUrl,
          media_url: publicUrlData.publicUrl,
          commentary: commentaryText,
          media_type: mediaType
        }
      ])
      .select()
      .single();

    if (dbError) throw new Error(`Database failure: ${dbError.message}`);

    return { success: true, data: annotationData };

  } catch (error) {
    console.error("Publishing Pipeline Error:", error);
    return { success: false, error };
  }
}
