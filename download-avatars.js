const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { slugify } = require('./src/utils/heroImages');

// Double check path: matches 'assets/heroes' relative to your root
const TARGET_DIR = path.join(__dirname, 'assets', 'heroes'); 

if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function scrapeAvatarsAPI() {
    console.log("Fetching characters and image links from Marvel Rivals API...");
    try {
        // Querying the MediaWiki API to fetch all embedded files/images on the Avatars page
        const apiUrl = 'https://marvelrivals.fandom.com/api.php';
        const response = await axios.get(apiUrl, {
            params: {
                action: 'query',
                titles: 'Avatars',
                prop: 'images',
                imlimit: '500',
                format: 'json'
            },
            headers: {
                // MediaWiki requests require a descriptive app user agent to bypass 403s safely
                'User-Agent': 'MarvelRivalsAssetDownloader/1.0 (Contact: admin@example.com) AxiosClient'
            }
        });

        const pages = response.data.query.pages;
        const pageId = Object.keys(pages)[0];
        const images = pages[pageId].images;

        if (!images || images.length === 0) {
            console.error("No images discovered on the page target.");
            return;
        }

        // Filter out icons that are explicitly character portraits (skipping background decorations or icons)
        const portraitTitles = images
            .map(img => img.title)
            .filter(title => title.includes('Icon') || title.includes('Avatar'));

        console.log(`Found ${portraitTitles.length} matching avatar assets. Processing download urls...`);

        let downloadCount = 0;

        // Process images in batch queries of 50 (API limits) to get direct source URLs
        for (let i = 0; i < portraitTitles.length; i += 50) {
            const batch = portraitTitles.slice(i, i + 50).join('|');

            const urlInfoResponse = await axios.get(apiUrl, {
                params: {
                    action: 'query',
                    titles: batch,
                    prop: 'imageinfo',
                    iiprop: 'url',
                    format: 'json'
                },
                headers: {
                    'User-Agent': 'MarvelRivalsAssetDownloader/1.0 (Contact: admin@example.com) AxiosClient'
                }
            });

            const imagePages = urlInfoResponse.data.query.pages;

            for (const id in imagePages) {
                const imgPage = imagePages[id];
                if (!imgPage.imageinfo || imgPage.imageinfo.length === 0) continue;

                const directUrl = imgPage.imageinfo[0].url;
                const rawTitle = imgPage.title.replace('File:', ''); // Strip metadata string prefix

                // Determine a friendly name map based on title text
                // E.g., "Hero Icon Spider-Man.png" -> we look for "Spider-Man"
                let cleanHeroName = rawTitle
                    .replace(/Icon|Hero|Avatar|Lord|Champion|Animated|\.png|\.jpg|\.jpeg/gi, '')
                    .trim();

                // Generate clean project file pattern
                const finalFilename = `${slugify(cleanHeroName)}.png`;
                const savePath = path.join(TARGET_DIR, finalFilename);

                if (fs.existsSync(savePath)) continue;

                console.log(`Downloading asset: ${cleanHeroName} -> ${finalFilename}`);

                const imgStream = await axios({
                    url: directUrl,
                    method: 'GET',
                    responseType: 'stream',
                    headers: {
                        'User-Agent': 'MarvelRivalsAssetDownloader/1.0 (Contact: admin@example.com) AxiosClient'
                    }
                });

                imgStream.data.pipe(fs.createWriteStream(savePath));
                downloadCount++;

                // Small rest to prevent hitting threshold rate limits
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }

        console.log(`\n🎉 Process complete! Successfully saved ${downloadCount} assets into ${TARGET_DIR}`);

    } catch (err) {
        console.error("An error occurred during API fetch configuration:", err.message);
    }
}

scrapeAvatarsAPI();