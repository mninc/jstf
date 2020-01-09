const httpRequest = require("request");

class Manager {
    /**
     * @param {string} apiKey
     * @param {function} callback
     */
    constructor(apiKey, callback) {
        this.apiKey = apiKey;
        this.bpGetUserToken((err, token) => {
            if (err) callback(err);
            else {
                this.userToken = token;
                callback();
            }
        })
    }

    /**
     *
     * @param {Object} requestOptions
     * @param {String} requestOptions.url
     * @param {String} requestOptions.method
     * @param {Object} requestOptions.qs
     * @param {Object} options
     * @param {boolean} [options.doNotParse]
     * @param {function} callback
     */
    request(requestOptions, options, callback) {
        httpRequest(requestOptions, (err, response, body) => {
            if (err) callback(err);
            else if (options.doNotParse) callback(err, body);
            else callback(err, JSON.parse(body));
        })
    }

    /**
     * @param {function} callback
     */
    bpGetUserToken(callback) {
        if (!this.apiKey) callback("this.apiKey not set");
        this.request(
            {
                url: "https://backpack.tf/api/aux/token/v1",
                method: "GET",
                qs: {
                    key: this.apiKey
                }
            },
            {},
            (err, body) => {
                if (err) callback(err);
                else if (body.message) callback(body.message);
                else callback(err, body.token);
            }
        )
    }

    /**
     *
     * @param {array} listings
     * @param {boolean} parse
     * @param {function} callback
     */
    bpCreateListings(listings, parse, callback) {
        this.request(
            {
                url: "https://backpack.tf/api/classifieds/list/v1",
                method: "POST",
                json: {
                    token: this.userToken,
                    listings: listings
                }
            },
            {},
            (err, body) => {
                if (err) callback(err);
                else if (!parse) callback(err, body);
                else {
                    let response = {
                        successful: [],
                        unsuccsessful: {}
                    };

                    if (!body.listings) return callback(err, response);
                    for (let item in body.listings) {
                        if (body.listings.hasOwnProperty(item)) {
                            let success = body.listings[item];
                            if (success.created) response.successful.push(item);
                            else response.unsuccsessful[item] = success.error;
                        }
                    }
                    callback(err, response);
                }
            }
        )
    }

    /**
     *
     * @param {array} listing
     * @param args
     */
    bpCreateListing(listing, ...args) {
        this.bpCreateListings([listing], ...args);
    }
}
exports.Manager = Manager;
