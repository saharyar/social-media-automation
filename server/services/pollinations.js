const axios = require("axios");

async function generateImage(prompt) {
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024`;

        console.log("Calling:", url);

        const response = await axios.get(url, {
            responseType: "arraybuffer",
        });

        console.log("Pollinations Status:", response.status);

        return Buffer.from(response.data);
    } catch (err) {
        console.log("POLLINATIONS ERROR");
        console.log(err.response?.status);
        console.log(err.response?.data);
        throw err;
    }
}

module.exports = { generateImage };