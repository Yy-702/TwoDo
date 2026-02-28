alter table public.space_photos
add column if not exists caption text;

alter table public.space_photos
drop constraint if exists space_photos_caption_length;

alter table public.space_photos
add constraint space_photos_caption_length
check (char_length(coalesce(caption, '')) <= 60);
