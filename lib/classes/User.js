function parseIntegrations(data) {
    return {
        groupMember: data.hasOwnProperty("group_member"),
        marketplaceSeller: data.hasOwnProperty("marketplace_seller"),
        automatic: data.hasOwnProperty("automatic"),
        steamrepAdmin: data.hasOwnProperty("steamrep_admin")
    }
}

function parseValveBans(data) {
    return {
        economy: data.hasOwnProperty("economy"),
        community: data.hasOwnProperty("community"),
        vac: data.hasOwnProperty("vac"),
        game: data.hasOwnProperty("game")
    }
}

function parseBackpackBan(data) {
    return {
        end: data.end,
        reason: data.reason ? data.reason : ""
    }
}

function parseBans(data) {
    let bans = {
        steamrep: {
            scammer: data.hasOwnProperty("steamrep_scammer"),
            caution: data.hasOwnProperty("steamrep_caution"),
        },
        valve: parseValveBans(data.valve ? data.valve : {}),
        backpack: {}
    };
    ["all", "suggestions", "comments", "trust", "issues", "classifieds", "customizations", "reports"].forEach(function(banType) {
        if (data.hasOwnProperty(banType)) bans.backpack[banType] = parseBackpackBan(data[banType]);
    });
    return bans;
}

function parseVotes(data) {
    return {
        positive: data.positive ? data.positive : 0,
        negative: data.negative ? data.negative : 0,
        accepted: data.accepted ? data.accepted : 0
    }
}

function parseSuggestions(data) {
    return {
        created: data.created ? data.created : 0,
        accepted: data.accepted ? data.accepted : 0,
        acceptedUnusual: data.accepted_unusual ? data.accepted_unusual : 0
    }
}

function parseVoting(data) {
    return {
        reputation: data.reputation ? data.reputation : 0,
        votes: parseVotes(data.votes ? data.votes : {}),
        suggestions: parseSuggestions(data.suggestions ? data.suggestions : {})
    }
}

function parseInventory(data) {
    return {
        ranking: data.ranking ? data.ranking : -1,
        value: data.value ? data.value : 0,
        updated: data.updated ? data.updated : -1,
        metal: data.metal ? data.metal : 0,
        keys: data.keys ? data.keys : 0,
        slots: data.slots ? data.slots : {}
    }
}

function parseInventories(data) {
    let res = {};
    for (let appid in data) {
        if (data.hasOwnProperty(appid)) {
            res[appid] = parseInventory(data[appid]);
        }
    }
    return res;
}

function parseTrust(data) {
    return {
        positive: data.positive ? data.positive : 0,
        negative: data.negative ? data.negative : 0
    }
}

class User {
    constructor(data) {
        this.name = data.name;
        this.avatar = data.avatar;
        this.lastOnline = data.last_online ? data.last_online : 0;
        this.admin = data.hasOwnProperty("admin");
        this.donated = data.donated ? data.donated : 0;
        this.premium = data.hasOwnProperty("premium");
        this.premiumMonthsGifted = data.premium_months_gifted ? data.premium_months_gifted : 0;
        this.integrations = parseIntegrations(data.integrations ? data.integrations : {});
        this.bans = parseBans(data.bans ? data.bans : {});
        this.voting = parseVoting(data.voting ? data.voting : {});
        this.inventory = parseInventories(data.inventory ? data.inventory : {});
        this.trust = parseTrust(data.trust ? data.trust : {});
    }

    get listingSlots() {
        return this.calculateListingSlots();
    }

    calculateListingSlots(twitterSlots) {
        /*
        this calculator is not completely correct - we can't see if you're following the site on twitter from the user info api.
        for premium users this doesn't matter, for non-premium users you can set `twitterSlots` to true so the slots will be added
         */
        let slots = 70;
        if (this.integrations.groupMember || this.premium) slots += 15;
        if (this.premium || twitterSlots) slots += 15; // twitter
        slots += Math.floor(this.donated / 0.2);
        if (this.donated >= 35) slots += 25;
        slots += this.premiumMonthsGifted * 2;
        if (this.voting && this.voting.suggestions && this.voting.suggestions.accepted) {
            slots += Math.floor(this.voting.suggestions.acceptedUnusual / 5);
            slots += Math.floor((this.voting.suggestions.accepted - this.voting.suggestions.acceptedUnusual) / 10);
        }
        if (this.premium) slots *= 2;
        return slots;
    }
}

module.exports = User;
