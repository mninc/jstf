const httpRequest = require("request");
const itemData = require("./lib/itemData");
const util = require("./lib/util");

httpRequest("https://raw.githubusercontent.com/mninc/tf2-effects/master/effects.json", function(err, response, body) {
    if (err) console.error(err);
    else {
        itemData.effects = JSON.parse(body);
    }
});

class Manager {
    /**
     * @param {string} [apiKey]
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     *
     * @param {Object} requestOptions
     * @param {String} requestOptions.url
     * @param {String} requestOptions.method
     * @param {Object} requestOptions.qs
     * @param {Object} options
     * @param {boolean} [options.doNotParse]
     */
    request(requestOptions, options) {
        return new Promise((resolve, reject) => {
            httpRequest(requestOptions, (err, response, body) => {
                if (err) reject(err);
                else if (options.doNotParse || typeof body === "object") resolve(body);
                else resolve(JSON.parse(body));
            })
        })
    }

    /**
     *
     * @param {string} token
     */
    setUserToken(token) {
        this.userToken = token;
    }

    bpGetUserToken() {
        return new Promise((resolve, reject) => {
            if (!this.apiKey) reject(Error("this.apiKey not set"));
            this.request({
                    url: "https://backpack.tf/api/aux/token/v1",
                    method: "GET",
                    qs: {
                        key: this.apiKey
                    }
                },
                {}
            )
                .then(body => {
                    if (body.message) reject(Error(body.message));
                    else {
                        this.setUserToken(body.token);
                        resolve(body.token);
                    }
                })
                .catch(err => reject(err))
        });
    }

    /**
     *
     * @param {array} listings
     * @param {boolean} [parse]
     */
    bpCreateListings(listings, parse = true) {
        return new Promise((resolve, reject) => {
            if (!this.userToken) reject(Error("user token not set. check the README"));
            this.request({
                    url: "https://backpack.tf/api/classifieds/list/v1",
                    method: "POST",
                    json: {
                        token: this.userToken,
                        listings: listings
                    }
                },
                {}
            )
                .then(body => {
                    if (!parse) resolve(body);
                    else {
                        let response = {
                            successful: [],
                            unsuccsessful: {}
                        };

                        if (!body.listings) return resolve(response);
                        for (let item in body.listings) {
                            if (body.listings.hasOwnProperty(item)) {
                                let success = body.listings[item];
                                if (success.created) response.successful.push(item);
                                else response.unsuccsessful[item] = success.error;
                            }
                        }
                        resolve(response);
                    }
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /**
     *
     * @param {Object} listing
     * @param {boolean} [parse]
     */
    bpCreateListing(listing, parse = true) {
        return this.bpCreateListings([listing], parse);
    }

    /**
     *
     * @param {String} name
     */
    nameToItem(name) {
        let craftable;
        if (name.startsWith("Non-Craftable ")) {
            name = name.substring(14);
            craftable = 0;
        } else craftable = 1;

        let quality = "Unique";
        if (
            !name.startsWith("Haunted Phantasm") && name !== "Strange Bacon Grease" && !name.startsWith("Strange Filter") &&
            !name.startsWith("Strange Count") && !name.startsWith("Strange Cosmetic") && name !== "Vintage Tyrolean" &&
            name !== "Vintage Merryweather" && name !== "Haunted Hat" && name !== "Haunted Metal Scrap" &&
            !name.startsWith("Haunted Ghosts")
        ) {
            for (let _quality in itemData.qualities) {
                if (itemData.qualities.hasOwnProperty(_quality)) {
                    if (name.startsWith(_quality + " ")) {
                        quality = _quality;
                        name = name.substring(quality.length + 1);
                    }
                }
            }
        }

        let priceindex = 0;
        if (!name.includes("Hot Heels") && !name.includes("Hot Case") && !name.includes("Hot Hand")) {
            for (let _effect in itemData.effects) {
                if (itemData.effects.hasOwnProperty(_effect)) {
                    if (name.startsWith(_effect) && (_effect !== "Hot" || !(name.includes("Hottie's Hoodie") || name.includes("Hotrod") || name.includes("Hot Dogger")))) {
                        name = name.substr(_effect.length + 1);
                        priceindex = itemData.effects[_effect];
                        if (quality === "Strange") quality = "Strange Unusual";
                        else quality = "Unusual";
                    }
                }
            }
        }

        return {
            quality: quality,
            item_name: name,
            craftable: craftable,
            priceindex: priceindex
        };

    }

    /**
     *
     * @param {Number} intent
     * @param {Object} currencies
     * @param {Number} [currencies.keys]
     * @param {Number} [currencies.metal]
     * @param {String | Object} item
     * @param {Object} options
     * @param {Number} [options.offers]
     * @param {Number} [options.buyout]
     * @param {Number} [options.promoted]
     * @param {String} [options.details]
     */
    bpCreateListingData(intent, currencies, item, options) {
        options = util.setDefaults(options, {
            offers: 1,
            buyout: 1,
            promoted: 0,
            details: "",
            intent: intent,
            currencies: currencies
        });

        if (intent) options.id = item;
        else {
            if (typeof item === "string") options.item = this.nameToItem(item);
            else options.item = item;
        }

        return options;
    }
}
exports.Manager = Manager;
