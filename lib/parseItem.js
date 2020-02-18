const itemData = require("./itemData");

function isCraftable(value) {
    return ![
        "( Not Usable in Crafting )",
        "( Not Tradable, Marketable, or Usable in Crafting )",
        "( Not Tradable, Marketable, Usable in Crafting, or Gift Wrappable )"
    ].includes(value);
}

function parseItem(descriptions, item) {
    let name = descriptions.market_name;

    if (name.startsWith("The ")) name = name.substring(4);
    let craftable = true;
    let effect = "";
    let wep = false;
    let tradable = !!descriptions.tradable;

    let quality = "Unique";
    let changes = true;
    let tempName = name;
    while (changes) {
        changes = false;
        if (!tempName.startsWith("Haunted Phantasm") && tempName !== "Strange Bacon Grease" && !tempName.startsWith("Strange Filter") &&
            !tempName.startsWith("Strange Count") && !tempName.startsWith("Strange Cosmetic") && tempName !== "Vintage Tyrolean" &&
            tempName !== "Vintage Merryweather" && tempName !== "Haunted Hat" && tempName !== "Haunted Metal Scrap" &&
            !tempName.startsWith("Haunted Ghosts")) {
            for (let _quality in itemData.qualities) {
                if (itemData.qualities.hasOwnProperty(_quality)) {
                    if (tempName.startsWith(_quality + " ")) {
                        tempName = tempName.substring(_quality.length + 1);
                        if (quality === "Unique") quality = _quality;
                        else quality = `${quality} ${_quality}`;
                        changes = true;
                    }
                }
            }
        }
    }
    let unusual = quality.includes("Unusual");

    let wear;
    for (let i = 0; i < itemData.wear.length; i++) {
        if (name.includes(itemData.wear[i])) {
            wep = true;
            wear = itemData.wear[i];
        }
    }

    let australium = (name.includes("Australium") && !name.includes("Australium Gold"));

    let killstreaker = "";
    let sheen = "";
    let parts = [];
    let spells = [];
    let paint = "";
    if (descriptions.descriptions) {
        descriptions.descriptions.forEach(function(line) {
            let value = line.value;
            if (!isCraftable(value)) craftable = false;
            else if (value.startsWith("★ Unusual Effect: ") && unusual) {
                effect = value.substring(18);
                name = name.replace("Unusual", effect);
            }
            else if (value.startsWith("Killstreaker: ")) killstreaker = value;
            else if (value.startsWith("Sheen: ")) sheen = value;
            else if (value.startsWith("Halloween: ") && value.endsWith("(spell only active during event)")) spells.push(value.substring(11, value.indexOf(" (spell")));
            else if (value.startsWith("(") && value.endsWith(")") && value.includes(":")) parts.push(value.substring(1, value.indexOf(":")));
            else if (value.startsWith("Paint Color: ")) paint = value.substring(13);
        });
    }

    let classes = [];
    if (descriptions.tags) {
        descriptions.tags.forEach(function(tag) {
            if (tag.category === "Class") {
                classes.push(tag.internal_name);
            }
        })
    }

    if (!craftable) name = `Non-Craftable ${name}`;

    let assetid = item ? item.assetid : descriptions.assetid;

    return {
        assetid: assetid,
        imageUrl: "https://steamcommunity-a.akamaihd.net/economy/image/" + descriptions.icon_url,
        name: name,
        effect: effect,
        quality: quality,
        tradable: tradable,
        craftable: craftable,
        wep: wep,
        class: classes,
        killstreaker: killstreaker,
        sheen: sheen,
        parts: parts,
        spells: spells,
        paint: paint,
        wear: wear,
        australium: australium,
    };
}

module.exports = parseItem;
