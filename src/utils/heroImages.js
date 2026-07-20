const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'heroes');
const EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getHeroImageAttachment(heroName) {
  if (!heroName) return null;

  const slug = slugify(heroName);
  const gifCandidates = EXTENSIONS.map((ext) => `${slug}-gif${ext}`);
  const staticCandidates = EXTENSIONS.map((ext) => `${slug}${ext}`);

  for (const filename of gifCandidates) {
    const filePath = path.join(ASSETS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const uploadName = `${slug}-gif.webp`;
      return {
        attachment: new AttachmentBuilder(filePath, { name: uploadName}),
        url: `attachment://${uploadName}`,
      };
    }
  }

  for (const filename of staticCandidates) {
    const filePath = path.join(ASSETS_DIR, filename);
    if (fs.existsSync(filePath)) {
      return {
        attachment: new AttachmentBuilder(filePath, { name: filename}),
        url: `attachment://${filename}`,
      };
    }
  }

  return null;
}

module.exports = { slugify, getHeroImageAttachment };
