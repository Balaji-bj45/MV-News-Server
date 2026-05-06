import slugify from 'slugify';

export const generateSlug = (title: string): string => {
  let slug = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });

  // If title is fully in Tamil or characters get stripped, use timestamp
  if (!slug || slug.length === 0) {
    slug = Date.now().toString();
  }

  return slug;
};
