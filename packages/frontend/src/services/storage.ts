import { supabase } from './supabase'

export const storageService = {
  async uploadPropertyImage(file: File, advisorId: string): Promise<string> {
    const timestamp = Date.now()
    const filename = `${advisorId}/${timestamp}-${file.name}`

    const { data, error } = await supabase.storage
      .from('properties')
      .upload(filename, file)

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('properties').getPublicUrl(filename)
    return urlData.publicUrl
  },

  async deletePropertyImage(url: string): Promise<void> {
    try {
      const path = url.split('/storage/v1/object/public/properties/')[1]
      if (path) {
        await supabase.storage.from('properties').remove([path])
      }
    } catch (error) {
      console.error('Failed to delete image:', error)
    }
  },
}
