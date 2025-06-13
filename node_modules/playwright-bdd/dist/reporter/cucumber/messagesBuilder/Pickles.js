"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pickles = void 0;
const utils_1 = require("../../../utils");
const Projects_1 = require("./Projects");
class Pickles {
    buildMessages(testCases) {
        const messages = [];
        testCases.forEach((testCase) => {
            messages.push(this.buildPickleMessage(testCase));
        });
        return messages;
    }
    buildPickleMessage(testCase) {
        const pickle = {
            ...(0, utils_1.omit)(testCase.pickle, 'location'),
            uri: (0, Projects_1.getFeatureUriWithProject)(testCase.projectInfo, testCase.pickle.uri),
        };
        return { pickle };
    }
}
exports.Pickles = Pickles;
//# sourceMappingURL=Pickles.js.map