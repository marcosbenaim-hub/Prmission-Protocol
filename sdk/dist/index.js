"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADDRESSES = exports.CampaignStatus = exports.PrmissionCampaigns = exports.PrmissionRegistry = void 0;
// Creator Economy
var registry_1 = require("./creator/registry");
Object.defineProperty(exports, "PrmissionRegistry", { enumerable: true, get: function () { return registry_1.PrmissionRegistry; } });
var campaign_1 = require("./creator/campaign");
Object.defineProperty(exports, "PrmissionCampaigns", { enumerable: true, get: function () { return campaign_1.PrmissionCampaigns; } });
Object.defineProperty(exports, "CampaignStatus", { enumerable: true, get: function () { return campaign_1.CampaignStatus; } });
// Constants
exports.ADDRESSES = {
    BASE_MAINNET: {
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
};
//# sourceMappingURL=index.js.map