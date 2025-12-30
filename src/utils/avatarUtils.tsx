// utils/avatarUtils.ts
import { supabase, supabaseAdmin } from '../lib/supabase';

export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    try {
        console.log('🔄 Starting avatar upload for user:', userId);

        // Validate file
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `avatar.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        console.log('🗑️ Cleaning up existing avatars...');

        // Clean up existing avatars
        try {
            const { data: existingFiles } = await supabaseAdmin.storage
                .from('avatars')
                .list(userId);

            if (existingFiles && existingFiles.length > 0) {
                const filesToRemove = existingFiles.map(file => `${userId}/${file.name}`);
                await supabaseAdmin.storage
                    .from('avatars')
                    .remove(filesToRemove);
                console.log('✅ Cleaned up old avatars');
            }
        } catch (cleanupError) {
            console.warn('⚠️ Cleanup warning:', cleanupError);
        }

        console.log('📤 Uploading new avatar...');

        // Upload the new avatar
        const { error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(filePath, file, {
                upsert: true,
                cacheControl: '3600',
                contentType: file.type
            });

        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('✅ Avatar uploaded successfully');

        // Get the public URL using Supabase's built-in method
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Add cache busting parameter
        const finalUrl = `${publicUrl}?t=${Date.now()}`;

        console.log('🔗 Generated avatar URL:', finalUrl);
        return finalUrl;

    } catch (error) {
        console.error('❌ Error uploading avatar:', error);
        throw error;
    }
};