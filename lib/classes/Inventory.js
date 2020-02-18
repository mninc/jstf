const parseItem = require("../parseItem");

class Inventory {
    constructor(data) {
        this.total_inventory_count = data.total_inventory_count;
        this.success = data.success;
        this.rwgrsn = data.rwgrsn;
        this.data = data;
        this.items = [];

        data.assets.forEach(item => {
            data.descriptions.forEach(info => {
                if (info.classid === item.classid && item.instanceid === info.instanceid) this.items.push(parseItem(info, item));
            });
        });
    }

    getItems(name) {
        let items = [];
        this.items.forEach(function(item) {
            if (item.name === name) items.push(item);
        });
        return items;
    }

    getStock(name) {
        return this.getItems(name).length;
    };
}

module.exports = Inventory;
