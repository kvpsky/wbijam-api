const fs = require('fs');
const { JSDOM } = require('jsdom');
const tabletojson = require('tabletojson').Tabletojson;

async function URLGenerate() {
    const domURL = await JSDOM.fromURL("https://narutoboruto.wbijam.pl");
    const URLList = [];
    let startFor = false;
    for (const li of Array.from(domURL.window.document.querySelectorAll(".pmenu li"))) {
        const name = li.textContent.trim();
        if (name == "Wychodzące/ongoing:") {
            startFor = true;
        } else if (startFor == true) {
            const a = li.querySelector("a");
            if (a && a.getAttribute("href")) {
                URLList.push({name, href: a.getAttribute("href")});
            }
            if (name == "Pozostałe serie") {
                startFor = false;
            }
        }
    }
    domURL.window.close();
    return URLList;
}
async function ListGenerate(url) {
    const dom = await JSDOM.fromURL(url.href, {runScripts: "dangerously", resources: "usable"});
    const list = dom.window.document.querySelector(".lista");
    if (!list) return {name: url.name, href: url.href, episodes: []};
    while (list.outerHTML.includes("00 dni 00:00:00")) {
        await new Promise(r => setTimeout(r, 500));
    }
    const table = tabletojson.convert(list.outerHTML);
    const result = {name: url.name, href: url.href, episodes: table};
    dom.window.close();
    return result;
}
async function GenerateArray() {
    const URLList = await URLGenerate();
    const promises = URLList.map(url => ListGenerate(url));
    let result = await Promise.all(promises);
    result = result.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        if (b.name < a.name) {
            return 1;
        }
        return 0;
    });
    return result;
}
GenerateArray().then(list => {
    if (fs.existsSync("public")) {
        fs.rmSync("public", {recursive: true});
    }
    fs.mkdirSync("public");
    fs.writeFileSync("public/index.html", JSON.stringify(list));
    fs.writeFileSync("public/index.json", JSON.stringify(list));
    console.log("-- public generated --");
    console.log(`how many sites: ${list.length}`);
    process.exit(0);
});