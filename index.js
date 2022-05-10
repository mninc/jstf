const cheerio = require("cheerio");

const itemData = require("./lib/itemData");
const util = require("./lib/util");
const parseItem = require("./lib/parseItem");
const Inventory = require("./lib/classes/Inventory");
const User = require("./lib/classes/User");

class Manager {
    /**
     * @param {Object} [options]
     * @param {String} [options.apiKey]
     * @param {function} [options.request]
     */
    constructor(options) {
        if (typeof options === "string") options = { apiKey: options };
        this.apiKey = options.apiKey;
        this.request = options.request || require('request');

        this.request("https://raw.githubusercontent.com/mninc/tf2-effects/master/effects.json", function(err, response, body) {
            if (err) console.error(err);
            else {
                itemData.effects = JSON.parse(body);
            }
        });
    }

    /**
     *
     * @param {Object} requestOptions
     * @param {Object} [options]
     * @param {boolean} [options.doNotParse]
     */
    query(requestOptions, options) {
        if (!options) options = {};
        return new Promise((resolve, reject) => {
            this.request(requestOptions, (err, response, body) => {
                if (err) reject(err);
                else if (options.doNotParse || typeof body === "object") resolve(body);
                else {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        reject(body);
                    }
                }
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
            if (!this.apiKey) return reject(Error("this.apiKey not set"));
            this.query({
                    url: "https://api.backpack.tf/api/aux/token/v1",
                    method: "GET",
                    qs: {
                        key: this.apiKey
                    }
                }
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
            if (!this.userToken) return reject(Error("user token not set. check the README"));
            this.query({
                    url: "https://api.backpack.tf/api/classifieds/list/v1",
                    method: "POST",
                    json: {
                        token: this.userToken,
                        listings: listings
                    }
                }
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
                .catch(err => reject(err));
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
                        break;
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
     * @param {Object} [options]
     * @param {Number} [options.offers]
     * @param {Number} [options.buyout]
     * @param {Number} [options.promoted]
     * @param {String} [options.details]
     */
    bpCreateListingData(intent, currencies, item, options) {
        if (!options) options = {};
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

    /**
     *
     * @param {object} [options]
     * @param {boolean} [options.itemNames]
     * @param {Number | undefined} [options.intent]
     * @param {Number} [options.inactive]
     * @param {boolean} [options.parse]
     */
    bpGetMyListings(options) {
        return new Promise((resolve, reject) => {
            if (!options) options = {};
            options = util.setDefaults(options, {
                itemNames: true,
                parse: true,
                inactive: 1,
            });

            let data = {
                token: this.userToken,
                inactive: options.inactive,
                item_names: options.itemNames,
                intent: options.intent,
            };

            this.query(
                {
                    url: "https://api.backpack.tf/api/classifieds/listings/v1",
                    method: "GET",
                    json: data,
                }
            )
                .then(data => {
                    resolve(data);
                })
                .catch(err => reject(err))
        });
    }

    /**
     *
     * @param {Array} listingIds
     */
    bpDeleteListings(listingIds) {
        return new Promise((resolve, reject) => {
            this.query(
                {
                    url: "https://api.backpack.tf/api/classifieds/delete/v1",
                    method: "DELETE",
                    json: {
                        token: this.userToken,
                        listing_ids: listingIds
                    }
                }
            )
                .then(data =>  resolve(data))
                .catch(err => reject(err));
        });
    }

    /**
     *
     * @param {String} listingId
     */
    bpDeleteListing(listingId) {
        return this.bpDeleteListings([listingId]);
    }

    /**
     *
     * @param {Boolean} [archive]
     * @param {String} [intent]
     */
    async bpDeleteAllListings(archive, intent) {
        archive = !!archive;
        if (!["sell", "buy"].includes(intent)) intent = null;

        const json = {
            token: this.userToken,
        };
        if (intent) json.intent = intent;
        return this.query(
            {
                url: `https://api.backpack.tf/api/v2/classifieds/${archive ? "archive" : "listings"}`,
                method: "DELETE",
                json,
            }
        )
    }

    /**
     *
     * @param {String} [automatic]
     */
    bpHeartbeat(automatic="all") {
        return new Promise((resolve, reject) => {
            this.query(
                {
                    url: "https://api.backpack.tf/api/aux/heartbeat/v1",
                    method: "POST",
                    json: {
                        token: this.userToken,
                        automatic: automatic
                    }
                }
            )
                .then(data => {
                    if (data.hasOwnProperty("message")) return reject(data.message);
                    resolve(data.bumped);
                })
                .catch(err => reject(err))
        })
    }

    /**
     *
     * @param {Object} options
     * @param {String} options.steamid
     * @param {Number} [options.game]
     * @param {Number} [options.context]
     * @param {String} [options.language]
     * @param {Number} [options.count]
     * @param {String} [options.start_assetid]
     */
    steamLoadInventory(options) {
        options = util.setDefaults(options, {
            game: 440,
            context: 2,
            language: "english",
            count: 5000,
        });

        return new Promise((resolve, reject) => {
            let url = `http://steamcommunity.com/inventory/${options.steamid}/${options.game}/${options.context}?l=${options.language}&count=${options.count}`;
            if (options.start_assetid) url += `&start_assetid=${options.start_assetid}`;

            this.query(
                {
                    url: url,
                    method: "GET"
                }
            )
                .then(data => {
                    resolve(new Inventory(data));
                })
                .catch(err => reject(err))
        })
    }

    /**
     *
     * @param {String} id
     */
    checkDupe(id) {
        return new Promise((resolve, reject) => {
            this.query({
                url: `https://old.backpack.tf/item/${id}`,
                method: "GET"
            }, {
                doNotParse: true
            })
                .then(data => {
                    let $ = cheerio.load(data);
                    if (!$('.item').length) return reject(Error("backpack.tf: Could not find any information for this item."));
                    resolve($('#dupe-modal-btn').length); // check if dupe tag exists
                })
                .catch(err => reject(err))
        })
    }

    /**
     *
     * @param {String|String[]} steamids
     */
    bpGetUserInfo(steamids) {
        return new Promise((resolve, reject) => {
            this.query({
                url: "https://api.backpack.tf/api/users/info/v1",
                method: "GET",
                qs: {
                    key: this.apiKey,
                    steamids: Array.isArray(steamids) ? steamids.join(',') : steamids
                }
            })
                .then(data => {
                    if (Array.isArray(steamids)) {
                        Object.keys(data.users).forEach(steamid => {
                            data.users[steamid] = new User(data.users[steamid]);
                        });
                        resolve(data.users);
                    } else {
                        resolve(new User(data.users[steamids]));
                    }
                })
                .catch(err => reject(err))
        })
    }

    /**
     *
     * @param {Number} raw
     * @param {Number} since
     */
    bpGetPrices(raw = 1, since = 0) {
        return new Promise((resolve, reject) => {
            this.query({
                url: "https://api.backpack.tf/api/IGetPrices/v4",
                method: "GET",
                qs: {
                    key: this.apiKey,
                    raw: raw,
                    since: since
                }
            })
                .then(data => {
                    resolve(data);
                })
                .catch(err => reject(err))
        })
    }

    async bpGetAlerts(skip = 0, limit = 0) {
        if (!this.userToken) throw new Error("user token not set. check the README");
        if (limit) {
            return await this.query({
                url: "https://api.backpack.tf/api/classifieds/alerts",
                method: "GET",
                qs: {
                    token: this.userToken,
                    skip,
                    limit
                }
            });
        } else {
            const defaultLimit = 500;
            let data = await this.bpGetAlerts(0, defaultLimit);
            let total = data.cursor.total;
            let skip = defaultLimit;
            while (skip < total) {
                let newData = await this.bpGetAlerts(skip, defaultLimit);
                skip += defaultLimit;
                total = newData.cursor.total;
                data.results = data.results.concat(newData.results);
            }
            return data;
        }
    }

    async bpDeleteAlert(item_name, intent) {
        if (typeof intent === "number") {
            intent = intent === 0 ? "buy" : "sell";
        }
        return await this.query({
            url: "https://api.backpack.tf/api/classifieds/alerts",
            method: "DELETE",
            json: {
                token: this.userToken,
                item_name,
                intent
            }
        }, {
            doNotParse: true
        });
    }

    /**
     *
     * @param {Object} options
     * @param {String} options.item_name
     * @param {Number | String} options.intent
     * @param {String} [options.currency]
     * @param {Number} [options.min]
     * @param {Number} [options.max]
     * @param {Number} [options.blanket]
     */
    async bpCreateAlert(options) {
        if (typeof options.intent === "number") {
            options.intent = options.intent === 0 ? "buy" : "sell";
        }
        options.token = this.userToken;
        return await this.query({
            url: "https://api.backpack.tf/api/classifieds/alerts",
            method: "POST",
            json: options
        })
    }

    async bpGetUnreadNotifications() {
        return await this.query({
            url: "https://api.backpack.tf/api/notifications/unread",
            method: "POST",
            json: {
                token: this.userToken
            }
        })
    }
}

module.exports = {
    Manager,
    parseItem,
    itemData,
};
